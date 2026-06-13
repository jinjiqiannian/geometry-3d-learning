// ═══════════════════════════════════════════════
//  Stripe Customer Portal — Edge Function
//  部署: supabase functions deploy stripe-portal
// ═══════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.2.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

// ── Allowed origins ──
const ALLOWED_ORIGINS = [
  "https://jiheweidu.cn",
  "https://jinjiqiannian.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") || ""
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  if (origin.startsWith("http://localhost")) return origin
  return ALLOWED_ORIGINS[0]
}

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
})

// ── Rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60

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

  // ── Auth check ──
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "请先登录" }),
      { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  }

  // ── Rate limit ──
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown"
  const rateLimitKey = `auth:${authHeader.slice(-20)}`

  if (!checkRateLimit(rateLimitKey)) {
    return new Response(
      JSON.stringify({ error: "请求过于频繁，请稍后再试。" }),
      { status: 429, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  }

  try {
    const body = await req.json()
    const { customerId, returnUrl } = body

    // ── Validate ──
    if (!customerId || typeof customerId !== "string" || customerId.length < 5) {
      return new Response(
        JSON.stringify({ error: "Invalid customerId" }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    // Sanitize return URL
    const safeReturnUrl = sanitizeUrl(returnUrl, origin)

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: safeReturnUrl || `${origin}/#/pricing`,
    })

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Stripe portal error:", error.message)
    return new Response(
      JSON.stringify({ error: "打开管理页面失败，请稍后再试。" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    )
  }
})

function sanitizeUrl(url: unknown, origin: string): string | undefined {
  if (typeof url !== "string" || url.length === 0) return undefined
  if (url.startsWith("/")) return `${origin}${url}`
  try {
    const parsed = new URL(url)
    if (ALLOWED_ORIGINS.some(o => parsed.origin === o)) return url
    if (parsed.hostname === "localhost") return url
  } catch {
    return undefined
  }
  return undefined
}
