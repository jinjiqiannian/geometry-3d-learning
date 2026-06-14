// ═══════════════════════════════════════════════════════
//  Mistake Routes — /api/mistakes/*
//  错题本 CRUD + AI 分析
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { requirePlan } from '../middleware/requirePlan.js'
import * as mistakeService from '../services/mistake.service.js'

export const mistakeRouter = Router()

// ── Validation ─────────────────────────────────────
const createSchema = z.object({
  problem_text: z.string().min(3, '题目至少3个字符').max(2000),
  wrong_answer: z.string().max(500).optional(),
  correct_answer: z.string().max(500).optional(),
  error_type: z.enum(['concept', 'calculation', 'careless', 'other']).optional(),
  geometry_type: z.string().optional(),
  knowledge_point: z.string().max(50).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  workspace_id: z.string().uuid().optional(),
})

const updateSchema = z.object({
  wrong_answer: z.string().max(500).optional(),
  correct_answer: z.string().max(500).optional(),
  error_type: z.enum(['concept', 'calculation', 'careless', 'other']).optional(),
  knowledge_point: z.string().max(50).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  resolved: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

// ═══════════════════════════════════════════════════════
//  GET /api/mistakes — 错题列表
//  ?resolved=true&error_type=concept&limit=20&offset=0
// ═══════════════════════════════════════════════════════
mistakeRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const resolved = req.query.resolved === 'true' ? true
      : req.query.resolved === 'false' ? false
      : undefined

    const result = await mistakeService.listMistakes(req.userId!, {
      resolved,
      errorType: req.query.error_type as string | undefined,
      knowledgePoint: req.query.knowledge_point as string | undefined,
      limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
      offset: parseInt(req.query.offset as string) || 0,
    })

    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/mistakes/stats — 错题统计
// ═══════════════════════════════════════════════════════
mistakeRouter.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = await mistakeService.getMistakeStats(req.userId!)
    res.json({ success: true, data: stats })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/mistakes/analyze — AI 错题分析
//  ?problem_text=xxx&wrong_answer=xxx&correct_answer=xxx
// ═══════════════════════════════════════════════════════
mistakeRouter.get('/analyze', requireAuth, requirePlan('pro'), async (req: Request, res: Response) => {
  try {
    const problemText = req.query.problem_text as string
    if (!problemText || problemText.length < 3) {
      return res.status(400).json({ success: false, error: 'problem_text 至少3个字符' })
    }

    const analysis = await mistakeService.analyzeMistake(
      problemText,
      req.query.wrong_answer as string | undefined,
      req.query.correct_answer as string | undefined
    )

    res.json({ success: true, data: analysis })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/mistakes/:id — 错题详情
// ═══════════════════════════════════════════════════════
mistakeRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const mistake = await mistakeService.getMistake(req.params.id, req.userId!)
    if (!mistake) {
      return res.status(404).json({ success: false, error: '错题不存在' })
    }
    res.json({ success: true, data: mistake })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/mistakes — 创建错题
// ═══════════════════════════════════════════════════════
mistakeRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = createSchema.parse(req.body)
    const mistake = await mistakeService.createMistake(req.userId!, body)
    res.status(201).json({ success: true, data: mistake })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  PATCH /api/mistakes/:id — 更新错题
// ═══════════════════════════════════════════════════════
mistakeRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = updateSchema.parse(req.body)
    const mistake = await mistakeService.updateMistake(req.params.id, req.userId!, body)
    res.json({ success: true, data: mistake })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  DELETE /api/mistakes/:id — 删除错题
// ═══════════════════════════════════════════════════════
mistakeRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await mistakeService.deleteMistake(req.params.id, req.userId!)
    res.json({ success: true, data: { deleted: true } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
