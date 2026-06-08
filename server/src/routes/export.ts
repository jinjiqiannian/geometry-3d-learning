// ═══════════════════════════════════════════════════════
//  Export Routes — POST /api/export/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { requirePlan } from '../middleware/requirePlan.js'
import * as pptService from '../services/ppt.service.js'

export const exportRouter = Router()

// ── Validation ─────────────────────────────────────
const pptSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  screenshotBase64: z.string().optional(),
  template: z.enum(['default', 'classroom']).optional(),
  teacherName: z.string().optional(),
  schoolName: z.string().optional(),
  includeNarration: z.boolean().optional(),
})

// ═══════════════════════════════════════════════════════
//  POST /api/export/ppt — 导出 PPT（Teacher only）
// ═══════════════════════════════════════════════════════
exportRouter.post(
  '/ppt',
  requireAuth,
  requirePlan('teacher'),
  async (req: Request, res: Response) => {
    try {
      const body = pptSchema.parse(req.body)
      const { buffer, fileName } = await pptService.generatePPTBuffer(body, req.userId)

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
      res.setHeader('Content-Length', buffer.length.toString())
      res.send(buffer)
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message })
      }
      const status = err.message.includes('not found') ? 404 : 500
      res.status(status).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════
//  POST /api/export/image — 导出图片（Pro+）
// ═══════════════════════════════════════════════════════
exportRouter.post(
  '/image',
  requireAuth,
  requirePlan('pro'),
  async (req: Request, res: Response) => {
    try {
      const { workspaceId, stepIdx, imageBase64 } = req.body

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'imageBase64 is required (canvas screenshot)',
        })
      }

      // Store image in Supabase Storage or return as download
      // For now, return as inline image
      res.json({
        success: true,
        data: {
          url: imageBase64, // Already a data URL
          workspaceId,
          stepIdx: stepIdx || 0,
        },
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }
)

// ═══════════════════════════════════════════════════════
//  POST /api/export/share-link — 生成分享链接（Pro+）
// ═══════════════════════════════════════════════════════
exportRouter.post(
  '/share-link',
  requireAuth,
  requirePlan('pro'),
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.body
      if (!workspaceId) {
        return res.status(400).json({ success: false, error: 'workspaceId is required' })
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5179'
      const shareUrl = `${frontendUrl}/workspace?load=${workspaceId}`

      res.json({
        success: true,
        data: { url: shareUrl, workspaceId },
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }
)
