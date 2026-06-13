// ═══════════════════════════════════════════════════════
//  Billing Service — Stripe 支付集成
// ═══════════════════════════════════════════════════════
import Stripe from 'stripe'
import { env } from '../config/env.js'
import { getSupabase } from '../db/client.js'
import type { BillingStatus } from '../types/index.js'

let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured: missing STRIPE_SECRET_KEY')
    }
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as any,
    })
  }
  return stripe
}

// ── Price ID mapping ───────────────────────────────
const PRICE_IDS: Record<string, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  teacher_monthly: process.env.STRIPE_PRICE_TEACHER_MONTHLY || 'price_teacher_monthly',
  teacher_yearly: process.env.STRIPE_PRICE_TEACHER_YEARLY || 'price_teacher_yearly',
}

// ── Create Checkout Session ────────────────────────

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: 'pro' | 'teacher',
  interval: 'monthly' | 'yearly'
): Promise<{ url: string }> {
  const stripe = getStripe()
  const supabase = getSupabase()

  const priceKey = `${plan}_${interval}`
  const priceId = PRICE_IDS[priceKey]

  if (!priceId || priceId.startsWith('price_')) {
    throw new Error(`Stripe price not configured for ${priceKey}. Set STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()} in env.`)
  }

  // Get or create Stripe customer
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    })
    customerId = customer.id

    await supabase
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', userId)
  }

  // Create checkout session
  const frontendUrl = env.FRONTEND_URL
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${frontendUrl}/workspace?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/pricing`,
    metadata: {
      userId,
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        userId,
        plan,
        interval,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session URL')
  }

  return { url: session.url }
}

// ── Create Customer Portal ─────────────────────────

export async function createPortalSession(
  userId: string
): Promise<{ url: string }> {
  const stripe = getStripe()
  const supabase = getSupabase()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (!sub?.stripe_customer_id) {
    throw new Error('No Stripe customer found. Please subscribe first.')
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${env.FRONTEND_URL}/pricing`,
  })

  return { url: portal.url }
}

// ── Get Billing Status ─────────────────────────────

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const supabase = getSupabase()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('usage_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today)

  const plan = (sub?.plan || 'free') as 'free' | 'pro' | 'teacher'
  const isPro = plan === 'pro' || plan === 'teacher'
  const dailyLimit = isPro ? Infinity : 3
  const dailyUsage = count || 0

  return {
    plan,
    status: (sub?.status || 'active') as 'active' | 'canceled' | 'past_due',
    billing_interval: (sub?.billing_interval || 'monthly') as 'monthly' | 'yearly',
    current_period_end: sub?.current_period_end || null,
    daily_usage: dailyUsage,
    daily_limit: dailyLimit,
    remaining: Math.max(0, dailyLimit - dailyUsage),
  }
}

// ── Handle Stripe Webhook ──────────────────────────

export async function handleWebhook(
  rawBody: string,
  signature: string
): Promise<{ received: boolean }> {
  const stripe = getStripe()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
  }

  const supabase = getSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { userId, plan, interval } = session.metadata || {}

      if (userId) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: plan || 'pro',
          billing_interval: interval || 'monthly',
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })

        console.log(`✅ Subscription activated: user=${userId}, plan=${plan}`)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (userId) {
        const status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : 'canceled'

        await supabase.from('subscriptions')
          .update({
            status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        console.log(`🔄 Subscription updated: user=${userId}, status=${status}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (userId) {
        // Downgrade to free
        await supabase.from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        console.log(`❌ Subscription canceled: user=${userId}, downgraded to free`)
      }
      break
    }

    default:
      console.log(`📨 Unhandled Stripe event: ${event.type}`)
  }

  return { received: true }
}
