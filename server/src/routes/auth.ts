// ═══════════════════════════════════════════════════════
//  Auth Routes — POST /api/auth/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import * as authService from '../services/auth.service.js'

export const authRouter = Router()

// ── Validation schemas ─────────────────────────────
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})

// ── POST /api/auth/register ────────────────────────
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body)
    const result = await authService.registerUser(body.email, body.password, body.name)
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.tokens.token,
        refreshToken: result.tokens.refreshToken,
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message || '参数错误' })
    }
    const status = err.message === '该邮箱已注册' ? 409 : 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// ── POST /api/auth/login ───────────────────────────
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body)
    const result = await authService.loginUser(body.email, body.password)
    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.tokens.token,
        refreshToken: result.tokens.refreshToken,
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message || '参数错误' })
    }
    res.status(401).json({ success: false, error: err.message })
  }
})

// ── GET /api/auth/me ───────────────────────────────
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { profile, subscription } = await authService.getUserProfile(req.userId!)
    res.json({
      success: true,
      data: {
        id: req.userId,
        email: profile?.email || '',
        full_name: profile?.full_name || null,
        role: profile?.role || 'student',
        plan: subscription?.plan || 'free',
        subscription,
        profile,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/auth/refresh ─────────────────────────
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refreshToken is required' })
    }
    const tokens = await authService.refreshUserToken(refreshToken)
    res.json({ success: true, data: tokens })
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message })
  }
})
