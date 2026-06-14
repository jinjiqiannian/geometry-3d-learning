// ═══════════════════════════════════════════════════════
//  Training Routes — /api/training/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import * as trainingService from '../services/training.service.js'

export const trainingRouter = Router()

const submitSchema = z.object({
  modelId: z.string().min(1),
  score: z.number().min(0).max(100),
  timeSpent: z.number().min(0),
  isCorrect: z.boolean(),
  level: z.number().min(1).max(5),
})

// ═══════════════════════════════════════════════════════
//  POST /api/training/submit — 提交训练结果
// ═══════════════════════════════════════════════════════
trainingRouter.post('/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = submitSchema.parse(req.body)
    const record = await trainingService.submitTraining(req.userId!, body.modelId, {
      score: body.score,
      timeSpent: body.timeSpent,
      isCorrect: body.isCorrect,
      level: body.level,
    })
    res.json({ success: true, data: record })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/training/progress — 训练进度
// ═══════════════════════════════════════════════════════
trainingRouter.get('/progress', requireAuth, async (req: Request, res: Response) => {
  try {
    const progress = await trainingService.getTrainingProgress(req.userId!)
    res.json({ success: true, data: progress })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/training/next — 推荐下一题
// ═══════════════════════════════════════════════════════
trainingRouter.get('/next', requireAuth, async (req: Request, res: Response) => {
  try {
    const recommendation = await trainingService.getNextRecommendedModel(req.userId!)
    res.json({ success: true, data: recommendation })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
