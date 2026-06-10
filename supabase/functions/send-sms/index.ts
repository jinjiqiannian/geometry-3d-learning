// ═══════════════════════════════════════════════
//  send-sms — Supabase Edge Function
//  通过阿里云短信 API 发送验证码
//  部署: supabase functions deploy send-sms
// ═══════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── 阿里云签名 ──────────────────────────────────
async function hmacSha1(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  )
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data))
}

async function signRequest(
  params: Record<string, string>,
  accessKeySecret: string
): Promise<string> {
  // 1. Sort keys alphabetically
  const sortedKeys = Object.keys(params).sort()

  // 2. Build canonical query string (URL-encoded)
  const canonical = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&")

  // 3. String to sign
  const stringToSign = `GET&${encodeURIComponent("/")}&${encodeURIComponent(canonical)}`

  // 4. Sign with HMAC-SHA1
  const key = new TextEncoder().encode(accessKeySecret + "&")
  const signature = await hmacSha1(key, stringToSign)

  // 5. Base64 encode
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

// ── 生成随机验证码 ──────────────────────────────
function generateCode(): string {
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  const num = (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0
  return String(num % 1000000).padStart(6, "0")
}

// ── 限流：60秒内同一手机号只能发一次 ───────────
async function checkRateLimit(supabaseClient: any, phone: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabaseClient
    .from("verification_codes")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since)

  return (count ?? 0) === 0
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { phone, purpose = "register" } = body

    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: "手机号不能为空" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 创建 Supabase 客户端（service_role）──
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // ── 限流检查 ──
    const canSend = await checkRateLimit(supabaseClient, phone)
    if (!canSend) {
      return new Response(JSON.stringify({
        success: false,
        error: "发送过于频繁，请 60 秒后再试",
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 生成验证码并存入数据库 ──
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString() // 5分钟有效

    const { error: dbError } = await supabaseClient
      .from("verification_codes")
      .insert({
        phone,
        code,
        purpose,
        expires_at: expiresAt,
      })

    if (dbError) throw new Error("验证码存储失败: " + dbError.message)

    // ── 调用阿里云短信 API ──
    const accessKeyId = Deno.env.get("ALIBABA_ACCESS_KEY_ID") ?? ""
    const accessKeySecret = Deno.env.get("ALIBABA_ACCESS_KEY_SECRET") ?? ""
    const signName = Deno.env.get("ALIBABA_SMS_SIGN_NAME") ?? "几何维度"
    const templateCode = Deno.env.get("ALIBABA_SMS_TEMPLATE_CODE") ?? ""

    if (!accessKeyId || !accessKeySecret || !templateCode) {
      // 开发模式：不发送短信，仅打印验证码（可通过 Supabase 后台查看）
      console.log(`[DEV] 验证码已生成: ${code} → ${phone}`)
      return new Response(JSON.stringify({
        success: true,
        dev: true,
        phone,
        code, // ⚠️ 生产环境删除此行
        message: "验证码已生成（开发模式）",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 阿里云 API 请求参数
    const timestamp = new Date().toISOString()
      .replace(/[:-]/g, "")
      .replace(/\.\d{3}/, "")
    const nonce = crypto.randomUUID().replace(/-/g, "")

    const params: Record<string, string> = {
      AccessKeyId: accessKeyId,
      Action: "SendSms",
      Format: "JSON",
      PhoneNumbers: phone,
      SignName: signName,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: nonce,
      SignatureVersion: "1.0",
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify({ code }),
      Timestamp: timestamp,
      Version: "2017-05-25",
    }

    const signature = await signRequest(params, accessKeySecret)
    params.Signature = signature

    const query = Object.keys(params).sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&")

    const res = await fetch(`https://dysmsapi.aliyuncs.com/?${query}`)
    const result = await res.json()

    console.log("阿里云短信返回:", JSON.stringify(result))

    if (result.Code !== "OK") {
      throw new Error(result.Message || "短信发送失败")
    }

    return new Response(JSON.stringify({
      success: true,
      message: "验证码已发送",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("send-sms error:", error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "发送失败",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
