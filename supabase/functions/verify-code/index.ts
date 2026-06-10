// ═══════════════════════════════════════════════
//  verify-code — Supabase Edge Function
//  验证短信验证码是否有效
//  部署: supabase functions deploy verify-code
// ═══════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { phone, code, purpose = "register" } = body

    if (!phone || !code) {
      return new Response(JSON.stringify({
        success: false, error: "手机号和验证码不能为空",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // ── 开发模式允许万能验证码 ──
    const devMasterCode = Deno.env.get("DEV_MASTER_CODE") ?? ""
    if (devMasterCode && code === devMasterCode) {
      return new Response(JSON.stringify({
        success: true, verified: true, phone,
        message: "验证通过（开发模式）",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 查找最新有效验证码 ──
    const now = new Date().toISOString()
    const { data: records, error } = await supabaseClient
      .from("verification_codes")
      .select("*")
      .eq("phone", phone)
      .eq("purpose", purpose)
      .eq("verified", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw new Error("查询验证码失败: " + error.message)

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({
        success: false, verified: false,
        error: "验证码已过期，请重新获取",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const record = records[0]

    // ── 超过尝试次数 ──
    if (record.attempts >= 5) {
      return new Response(JSON.stringify({
        success: false, verified: false,
        error: "尝试次数过多，请重新获取验证码",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 增加尝试次数 ──
    await supabaseClient
      .from("verification_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id)

    // ── 验证码比对 ──
    if (record.code !== code) {
      return new Response(JSON.stringify({
        success: false, verified: false,
        error: "验证码错误，请重试",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 标记为已验证 ──
    await supabaseClient
      .from("verification_codes")
      .update({ verified: true })
      .eq("id", record.id)

    return new Response(JSON.stringify({
      success: true, verified: true, phone,
      message: "验证通过",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("verify-code error:", error)
    return new Response(JSON.stringify({
      success: false, verified: false,
      error: error instanceof Error ? error.message : "验证失败",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
