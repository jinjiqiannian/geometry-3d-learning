// ═══════════════════════════════════════════════════════
//  Knowledge Routes — GET /api/knowledge/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import * as knowledgeService from '../services/knowledge.service.js'

export const knowledgeRouter = Router()

// ═══════════════════════════════════════════════════════
//  GET /api/knowledge/nodes — 知识点列表
//  ?category=立体几何 可选分类筛选
// ═══════════════════════════════════════════════════════
knowledgeRouter.get('/nodes', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined
    const points = await knowledgeService.listKnowledgePoints(category)
    res.json({ success: true, data: points })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/knowledge/nodes/:id — 知识点详情
// ═══════════════════════════════════════════════════════
knowledgeRouter.get('/nodes/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const result = await knowledgeService.getKnowledgePoint(id)
    if (!result.point) {
      return res.status(404).json({ success: false, error: '知识点不存在' })
    }
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/knowledge/path — 学习路径推荐
//  ?target=:id 目标知识点
// ═══════════════════════════════════════════════════════
knowledgeRouter.get('/path', async (req: Request, res: Response) => {
  try {
    const targetId = req.query.target as string
    if (!targetId) {
      return res.status(400).json({ success: false, error: '请指定目标知识点 (target)' })
    }
    const path = await knowledgeService.getLearningPath(targetId)
    res.json({ success: true, data: path })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/knowledge/weakness — 薄弱项分析（需登录）
//  ?category=立体几何 可选
// ═══════════════════════════════════════════════════════
knowledgeRouter.get('/weakness', requireAuth, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined
    const result = await knowledgeService.analyzeWeaknesses(req.userId!, category)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
