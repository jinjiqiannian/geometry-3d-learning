// ═══════════════════════════════════════════════════════
//  Workspace Routes — /api/workspace/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import * as workspaceService from '../services/workspace.service.js'

export const workspaceRouter = Router()

function getParam(req: Request, name: string): string {
  const val = req.params[name]
  return Array.isArray(val) ? val[0] : val
}

// ── Validation ─────────────────────────────────────
const createSchema = z.object({
  problemText: z.string().min(3),
  parsedData: z.any().optional(),
  steps: z.any().optional(),
  geometry: z.any().optional(),
})

const updateSchema = z.object({
  title: z.string().optional(),
  steps: z.any().optional(),
  geometry: z.any().optional(),
  parsedData: z.any().optional(),
  isPublic: z.boolean().optional(),
})

// ═══════════════════════════════════════════════════════
//  POST /api/workspace
// ═══════════════════════════════════════════════════════
workspaceRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = createSchema.parse(req.body)
    const workspace = await workspaceService.createWorkspace(
      req.userId!,
      body.problemText,
      body.parsedData,
      body.steps,
      body.geometry
    )
    res.status(201).json({ success: true, data: workspace })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/workspace
// ═══════════════════════════════════════════════════════
workspaceRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const search = req.query.search as string

    if (search) {
      const result = await workspaceService.searchPublicWorkspaces(search, page, limit)
      return res.json({ success: true, data: result })
    }

    const result = await workspaceService.listWorkspaces(req.userId!, page, limit)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/workspace/:id
// ═══════════════════════════════════════════════════════
workspaceRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id')
    const workspace = await workspaceService.getWorkspace(id, req.userId)

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' })
    }

    res.json({ success: true, data: workspace })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  PATCH /api/workspace/:id
// ═══════════════════════════════════════════════════════
workspaceRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id')
    const body = updateSchema.parse(req.body)
    const workspace = await workspaceService.updateWorkspace(id, req.userId!, body)
    res.json({ success: true, data: workspace })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    const status = err.message.includes('not found') ? 404 : 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  DELETE /api/workspace/:id
// ═══════════════════════════════════════════════════════
workspaceRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id')
    await workspaceService.deleteWorkspace(id, req.userId!)
    res.json({ success: true, message: 'Workspace deleted' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/workspace/:id/fork
// ═══════════════════════════════════════════════════════
workspaceRouter.post('/:id/fork', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id')
    const workspace = await workspaceService.forkWorkspace(id, req.userId!)
    res.status(201).json({ success: true, data: workspace })
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/workspace/:id/publish
// ═══════════════════════════════════════════════════════
workspaceRouter.post('/:id/publish', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id')
    const result = await workspaceService.publishWorkspace(id, req.userId!)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/workspace/:id/replay — SSE
// ═══════════════════════════════════════════════════════
workspaceRouter.post('/:id/replay', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id')
    const fromStep = parseInt(req.body?.fromStep) || 0

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const events = workspaceService.generateReplayEvents(id, req.userId, fromStep)

    for await (const event of events) {
      const data = JSON.stringify(event)
      res.write(`event: ${event.type}\ndata: ${data}\n\n`)
      if (event.type === 'complete') break
    }

    res.write('event: done\ndata: {}\n\n')
    res.end()
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message })
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})
