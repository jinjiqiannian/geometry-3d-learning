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

const ocrSchema = z.object({
  imageBase64: z.string().min(32, '请上传有效图片'),
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

const explainSchema = z.object({
  problemText: z.string().min(3, '题目至少3个字符'),
  topic: z.enum(['combo', 'derivative', 'conic', 'physics']),
})

// ═══════════════════════════════════════════════════════
//  POST /api/ai/ocr — 拍照识题（可选登录）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/ocr',
  optionalAuth,
  dailyLimit('generate'),
  async (req: Request, res: Response) => {
    try {
      const body = ocrSchema.parse(req.body)
      const result = await aiService.extractProblemFromImage(
        body.imageBase64,
        req.userId
      )
      if (req.userId) {
        await recordUsage(req.userId, 'generate', result.text.slice(0, 80))
      }
      res.json({
        success: true,
        data: {
          text: result.text,
          visionHints: result.visionHints || null,
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
//  POST /api/ai/reason — 解题推理（所有用户，与 solve 相同限制）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/reason',
  optionalAuth,
  dailyLimit('generate'),
  async (req: Request, res: Response) => {
    try {
      const body = reasonSchema.parse(req.body)
      const steps = await aiService.generateReasoning(
        body.problemText,
        body.parsedData as any,
        req.userId
      )

      if (req.userId) {
        await recordUsage(req.userId, 'ai_explain', body.problemText)
      }

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
          finalAnswer: solution.finalAnswer,
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
//  POST /api/ai/solve-stream — 流式一站式解题 ★流式主入口
//  使用 SSE 逐字输出推理过程，最后输出完整步骤
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/solve-stream',
  optionalAuth,
  dailyLimit('generate'),
  async (req: Request, res: Response) => {
    try {
      const body = parseSchema.parse(req.body)
      const plan = req.userPlan || 'pro'

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders()

      // Handle client disconnect
      let aborted = false
      req.on('close', () => { aborted = true })

      for await (const event of aiService.solveCompleteStream(body.problemText, plan, req.userId)) {
        if (aborted) break

        if (event.type === 'parsed') {
          res.write(`event: parsed\ndata: ${JSON.stringify(event.data)}\n\n`)
        } else if (event.type === 'reasoning') {
          res.write(`event: reasoning\ndata: ${JSON.stringify(event.data)}\n\n`)
        } else if (event.type === 'done') {
          if (req.userId) {
            await recordUsage(req.userId, 'generate', body.problemText).catch(() => {})
          }
          res.write(`event: done\ndata: ${JSON.stringify(event.data)}\n\n`)
          res.write(`event: __close\ndata: done\n\n`)
          res.end()
          return
        } else if (event.type === 'error') {
          res.write(`event: error\ndata: ${JSON.stringify(event.data)}\n\n`)
          res.write(`event: __close\ndata: error\n\n`)
          res.end()
          return
        }
      }

      if (!aborted && !res.writableEnded) {
        res.write(`event: __close\ndata: done\n\n`)
        res.end()
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message })
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
        res.write(`event: __close\ndata: error\n\n`)
        res.end()
      }
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

// ═══════════════════════════════════════════════════════
//  POST /api/ai/explain — 排组/导数/圆锥 ExplainIR（可选登录）
// ═══════════════════════════════════════════════════════
aiRouter.post(
  '/explain',
  optionalAuth,
  dailyLimit('generate'),
  async (req: Request, res: Response) => {
    try {
      const body = explainSchema.parse(req.body)
      const ir = await aiService.generateExplainIR(
        body.problemText,
        body.topic,
        req.userId
      )
      if (req.userId) {
        await recordUsage(req.userId, 'generate', body.problemText)
      }
      res.json({ success: true, data: ir })
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      res.status(500).json({ success: false, error: err.message })
    }
  }
)
