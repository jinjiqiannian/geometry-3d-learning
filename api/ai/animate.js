/**
 * Vercel Serverless — 第二段：AI 生成动画 IR（设计 §4.1 / §4.2）
 * POST /api/ai/animate  body: { sceneIR, explainIR, primitive }
 *
 * 输入契约（§4.2①）：喂进来的必须是**已校验的 SceneIR + ExplainIR**，不是 OCR 原文。
 * 输出契约：只输出动画 IR 的 JSON；不做校验——闸门在客户端
 *   （validateAnimationIR + physicsGate），此处不重复实现，避免两套规则漂移。
 *
 * 铁律（D8）：AI 永远只出 IR，代码永远由人写。本文件不含任何由 AI 生成的代码。
 *
 * 环境变量：DEEPSEEK_API_KEY；可选 DEEPSEEK_FLASH_MODEL / DEEPSEEK_PRO_MODEL
 */

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'
const FLASH_MODEL = process.env.DEEPSEEK_FLASH_MODEL || 'deepseek-chat'
const PRO_MODEL = process.env.DEEPSEEK_PRO_MODEL || 'deepseek-reasoner'

const EASE_WHITELIST = ['linear', 'easeIn', 'easeOut', 'easeInOut']

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

/**
 * 组装提示词。导出供测试：槽位/锚点白名单必须原样出现在提示词里，
 * 否则模型会凭空造锚点，闸门每次都会拦下（成本白花）。
 */
export function buildAnimatePrompt({ sceneIR, explainIR, primitive }) {
  const slots = primitive?.slots || {}
  const anchors = primitive?.anchors || []
  const derived = primitive?.derived || {}

  const slotLines = Object.entries(slots)
    .map(([name, s]) => `  - ${name}: ${s?.type || 'number'}，范围 ${s?.min ?? '-'} ~ ${s?.max ?? '-'}${s?.unit ? `，单位 ${s.unit}` : ''}`)
    .join('\n')
  const derivedLines = Object.entries(derived)
    .map(([name, expr]) => `  - ${name} = ${expr}（引擎自动计算，你不写、也不改）`)
    .join('\n')

  const system = `你是中学立体几何动画导演。你的唯一产出是一份 JSON 格式的动画 IR，描述几何参数随时间如何变化。

你只能使用下面列出的槽位，且取值必须在声明范围内。派生量由引擎计算，你绝不能出现在输出里。overlays 的 anchor 只能从锚点白名单里选，不能自造。

可用槽位：
${slotLines || '  （无）'}

只读派生量（禁止写入输出）：
${derivedLines || '  （无）'}

可用锚点：
  ${anchors.length ? anchors.join(', ') : '（无）'}

可用缓动（ease）：${EASE_WHITELIST.join(' / ')}（缺省 linear）

严格输出以下 JSON（不要输出其他任何内容，不要用 markdown 代码块包裹）：
{
  "scene": "${primitive?.id || sceneIR?.scene || ''}",
  "params": { 槽位名: 初始值 },
  "duration": 秒数,
  "tracks": [
    { "slot": "槽位名", "keys": [ { "t": 0, "v": 初值 }, { "t": 1.5, "v": 终值, "ease": "easeInOut" } ] }
  ],
  "overlays": [
    { "kind": "label", "text": "不超过 24 字符的公式或结论", "anchor": "锚点名", "from": 0.5, "to": 3 }
  ]
}

硬性规则：
1. 每个 key 的 t 必须严格递增，且落在 0 ~ duration 之间；首个 key 的 t 必须为 0。
2. 每个 slot 的取值必须落在上面声明的范围内。
3. 时长 duration 控制在 3 ~ 12 秒。
4. overlays 文本用 ASCII 数学符号（如 V = a*b*c），不要用中文，字体不支持中文。
5. 只输出 JSON。`

  const user = `场景（已校验）：${JSON.stringify(sceneIR ?? {})}

解题步骤理解（已校验）：${JSON.stringify(explainIR ?? {})}

请为这道题生成一段演示动画 IR。`

  return { system, user }
}

export function extractJSON(text) {
  let cleaned = String(text || '').trim()
  cleaned = cleaned.replace(/^[ \t]*\[REASON\][^\n]*\n?/gm, '').trim()
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) cleaned = codeBlock[1].trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    /* continue */
  }
  const start = cleaned.indexOf('{')
  if (start < 0) throw new Error('无法解析AI返回的JSON')
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1))
  }
  throw new Error('无法解析AI返回的JSON')
}

async function callDeepSeek({ model, system, user, maxTokens, temperature }) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY：请在 Vercel 项目环境变量中添加后重新部署')

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: temperature ?? 0.3,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = errBody?.error?.message || `DeepSeek API ${response.status}`
    throw new Error(msg)
  }

  const data = await response.json()
  return {
    text: data?.choices?.[0]?.message?.content || '',
    reasoning: data?.choices?.[0]?.message?.reasoning_content || '',
  }
}

function envDiag() {
  const key = (process.env.DEEPSEEK_API_KEY || '').trim()
  return {
    ok: true,
    hasDeepseekKey: key.length > 0,
    deepseekKeyLength: key.length,
    flashModel: FLASH_MODEL,
    proModel: PRO_MODEL,
    hint: key ? 'DEEPSEEK_API_KEY 已注入，可生成动画 IR' : '请在 Vercel 添加 DEEPSEEK_API_KEY 后重新部署',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method === 'GET') return res.status(200).json(envDiag())
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: '只用 POST' })

  const { sceneIR, explainIR, primitive } = req.body || {}
  if (!sceneIR || !primitive?.id) {
    return res.status(400).json({ success: false, error: '缺少已校验的 sceneIR 或 primitive' })
  }

  if (!(process.env.DEEPSEEK_API_KEY || '').trim()) {
    return res.status(200).json({
      success: false,
      error: '未配置 DEEPSEEK_API_KEY：请在 Vercel 环境变量中添加后重新部署',
      diag: envDiag(),
    })
  }

  try {
    const { system, user } = buildAnimatePrompt({ sceneIR, explainIR, primitive })
    const { text } = await callDeepSeek({
      model: FLASH_MODEL,
      system,
      user,
      maxTokens: 1600,
      temperature: 0.2,
    })

    let ir
    try {
      ir = extractJSON(text)
    } catch {
      // §4.3 第一行：不可解析 → 交给客户端走降级，不算服务端错误
      return res.status(200).json({ success: false, error: '动画 IR 生成返回不可解析内容' })
    }

    if (!ir || !Array.isArray(ir.tracks)) {
      return res.status(200).json({ success: false, error: '动画 IR 缺少 tracks' })
    }

    if (!ir.scene) ir.scene = primitive.id

    return res.status(200).json({ success: true, ir })
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || '动画 IR 生成失败', diag: envDiag() })
  }
}
