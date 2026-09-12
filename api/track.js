/**
 * 埋点写入端点
 * POST /api/track  body: { anonId, sessionId, event, path, referrer, utm, props, isMobile, screen }
 *
 * 环境变量（Vercel）：
 *   SUPABASE_SERVICE_ROLE_KEY  可选；配了就优先用它写（前端刷不进来）
 *   否则退回 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY（表上有 insert 策略）
 *
 * 设计原则：这里出任何问题都不该影响主流程 —— 一律返回 200，只在 body 里标 ok。
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''

const SERVER_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''

// 事件白名单：不收任意字符串，避免这张表被当成任意日志桶
const ALLOWED = new Set([
  'page_view',
  'cta_click',
  'solve_submit',
  'solve_done',
  'solve_error',
  'step_next',
  'signup_open',
])

// 各字段长度上限，防止超长字符串撑爆表
const cut = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  // 浏览器直接打开该地址时给个自检回显，方便确认配置
  if (req.method === 'GET') {
    // 只回显 host，不回显 key。URL 本身不是秘密（它在前端包里）。
    let urlHost = null
    let urlShape = null
    try {
      const u = new URL(SUPABASE_URL)
      urlHost = u.host
      urlShape = `${u.protocol}//${u.host}`
    } catch {
      urlShape = `无法解析：${JSON.stringify(String(SUPABASE_URL).slice(0, 40))}`
    }
    return res.status(200).json({
      ok: true,
      configured: Boolean(SUPABASE_URL && SERVER_KEY),
      usingServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      urlHost,
      urlShape,
      allowedEvents: [...ALLOWED],
    })
  }
  if (req.method !== 'POST') return res.status(200).json({ ok: false })

  try {
    const b = req.body || {}
    const event = cut(b.event, 40)
    if (!event || !ALLOWED.has(event)) {
      return res.status(200).json({ ok: false, reason: 'event not allowed' })
    }
    if (!SUPABASE_URL || !SERVER_KEY) {
      return res.status(200).json({ ok: false, reason: 'not configured' })
    }

    const utm = b.utm || {}
    const row = {
      anon_id: cut(b.anonId, 64),
      session_id: cut(b.sessionId, 64),
      event,
      path: cut(b.path, 200),
      referrer: cut(b.referrer, 300),
      utm_source: cut(utm.source, 60),
      utm_medium: cut(utm.medium, 60),
      utm_campaign: cut(utm.campaign, 80),
      props: b.props && typeof b.props === 'object' ? b.props : null,
      is_mobile: typeof b.isMobile === 'boolean' ? b.isMobile : null,
      screen: cut(b.screen, 20),
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_events`, {
      method: 'POST',
      headers: {
        apikey: SERVER_KEY,
        Authorization: `Bearer ${SERVER_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    })

    if (!r.ok) {
      // 把 Supabase 的原始报错回显出来，否则「表不存在」这类问题
      // 会被下面那个 catch 吞成一句无信息的 exception。
      const detail = await r.text().catch(() => '')
      return res.status(200).json({
        ok: false,
        status: r.status,
        detail: detail.slice(0, 300),
        table: 'site_events',
      })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    // 埋点失败绝不能冒泡到用户；但错误信息要能在自检时看到，
    // 否则排查时会像刚才那样只拿到一句没有信息量的 exception。
    // undici 的 "fetch failed" 只是个外壳，真正的原因在 cause 里
    // （ENOTFOUND / ECONNREFUSED / CERT_* / UND_ERR_* 等）
    const cause = e?.cause
    const causeText = cause
      ? ` ← ${cause.code || cause.errno || ''} ${cause.message || ''}`.trim()
      : ''
    return res.status(200).json({
      ok: false,
      reason: 'exception',
      detail: (String(e?.message || e) + causeText).slice(0, 300),
    })
  }
}
