// ═══════════════════════════════════════════════════════
//  Billing Routes — /api/billing/*
// ═══════════════════════════════════════════════════════
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import * as billingService from '../services/billing.service.js'

export const billingRouter = Router()

// ── Validation ─────────────────────────────────────
const checkoutSchema = z.object({
  plan: z.enum(['pro', 'teacher']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

// ═══════════════════════════════════════════════════════
//  POST /api/billing/create-checkout — 创建Stripe Checkout
// ═══════════════════════════════════════════════════════
billingRouter.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = checkoutSchema.parse(req.body)

    // Get user email
    const { supabase } = await import('../lib/supabase.js')
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', req.userId)
      .single()

    const email = profile?.email || ''

    const result = await billingService.createCheckoutSession(
      req.userId!,
      email,
      body.plan,
      body.interval
    )

    res.json({ success: true, data: result })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0]?.message })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  GET /api/billing/status — 获取订阅状态
// ═══════════════════════════════════════════════════════
billingRouter.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await billingService.getBillingStatus(req.userId!)
    res.json({ success: true, data: status })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/billing/portal — 打开Customer Portal
// ═══════════════════════════════════════════════════════
billingRouter.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await billingService.createPortalSession(req.userId!)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  POST /api/billing/webhook — Stripe Webhook
//  ⚠️ 此端点需要raw body，已在index.ts中特殊处理
// ═══════════════════════════════════════════════════════
billingRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string

    if (!signature) {
      return res.status(400).json({ success: false, error: 'Missing stripe-signature header' })
    }

    // Body is raw buffer (from express.raw middleware)
    const rawBody = req.body.toString()

    const result = await billingService.handleWebhook(rawBody, signature)
    res.json({ success: true, data: result })
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    res.status(400).json({ success: false, error: err.message })
  }
})
