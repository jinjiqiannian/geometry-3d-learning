// ═══════════════════════════════════════════════
//  Stripe Webhook Handler — Edge Function
//  部署: supabase functions deploy stripe-webhook
//  配置: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
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

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Retrieve the subscription to get plan details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id

        // Map Stripe price to our plan name
        const plan = mapPriceToPlan(priceId)
        const interval = subscription.items.data[0].price.recurring?.interval === "year" ? "yearly" : "monthly"

        // Update subscription in Supabase
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            billing_interval: interval,
            status: subscription.status === "active" ? "active" : "past_due",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_customer_id" })

        if (error) console.error("Failed to update subscription:", error)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const plan = mapPriceToPlan(priceId)
        const interval = subscription.items.data[0].price.recurring?.interval === "year" ? "yearly" : "monthly"

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan,
            billing_interval: interval,
            status: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})

function mapPriceToPlan(priceId: string): string {
  if (priceId.includes("teacher")) return "teacher"
  if (priceId.includes("pro")) return "pro"
  return "free"
}
