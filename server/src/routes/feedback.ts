// ═══════════════════════════════════════════════════════
//  Feedback Routes — POST/GET/PATCH /api/feedback/*
//  ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { getSupabase, executeSQL } from '../db/client.js'

export const feedbackRouter = Router()

// ── Validation Schemas ──────────────────────────────

const submitSchema = z.object({
  type: z.enum(['suggestion', 'bug', 'improvement', 'learning-difficulty', 'other', 'satisfaction']),
  title: z.string().min(1, '标题不能为空').max(100, '标题不超过100字'),
  description: z.string().min(10, '描述至少10个字').max(2000, '描述不超过2000字'),
  contact: z.string().max(100).optional(),
  // satisfaction
  rating: z.number().int().min(1).max(5).optional(),
  // learning-difficulty
  learning_difficulties: z.array(z.string()).optional(),
  geometry_type: z.string().optional(),
  difficulty_level: z.string().optional(),
})

const updateSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved', 'archived']).optional(),
  admin_notes: z.string().max(2000).optional(),
})

// ── Auto-create table (best-effort, on first load) ──

async function ensureTable(): Promise<boolean> {
  try {
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        title TEXT,
        description TEXT,
        contact TEXT,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        learning_difficulties JSONB DEFAULT '[]',
        geometry_type TEXT,
        difficulty_level TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
      CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
    `)
    console.log('  📝 Feedback table ensured')
    return true
  } catch {
    return false
  }
}
ensureTable()

// ── POST /api/feedback — 提交反馈（无需登录）────────

feedbackRouter.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const body = submitSchema.parse(req.body)
    const supabase = getSupabase()

    const feedback: Record<string, unknown> = {
      type: body.type,
      title: body.title,
      description: body.description,
      contact: body.contact || null,
      user_id: req.userId || null,
      status: 'pending',
      metadata: {},
    }

    // 类型专属字段
    if (body.type === 'satisfaction') {
      feedback.rating = body.rating
    }
    if (body.type === 'learning-difficulty') {
      feedback.learning_difficulties = body.learning_difficulties || []
      feedback.geometry_type = body.geometry_type || null
      feedback.difficulty_level = body.difficulty_level || null
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert(feedback)
      .select('id, created_at')
      .single()

    if (error) {
      // 表不存在时自动重试建表
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        const created = await ensureTable()
        if (created) {
          const retry = await supabase.from('feedback').insert(feedback).select('id, created_at').single()
          if (retry.error) throw retry.error
          return res.json({ success: true, data: retry.data })
        }
      }
      throw error
    }

    res.json({ success: true, data })
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    console.error('Feedback submit error:', err)
    res.status(500).json({ success: false, error: '提交失败，请稍后重试' })
  }
})

// ── GET /api/feedback — 管理列表（需登录）───────────

feedbackRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase()
    const query = req.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10) || 50))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (query.type) q = q.eq('type', query.type)
    if (query.status) q = q.eq('status', query.status)

    const { data, error, count } = await q.range(from, to)

    if (error) throw error

    res.json({
      success: true,
      data: {
        items: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err: unknown) {
    console.error('Feedback list error:', err)
    res.status(500).json({ success: false, error: '获取反馈列表失败' })
  }
})

// ── GET /api/feedback/stats — 统计数据（需登录）─────

feedbackRouter.get('/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase.from('feedback').select('status, type')

    if (error) throw error

    const items = data || []
    const total = items.length
    const pending = items.filter((d: any) => d.status === 'pending').length
    const reviewed = items.filter((d: any) => d.status === 'reviewed').length
    const resolved = items.filter((d: any) => d.status === 'resolved').length

    const byType: Record<string, number> = {}
    items.forEach((d: any) => {
      byType[d.type] = (byType[d.type] || 0) + 1
    })

    res.json({
      success: true,
      data: { total, pending, reviewed, resolved, byType },
    })
  } catch (err: unknown) {
    console.error('Feedback stats error:', err)
    res.status(500).json({ success: false, error: '获取统计失败' })
  }
})

// ── PATCH /api/feedback/:id — 更新状态/备注（需登录）─

feedbackRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = updateSchema.parse(req.body)
    const supabase = getSupabase()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.status) updates.status = body.status
    if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes

    const { data, error } = await supabase
      .from('feedback')
      .update(updates)
      .eq('id', id)
      .select('id, status, admin_notes, updated_at')
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    console.error('Feedback update error:', err)
    res.status(500).json({ success: false, error: '更新失败' })
  }
})
