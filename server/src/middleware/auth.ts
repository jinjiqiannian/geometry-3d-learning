// ═══════════════════════════════════════════════════════
//  JWT 认证中间件 — 验证请求中的 Bearer Token
// ═══════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { getSupabase } from '../db/client.js'

export interface JwtPayload {
  userId: string
  email: string
  plan: string
  role: string
  iat?: number
  exp?: number
}

/**
 * 严格认证中间件 — 未认证返回 401
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = await verifyToken(req)
    req.userId = payload.userId
    req.userPlan = payload.plan as 'free' | 'pro' | 'teacher'
    req.userRole = payload.role as 'student' | 'teacher'
    next()
  } catch (err) {
    res.status(401).json({
      success: false,
      error: (err as Error).message || 'Authentication required',
    })
  }
}

/**
 * 可选认证 — 有token就解析，没有也继续
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const payload = await verifyToken(req)
    req.userId = payload.userId
    req.userPlan = payload.plan as 'free' | 'pro' | 'teacher'
    req.userRole = payload.role as 'student' | 'teacher'
  } catch {
    // No token or invalid — continue without auth
  }
  next()
}

/**
 * 验证Token（支持后端JWT和Supabase JWT）
 */
async function verifyToken(req: Request): Promise<JwtPayload> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)

  // 1) 尝试用后端JWT secret验证
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    return payload
  } catch {
    // Not a backend JWT — try Supabase JWT
  }

  // 2) 尝试用Supabase验证（使用Supabase auth.getUser）
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      throw new Error('Invalid token')
    }

    // 获取订阅信息
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', data.user.id)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return {
      userId: data.user.id,
      email: data.user.email || '',
      plan: sub?.plan || 'free',
      role: profile?.role || 'student',
    }
  } catch {
    throw new Error('Invalid or expired token')
  }
}

/**
 * 从token中解析payload（不验证过期，用于快速检查）
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    // Try backend JWT
    return jwt.decode(token) as JwtPayload
  } catch {
    return null
  }
}
