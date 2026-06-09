// ═══════════════════════════════════════════════════════
//  AI Routes — POST /api/ai/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { requirePlan } from '../middleware/requirePlan.js'
import { dailyLimit, recordUsage } from '../middleware/rateLimit.js'
import * as aiService from '../services/ai.service.js'

export const aiRouter = Router()

// ── Validation ─────────────────────────────────────
const parseSchema = z.object({
  problemText: z.string().min(3, '题目至少3个字符'),
  imageBase64: z.string().optional(),
})

const reasonSchema = z.object({
  problemText: z.string().min(3),
  parsedData: z.object({
    type: z.string(),
    size: z.number().optional(),
    labels: z.array(z.string()).optional(),
    highlightLines: z.array(z.any()).optional(),
    extraParams: z.record(z.number()).optional(),
  }),
})

const visualizeSchema = z.object({
  parsedData: z.object({
    type: z.string(),
    size: z.number().optional(),
    labels: z.array(z.string()).optional(),
    highlightLines: z.array(z.any()).optional(),
  }),
  steps: z.array(z.object({
    step: z.number(),
    title: z.string(),
    content: z.string(),
    type: z.string(),
  })),
})

const narrateSchema = z.object({
  workspaceId: z.string().uuid('无效的workspace ID'),
})

// ═══════════════════════════════════════════════════════
//  POST /api/ai/parse — 题目解析（所有人）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/parse',
  optionalAuth,
  dailyLimit('generate'),
  async (req: Request, res: Response) => {
    try {
      const body = parseSchema.parse(req.body)
      const parsed = await aiService.parseProblem(body.problemText, req.userId)

      if (req.userId) {
        await recordUsage(req.userId, 'generate', body.problemText)
      }

      res.json({ success: true, data: parsed })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════
//  POST /api/ai/reason — 解题推理（Pro+）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/reason',
  requireAuth,
  requirePlan('pro'),
  async (req: Request, res: Response) => {
    try {
      const body = reasonSchema.parse(req.body)
      const steps = await aiService.generateReasoning(
        body.problemText,
        body.parsedData as any,
        req.userId
      )

      await recordUsage(req.userId!, 'ai_explain', body.problemText)

      res.json({ success: true, data: steps })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════
//  POST /api/ai/visualize — 3D可视化状态（所有人）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/visualize',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const body = visualizeSchema.parse(req.body)
      const states = await aiService.generateVisualStates(
        body.parsedData as any,
        body.steps as any,
        req.userId
      )

      res.json({ success: true, data: states })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════
//  POST /api/ai/solve — 一站式解决 ★主入口
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/solve',
  optionalAuth,
  dailyLimit('generate'),
  async (req: Request, res: Response) => {
    try {
      const body = parseSchema.parse(req.body)
      const plan = req.userPlan || 'pro'     // 临时：未登录用户也走 AI

      const solution = await aiService.solveComplete(body.problemText, plan, req.userId)

      if (req.userId) {
        await recordUsage(req.userId, 'generate', body.problemText)
      }

      res.json({
        success: true,
        data: {
          parsed: solution.parsed,
          steps: solution.steps,
          visualStates: solution.visualStates,
        },
      })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════
//  POST /api/ai/narrate — 教师讲稿（Teacher only）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/narrate',
  requireAuth,
  requirePlan('teacher'),
  async (req: Request, res: Response) => {
    try {
      const body = narrateSchema.parse(req.body)

      // Load workspace to get steps
      const { getSupabase } = await import('../db/client.js')
      const supabase = getSupabase()
      const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', body.workspaceId)
        .single()

      if (error || !workspace) {
        return res.status(404).json({ success: false, error: 'Workspace not found' })
      }

      const steps = workspace.steps || []
      if (steps.length === 0) {
        return res.status(400).json({ success: false, error: 'Workspace has no steps' })
      }

      const narration = await aiService.generateNarration(
        workspace.problem_text,
        steps,
        req.userId
      )

      res.json({ success: true, data: narration })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      res.status(500).json({ success: false, error: err.message })
    }
  }
)
