// ═══════════════════════════════════════════════════════
//  Auth Service — 注册/登录/JWT签发
// ═══════════════════════════════════════════════════════
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getSupabase } from '../db/client.js'
import { env } from '../config/env.js'
import type { AuthUser, AuthTokens, UserProfile, Subscription } from '../types/index.js'

// ── JWT ────────────────────────────────────────────

function signTokens(payload: Omit<AuthUser, 'plan'> & { plan: string }): AuthTokens {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)

  const refreshToken = jwt.sign(
    { userId: payload.id, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '30d' } as jwt.SignOptions
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
  const supabase = getSupabase()

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
  const supabase = getSupabase()

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
  const supabase = getSupabase()

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
  const payload = jwt.verify(refreshToken, env.JWT_SECRET) as any

  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token')
  }

  const supabase = getSupabase()

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
