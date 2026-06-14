// ═══════════════════════════════════════════════
//  Stripe Webhook Handler — Edge Function
//  部署: supabase functions deploy stripe-webhook
//  配置: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//        supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//        supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
// ═══════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.2.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

// ── Idempotency cache (prevents replay attacks) ──
// In production, use a DB table or Redis; in-memory is acceptable for a single instance
const processedEvents = new Set<string>()
const MAX_PROCESSED_EVENTS = 1000

function isDuplicate(eventId: string): boolean {
  if (processedEvents.has(eventId)) return true
  processedEvents.add(eventId)
  // Prevent memory leak — evict oldest entries
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const iterator = processedEvents.values()
    for (let i = 0; i < 200; i++) {
      const next = iterator.next()
      if (next.done) break
      processedEvents.delete(next.value)
    }
  }
  return false
}

// ── Supported event types ──
const SUPPORTED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]

serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    // ── Idempotency check ──
    if (isDuplicate(event.id)) {
      console.warn(`Duplicate event ${event.id}, skipping`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // ── Filter to supported event types ──
    if (!SUPPORTED_EVENTS.includes(event.type)) {
      console.log(`Unsupported event type: ${event.type}, skipping`)
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!subscriptionId) {
          console.error("No subscription ID in checkout session")
          break
        }

        // 从 session metadata 中获取 userId
        const userId = session.metadata?.userId || (session as any).client_reference_id

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price?.id
        if (!priceId) {
          console.error("No price ID in subscription")
          break
        }

        const plan = mapPriceToPlan(priceId)
        const interval = subscription.items.data[0].price.recurring?.interval === "year" ? "yearly" : "monthly"

        const upsertPayload: Record<string, any> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          billing_interval: interval,
          status: subscription.status === "active" ? "active" : "past_due",
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }

        // 如果有 userId，一起写入（确保 subscriptions 表关联到正确的用户）
        if (userId) {
          upsertPayload.user_id = userId
        }

        const { error } = await supabase
          .from("subscriptions")
          .upsert(upsertPayload, { onConflict: "stripe_customer_id" })

        if (error) console.error("Failed to upsert subscription:", error)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        const priceId = subscription.items.data[0]?.price?.id
        if (!priceId) break

        const plan = mapPriceToPlan(priceId)
        const interval = subscription.items.data[0].price.recurring?.interval === "year" ? "yearly" : "monthly"

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan,
            billing_interval: interval,
            status: subscription.status === "active" ? "active"
              : subscription.status === "past_due" ? "past_due"
              : "canceled",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) console.error("Failed to update subscription:", error)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            billing_interval: "monthly",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) console.error("Failed to downgrade subscription:", error)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Webhook error:", error)
    // Don't leak internal errors to the caller
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})

function mapPriceToPlan(priceId: string): string {
  if (priceId.includes("teacher")) return "teacher"
  if (priceId.includes("pro")) return "pro"
  return "free"
}
