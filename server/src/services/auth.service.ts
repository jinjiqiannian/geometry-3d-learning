// ═══════════════════════════════════════════════════════
//  Auth Service — 注册/登录/JWT签发
// ═══════════════════════════════════════════════════════
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { supabase, supabaseAdmin } from '../lib/supabase.js'
import { env } from '../config/env.js'
import type { AuthUser, AuthTokens, UserProfile, Subscription } from '../types/index.js'

// ── Refresh Token 黑名单（内存 + DB 双重检查） ────
// 内存 Set 提供快速检查，DB 表提供重启持久化
const usedRefreshTokens = new Set<string>()

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// 启动时从 DB 加载最近的黑名单（仅清理过期，不阻塞启动）
async function loadRevokedTokens(): Promise<void> {
  try {
    supabase
    const { data } = await supabase
      .from('revoked_tokens')
      .select('token_hash')
      .gte('expires_at', new Date().toISOString())
    if (data) {
      for (const row of data) {
        usedRefreshTokens.add(row.token_hash)
      }
      console.log(`  🔐 Loaded ${data.length} revoked tokens from DB`)
    }
  } catch (err) {
    console.warn('  ⚠️ Failed to load revoked tokens from DB:', (err as Error).message)
  }
}
// 异步加载，不阻塞启动
loadRevokedTokens()

// 每小时清理过期记录
setInterval(async () => {
  try {
    supabase
    await supabase
      .from('revoked_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
  } catch { /* silent */ }
}, 60 * 60 * 1000)

// ── JWT ────────────────────────────────────────────

function signTokens(payload: Omit<AuthUser, 'plan'> & { plan: string }): AuthTokens {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)

  const refreshToken = jwt.sign(
    { userId: payload.id, jti: uuidv4(), type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '7d' } as jwt.SignOptions  // 从30d缩短为7d
  )

  return { token, refreshToken }
}

export function verifyToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET) as any
  return {
    id: payload.userId || payload.id,
    email: payload.email,
    full_name: payload.full_name || null,
    role: payload.role || 'student',
    plan: payload.plan || 'free',
  }
}

// ── User CRUD ──────────────────────────────────────

export async function registerUser(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  supabaseAdmin

  // 1) Check if user exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    throw new Error('该邮箱已注册')
  }

  // 2) Create user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification in dev
    user_metadata: { full_name: fullName || '' },
  })

  if (authError) {
    throw new Error(authError.message || '注册失败')
  }

  if (!authData.user) {
    throw new Error('注册失败：未返回用户数据')
  }

  const userId = authData.user.id

  // 3) Create profile (trigger should handle this, but ensure it)
  await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName || '',
    role: 'student',
  })

  // 4) Create free subscription (trigger should handle this, but ensure it)
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan: 'free',
    status: 'active',
  })

  const tokens = signTokens({ id: userId, email, full_name: fullName || null, role: 'student', plan: 'free' })

  return {
    user: { id: userId, email, full_name: fullName || null, role: 'student', plan: 'free' },
    tokens,
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  supabase

  // 1) Authenticate via Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    throw new Error('邮箱或密码错误')
  }

  const user = authData.user

  // 2) Get profile and subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const plan = sub?.plan || 'free'
  const role = profile?.role || 'student'

  const tokens = signTokens({
    id: user.id,
    email: user.email || email,
    full_name: profile?.full_name || null,
    role,
    plan,
  })

  return {
    user: {
      id: user.id,
      email: user.email || email,
      full_name: profile?.full_name || null,
      role,
      plan,
    },
    tokens,
  }
}

export async function getUserProfile(userId: string): Promise<{
  profile: UserProfile | null
  subscription: Subscription | null
}> {
  supabase

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  return {
    profile: profile as UserProfile | null,
    subscription: subscription as Subscription | null,
  }
}

export async function refreshUserToken(refreshToken: string): Promise<AuthTokens> {
  // 计算 token hash（DB 中不存明文）
  const tokenHash = hashToken(refreshToken)

  // 检查内存黑名单（快速路径）
  if (usedRefreshTokens.has(refreshToken) || usedRefreshTokens.has(tokenHash)) {
    const payload = jwt.decode(refreshToken) as any
    if (payload?.userId) {
      console.warn(`Refresh token reuse detected for user: ${payload.userId}`)
    }
    throw new Error('Refresh token已失效，请重新登录')
  }

  // 检查 DB 黑名单（持久化路径，重启后保护）
  try {
    supabase
    const { data: revoked } = await supabase
      .from('revoked_tokens')
      .select('id')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    if (revoked) {
      usedRefreshTokens.add(tokenHash) // 同步到内存加速后续检查
      const payload = jwt.decode(refreshToken) as any
      if (payload?.userId) {
        console.warn(`Refresh token reuse detected (DB) for user: ${payload.userId}`)
      }
      throw new Error('Refresh token已失效，请重新登录')
    }
  } catch (err: any) {
    if (err.message?.includes('已失效')) throw err
    // DB 查询失败时降级到内存检查（不阻塞登录）
    console.warn('Revoked token DB check failed, falling back to memory:', err.message)
  }

  const payload = jwt.verify(refreshToken, env.JWT_SECRET) as any

  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token')
  }

  // 标记当前 refresh token 为已使用（内存 + DB）
  usedRefreshTokens.add(tokenHash)

  // 异步写入 DB（不阻塞响应）
  try {
    supabase
    await supabase.from('revoked_tokens').insert({
      token_hash: tokenHash,
      user_id: payload.userId,
      expires_at: new Date(payload.exp * 1000).toISOString(),
    })
  } catch (err) {
    console.warn('Failed to persist revoked token to DB:', (err as Error).message)
  }

  // 限制黑名单大小
  if (usedRefreshTokens.size > 50000) {
    const firstItem = usedRefreshTokens.values().next().value
    if (firstItem) usedRefreshTokens.delete(firstItem)
  }

  supabase

  // Get current plan
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', payload.userId)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', payload.userId)
    .single()

  return signTokens({
    id: payload.userId,
    email: payload.email || '',
    full_name: profile?.full_name || null,
    role: profile?.role || 'student',
    plan: sub?.plan || 'free',
  })
}
