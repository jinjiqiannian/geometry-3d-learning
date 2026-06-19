// ═══════════════════════════════════════════════════════
//  EduMind 路由 — 学生画像 + 文件上传
//  合并自 archive/exammind 的 student.ts + upload.ts
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import multer from 'multer'
import { getSupabase } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'

export const edumindRouter = Router()

// ── Multer 配置 ─────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式，请上传 JPG/PNG/PDF'))
    }
  },
})

// ═══════════════════════════════════════════════════════
//  Student — 学生画像
// ═══════════════════════════════════════════════════════

// GET /api/edumind/student/profile
edumindRouter.get('/student/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase()
    const userId = req.userId!

    const { data: mastery } = await supabase
      .from('knowledge_mastery')
      .select('*')
      .eq('user_id', userId)

    const { data: mistakes } = await supabase
      .from('mistakes')
      .select('type')
      .eq('user_id', userId)

    const { count: examCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const masteryMap: Record<string, number> = {}
    const strengths: string[] = []
    const weaknesses: string[] = []

    for (const m of mastery || []) {
      masteryMap[m.knowledge_point] = m.mastery
      if (m.mastery >= 0.7) strengths.push(m.knowledge_point)
      else if (m.mastery < 0.5) weaknesses.push(m.knowledge_point)
    }

    const patternCount: Record<string, number> = {}
    for (const m of mistakes || []) {
      patternCount[m.type] = (patternCount[m.type] || 0) + 1
    }
    const mistakePatterns = Object.entries(patternCount).map(([type, count]) => ({ type, count }))

    res.json({
      success: true,
      data: {
        studentId: userId,
        masteryMap,
        mistakePatterns,
        strengths,
        weaknesses,
        learningStyle: 'practice',
        examCount: examCount || 0,
        recentTrend: strengths.length > weaknesses.length ? 'improving' : 'stable',
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/edumind/student/mastery
edumindRouter.get('/student/mastery', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('knowledge_mastery')
      .select('*')
      .eq('user_id', req.userId!)
      .order('mastery', { ascending: true })

    if (error) throw new Error(error.message)
    res.json({ success: true, data: data || [] })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/edumind/student/trends
edumindRouter.get('/student/trends', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('mistakes')
      .select('type')
      .eq('user_id', req.userId!)

    if (error) throw new Error(error.message)

    const counts: Record<string, number> = {}
    for (const m of data || []) {
      counts[m.type] = (counts[m.type] || 0) + 1
    }
    const result = Object.entries(counts).map(([type, count]) => ({ type, count }))

    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  Upload — 文件上传到 Supabase Storage
// ═══════════════════════════════════════════════════════

// POST /api/edumind/upload
edumindRouter.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase()
    if (!req.file) throw new Error('请选择文件')

    const examId = req.body.examId as string
    if (!examId) throw new Error('缺少考试 ID')

    const fileExt = req.file.originalname.split('.').pop()
    const filePath = `${req.userId}/${examId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('exam-uploads')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (uploadError) throw new Error(`上传失败: ${uploadError.message}`)

    const { data: urlData } = supabase.storage
      .from('exam-uploads')
      .getPublicUrl(filePath)

    const { data: uploadRecord, error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: req.userId!,
        exam_id: examId,
        type: req.body.type || 'exam_paper',
        file_url: urlData?.publicUrl || '',
        ocr_status: 'pending',
      })
      .select()
      .single()

    if (dbError) throw new Error(dbError.message)

    res.json({ success: true, data: uploadRecord })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/edumind/upload/:id/status
edumindRouter.get('/upload/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase()
    const id = req.params.id
    const { data, error } = await supabase
      .from('uploads')
      .select('id, ocr_status, ocr_text')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single()

    if (error) return res.status(404).json({ success: false, error: '上传记录不存在' })
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
