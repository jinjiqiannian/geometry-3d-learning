// ═══════════════════════════════════════════════
//  Stripe Checkout Session — Edge Function
//  部署: supabase functions deploy stripe-checkout
// ═══════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.2.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

// ── Allowed origins (CORS whitelist) ──
const ALLOWED_ORIGINS = [
  "https://jiheweidu.cn",
  "https://jinjiqiannian.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") || ""
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // In development, allow any localhost
  if (origin.startsWith("http://localhost")) return origin
  return ALLOWED_ORIGINS[0]
}

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
})

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10     // requests
const RATE_LIMIT_WINDOW = 60  // seconds

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// ── Valid price ID prefixes (prevents arbitrary price injection) ──
const VALID_PRICE_PREFIXES = ["price_"];

function isValidPriceId(priceId: unknown): priceId is string {
  if (typeof priceId !== "string" || priceId.length < 10) return false
  return VALID_PRICE_PREFIXES.some(prefix => priceId.startsWith(prefix))
}

serve(async (req) => {
  const origin = getAllowedOrigin(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  }

  // ── Rate limit by IP (fallback) or authorization header ──
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown"
  const authHeader = req.headers.get("Authorization")
  const rateLimitKey = authHeader
    ? `auth:${authHeader.slice(-20)}`
    : `ip:${clientIp}`

  if (!checkRateLimit(rateLimitKey)) {
    return new Response(
      JSON.stringify({ error: "请求过于频繁，请稍后再试。" }),
      { status: 429, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  }

  try {
    const body = await req.json()
    const { priceId, successUrl, cancelUrl } = body

    // ── Validate inputs ──
    if (!priceId || !isValidPriceId(priceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid priceId" }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "请先登录后再订阅" }),
        { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    // Sanitize URLs — only allow relative or same-origin URLs
    const safeSuccessUrl = sanitizeUrl(successUrl, origin)
    const safeCancelUrl = sanitizeUrl(cancelUrl, origin)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "alipay"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: safeSuccessUrl || `${origin}/#/workspace?upgrade=success`,
      cancel_url: safeCancelUrl || `${origin}/#/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Stripe checkout error:", error.message)
    return new Response(
      JSON.stringify({ error: "创建支付会话失败，请稍后再试。" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  }
})

/**
 * Sanitize URL — only allow same-origin URLs to prevent open redirect
 */
function sanitizeUrl(url: unknown, origin: string): string | undefined {
  if (typeof url !== "string" || url.length === 0) return undefined
  // Allow relative paths
  if (url.startsWith("/")) return `${origin}${url}`
  // Allow same-origin absolute URLs
  try {
    const parsed = new URL(url)
    if (ALLOWED_ORIGINS.some(o => parsed.origin === o)) return url
    // Also allow localhost
    if (parsed.hostname === "localhost") return url
  } catch {
    return undefined
  }
  return undefined
}
