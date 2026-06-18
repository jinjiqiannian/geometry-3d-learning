// ═══════════════════════════════════════════════════════
//  EduMind Routes — /api/edumind/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { dailyLimit } from '../middleware/rateLimit.js'
import * as examService from '../services/exam.service.js'

export const edumindRouter = Router()

// ── Zod Schema ─────────────────────────────────────
const createExamSchema = z.object({
  title: z.string().min(1, '请输入考试标题'),
  subject: z.string().optional().default('数学'),
  exam_date: z.string().optional(),
  total_score: z.number().positive('满分必须大于0').optional(),
  score: z.number().min(0).optional(),
  duration_min: z.number().int().positive().optional(),
  grade: z.string().optional(),
  question_count: z.number().int().positive().optional(),
  questions: z.array(z.object({
    index: z.number().int().positive(),
    content: z.string(),
    type: z.enum(['choice', 'fill', 'calculation', 'proof']),
    score: z.number().positive(),
    earned: z.number().min(0),
    difficulty: z.number().int().min(1).max(5),
    knowledge_points: z.array(z.string()).optional().default([]),
    error_type: z.enum(['concept', 'calculation', 'careless', 'time_pressure', 'psychology']).nullable().optional(),
  })).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
})

const updateExamSchema = createExamSchema.partial()

const questionSchema = z.object({
  index: z.number().int().positive(),
  content: z.string(),
  type: z.enum(['choice', 'fill', 'calculation', 'proof']),
  score: z.number().positive(),
  earned: z.number().min(0),
  difficulty: z.number().int().min(1).max(5),
  knowledge_points: z.array(z.string()).optional().default([]),
})

const analyzeSchema = z.object({
  examId: z.string().uuid('无效的考试ID'),
})

const planSchema = z.object({
  examId: z.string().uuid('无效的考试ID'),
  durationDays: z.number().int().refine(d => [7, 30, 90].includes(d), '计划天数须为 7、30 或 90'),
  goal: z.string().optional(),
})

const coachSchema = z.object({
  question: z.string().min(1, '请输入你的问题'),
  examId: z.string().uuid().optional(),
})

// ═══════════════════════════════════════════════════════
//  POST /api/edumind/exams — 创建考试
// ═══════════════════════════════════════════════════════
edumindRouter.post('/exams', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createExamSchema.parse(req.body)
    const exam = await examService.createExam(req.userId!, data)
    res.json({ success: true, data: exam })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join('; ') })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/exams — 列出考试
//  ?page=1&limit=20
// ═══════════════════════════════════════════════════════
edumindRouter.get('/exams', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const result = await examService.listExams(req.userId!, page, limit)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/exams/:id — 考试详情
// ═══════════════════════════════════════════════════════
edumindRouter.get('/exams/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const exam = await examService.getExam(id, req.userId!)
    if (!exam) {
      return res.status(404).json({ success: false, error: '考试不存在' })
    }
    res.json({ success: true, data: exam })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  PATCH /api/edumind/exams/:id — 更新考试
// ═══════════════════════════════════════════════════════
edumindRouter.patch('/exams/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = updateExamSchema.parse(req.body)
    const id = req.params.id as string
    const exam = await examService.updateExam(id, req.userId!, data)
    res.json({ success: true, data: exam })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join('; ') })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  DELETE /api/edumind/exams/:id — 删除考试
// ═══════════════════════════════════════════════════════
edumindRouter.delete('/exams/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    await examService.deleteExam(id, req.userId!)
    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/edumind/analyze — AI 分析
// ═══════════════════════════════════════════════════════
edumindRouter.post('/analyze', requireAuth, dailyLimit('generate'), async (req: Request, res: Response) => {
  try {
    const { examId } = analyzeSchema.parse(req.body)
    const analysis = await examService.analyzeExam(examId, req.userId!)
    res.json({ success: true, data: analysis })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join('; ') })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/analyze/:examId — 获取分析结果
// ═══════════════════════════════════════════════════════
edumindRouter.get('/analyze/:examId', requireAuth, async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId as string
    const analysis = await examService.getExamAnalysis(examId, req.userId!)
    if (!analysis) {
      return res.status(404).json({ success: false, error: '分析不存在，请先提交分析' })
    }
    res.json({ success: true, data: analysis })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/diagnosis — 综合知识点诊断
// ═══════════════════════════════════════════════════════
edumindRouter.get('/diagnosis', requireAuth, async (req: Request, res: Response) => {
  try {
    const diagnosis = await examService.getDiagnosis(req.userId!)
    res.json({ success: true, data: diagnosis })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/edumind/plan/generate — 生成学习计划
// ═══════════════════════════════════════════════════════
edumindRouter.post('/plan/generate', requireAuth, dailyLimit('generate'), async (req: Request, res: Response) => {
  try {
    const { examId, durationDays, goal } = planSchema.parse(req.body)
    const plan = await examService.generatePlan(req.userId!, examId, durationDays, goal)
    res.json({ success: true, data: plan })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join('; ') })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/plan — 当前活跃计划
// ═══════════════════════════════════════════════════════
edumindRouter.get('/plan', requireAuth, async (req: Request, res: Response) => {
  try {
    const plan = await examService.getActivePlan(req.userId!)
    if (!plan) {
      return res.status(404).json({ success: false, error: '暂无活跃学习计划' })
    }
    res.json({ success: true, data: plan })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  PATCH /api/edumind/plan/:id — 更新计划进度
// ═══════════════════════════════════════════════════════
edumindRouter.patch('/plan/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const progress = z.number().min(0).max(1).parse(req.body.progress)
    const planId = req.params.id as string
    const plan = await examService.updatePlanProgress(planId, req.userId!, progress)
    res.json({ success: true, data: plan })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: '进度须在 0-1 之间' })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/edumind/coach/ask — AI 教练提问
// ═══════════════════════════════════════════════════════
edumindRouter.post('/coach/ask', requireAuth, dailyLimit('generate'), async (req: Request, res: Response) => {
  try {
    const { question, examId } = coachSchema.parse(req.body)
    const message = await examService.askCoach(req.userId!, question, examId)
    res.json({ success: true, data: message })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join('; ') })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/coach/history — 教练聊天记录
// ═══════════════════════════════════════════════════════
edumindRouter.get('/coach/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
    const messages = await examService.getCoachHistory(req.userId!, limit)
    res.json({ success: true, data: messages })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/edumind/coach/daily — 今日提醒
// ═══════════════════════════════════════════════════════
edumindRouter.get('/coach/daily', requireAuth, async (req: Request, res: Response) => {
  try {
    const reminder = await examService.getDailyReminder(req.userId!)
    res.json({ success: true, data: reminder })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/edumind/coach/acknowledge — 确认提醒
// ═══════════════════════════════════════════════════════
edumindRouter.post('/coach/acknowledge', requireAuth, async (req: Request, res: Response) => {
  try {
    const reminderId = z.string().uuid().parse(req.body.reminderId)
    const reminder = await examService.acknowledgeReminder(reminderId, req.userId!)
    res.json({ success: true, data: reminder })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: '无效的提醒ID' })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})
