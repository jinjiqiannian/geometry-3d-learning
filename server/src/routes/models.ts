// ═══════════════════════════════════════════════════════
//  Model Routes — GET /api/models/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as modelService from '../services/model.service.js'

export const modelRouter = Router()

// ═══════════════════════════════════════════════════════
//  GET /api/models — 模型列表
//  ?category=立体几何 可选
// ═══════════════════════════════════════════════════════
modelRouter.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined
    const models = await modelService.listModels(category)
    res.json({ success: true, data: models })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/models/:id — 模型详情（含例题）
// ═══════════════════════════════════════════════════════
modelRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const result = await modelService.getModel(id)
    if (!result.model) {
      return res.status(404).json({ success: false, error: '模型不存在' })
    }
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/models/match — 题目匹配模型
//  输入题目 → 输出最匹配的 model_id
// ═══════════════════════════════════════════════════════
modelRouter.post('/match', async (req: Request, res: Response) => {
  try {
    const { problemText, category } = req.body
    if (!problemText) {
      return res.status(400).json({ success: false, error: 'problemText 必填' })
    }

    const result = await modelService.matchModelFromDB(problemText, category)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
