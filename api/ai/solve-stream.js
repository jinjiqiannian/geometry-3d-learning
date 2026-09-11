/**
 * Vercel Serverless — AI 流式解题（替代已失效的 Railway）
 * POST /api/ai/solve-stream  body: { problemText }
 * SSE: event parsed | reasoning | done | error
 *
 * 环境变量（Vercel → Settings → Environment Variables）：
 *   DEEPSEEK_API_KEY=sk-...
 *   可选：DEEPSEEK_FLASH_MODEL / DEEPSEEK_PRO_MODEL
 */

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'
const FLASH_MODEL = process.env.DEEPSEEK_FLASH_MODEL || 'deepseek-chat'
const PRO_MODEL = process.env.DEEPSEEK_PRO_MODEL || 'deepseek-reasoner'

const PARSE_SYSTEM_PROMPT = `你是一个中学立体几何题目解析器。用户输入一道几何题的文字描述，你必须准确提取所有几何信息。

严格输出以下 JSON 格式（不要输出其他内容，不要用 markdown 代码块包裹）：

{
  "type": "cube|sphere|cylinder|cone|pyramid|prism|cuboid|squareFrustum|circularFrustum",
  "size": 数字（边长/半径，题目未给出则默认2）,
  "labels": ["题目中使用的顶点标签，按标准顺序排列"],
  "highlightLines": [{"from": "A", "to": "C", "label": "AC", "reason": "题目要求"}],
  "annotations": [{"text": "已知条件", "position": "bottom|top|left|right"}],
  "explanation": "一句话概述你理解的题目内容",
  "extraParams": {"height": 数字, "radius2": 数字}
}

识别规则：
1. type 只能是：cube/cuboid/pyramid/prism/cylinder/cone/sphere/squareFrustum/circularFrustum
2. size 从题目数字提取，找不到用2
3. labels 用题目中实际字母
4. highlightLines 是关键线段
5. 只输出 JSON`

const REASON_SYSTEM_PROMPT = `你是一个顶尖的中学数学老师，专门从事立体几何教学。针对用户的具体题目，生成一步步的真实数学推导过程。

禁止：通用模板、空洞套话。
必须：具体顶点、数值、公式与计算结果。

重要：在输出最终 JSON 之前，先用自然语言逐步思考，每句话前加 [REASON] 前缀。
推理结束后，再输出严格 JSON 对象（不要 markdown 代码块）：

{
  "steps": [
    {
      "step": 1,
      "title": "识别几何体",
      "content": "……含具体顶点与数值……",
      "type": "observation"
    }
  ],
  "finalAnswer": { "expression": "…", "value": "…" }
}

type: observation|construction|calculation|conclusion
多小问时 title 以「(1)」「(2)」开头，step.part 为小问号（共用为 0）`

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

function extractJSON(text) {
  let cleaned = String(text || '').trim()
  // 提示词要求模型先用 [REASON] 前缀输出思考过程，再给 JSON。
  // 不剥掉这些行，下面的 indexOf('[') 会命中 [REASON] 的方括号，
  // depth 在它的 ] 处立刻归零，最后 JSON.parse("[REASON]") 必然报
  // Unexpected token 'R' —— 只要模型听话就 100% 失败。
  cleaned = cleaned.replace(/^[ \t]*\[REASON\][^\n]*\n?/gm, '').trim()
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) cleaned = codeBlock[1].trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    /* continue */
  }
  const startObj = cleaned.indexOf('{')
  const startArr = cleaned.indexOf('[')
  // 两处调用（解析 / 推理）的预期输出都是对象，优先从 { 起算，
  // 避免任何残留的 [ 把起点带偏。
  const start = startObj >= 0 ? startObj : startArr
  if (start < 0) throw new Error('无法解析AI返回的JSON')
  const open = cleaned[start]
  const close = open === '{' ? '}' : ']'
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
    if (ch === open) depth++
    if (ch === close) depth--
    if (depth === 0) {
      return JSON.parse(cleaned.slice(start, i + 1))
    }
  }
  throw new Error('无法解析AI返回的JSON')
}

// 导出供测试：这个函数曾经因为 [REASON] 前缀静默失败过很久，需要回归保护
export { extractJSON }

async function callDeepSeek({ model, system, user, maxTokens, temperature, thinking }) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY：请在 Vercel 项目环境变量中添加后重新部署')

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: temperature ?? 0.3,
    stream: false,
  }
  if (thinking) {
    body.thinking = { type: 'enabled' }
  }

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = errBody?.error?.message || `DeepSeek API ${response.status}`
    throw new Error(msg)
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content || ''
  const reasoning = data?.choices?.[0]?.message?.reasoning_content || ''
  return { text, reasoning }
}

async function* callDeepSeekStream({ model, system, user, maxTokens, temperature, thinking }) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY：请在 Vercel 项目环境变量中添加后重新部署')

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: temperature ?? 0.3,
    stream: true,
  }
  if (thinking) {
    body.thinking = { type: 'enabled' }
  }

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = errBody?.error?.message || `DeepSeek API ${response.status}`
    throw new Error(msg)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('DeepSeek 流式响应为空')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta
        if (delta?.content) {
          fullText += delta.content
          yield delta.content
        }
        if (delta?.reasoning_content) {
          yield delta.reasoning_content
        }
      } catch {
        /* skip */
      }
    }
  }
  yield { _complete: true, text: fullText }
}

function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function envDiag() {
  const key = (process.env.DEEPSEEK_API_KEY || '').trim()
  return {
    ok: true,
    hasDeepseekKey: key.length > 0,
    deepseekKeyLength: key.length,
    flashModel: FLASH_MODEL,
    proModel: PRO_MODEL,
    hint: key
      ? 'DEEPSEEK_API_KEY 已注入，可 AI 解题'
      : '请在 Vercel 添加 DEEPSEEK_API_KEY 后重新部署',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method === 'GET') {
    return res.status(200).json(envDiag())
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '只用 POST' })
  }

  const problemText = String(req.body?.problemText || '').trim()
  if (problemText.length < 3) {
    return res.status(400).json({ success: false, error: '题目至少3个字符' })
  }

  if (!(process.env.DEEPSEEK_API_KEY || '').trim()) {
    return res.status(500).json({
      success: false,
      error: '未配置 DEEPSEEK_API_KEY：请在 Vercel 环境变量中添加后重新部署',
      diag: envDiag(),
    })
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  let aborted = false
  req.on('close', () => {
    aborted = true
  })

  try {
    // 1) 解析
    const parseRes = await callDeepSeek({
      model: FLASH_MODEL,
      system: PARSE_SYSTEM_PROMPT,
      user: `请解析以下几何题目：\n\n${problemText}`,
      maxTokens: 800,
      temperature: 0.1,
    })
    let parsed
    try {
      parsed = extractJSON(parseRes.text)
    } catch {
      parsed = { type: 'cube', size: 2, labels: [], highlightLines: [], explanation: problemText }
    }
    if (!parsed.type) parsed.type = 'cube'
    if (!parsed.size) parsed.size = 2
    if (!parsed.labels) parsed.labels = []
    if (!parsed.highlightLines) parsed.highlightLines = []
    if (aborted) return
    sseWrite(res, 'parsed', parsed)

    // 2) 流式推理
    const prompt = `题目：${problemText}\n\n几何体类型：${parsed.type}\n已知参数：${JSON.stringify({
      size: parsed.size,
      labels: parsed.labels,
      highlightLines: parsed.highlightLines,
      extraParams: parsed.extraParams,
    })}\n\n请为这道题生成分步解题讲解。`

    let fullResponse = ''
    for await (const chunk of callDeepSeekStream({
      model: PRO_MODEL,
      system: REASON_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 8192,
      temperature: 0.3,
      thinking: true,
    })) {
      if (aborted) break
      if (typeof chunk === 'string') {
        fullResponse += chunk
        if (chunk.startsWith('[REASON]') || fullResponse.includes('[REASON]')) {
          sseWrite(res, 'reasoning', chunk)
        } else if (!fullResponse.includes('{') && chunk.trim()) {
          // reasoner 的 reasoning_content：也推给前端
          sseWrite(res, 'reasoning', `[REASON] ${chunk}`)
        }
      } else if (chunk._complete) {
        fullResponse = chunk.text || fullResponse
      }
    }

    if (aborted) return

    const parsedOut = extractJSON(fullResponse)
    const rawSteps = Array.isArray(parsedOut)
      ? parsedOut
      : Array.isArray(parsedOut?.steps)
        ? parsedOut.steps
        : []
    const steps = rawSteps.map((s, i) => ({
      step: s.step || i + 1,
      title: s.title || `步骤 ${i + 1}`,
      content: s.content || '',
      type: s.type || 'observation',
      part: typeof s.part === 'number' ? s.part : undefined,
      sceneState: s.sceneState || undefined,
    }))

    if (steps.length === 0) {
      throw new Error('AI 未返回有效解题步骤')
    }

    sseWrite(res, 'done', {
      parsed,
      steps,
      finalAnswer: parsedOut?.finalAnswer ?? null,
    })
    res.write('event: __close\ndata: done\n\n')
    res.end()
  } catch (err) {
    const message = err?.message || '推理失败'
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: message, diag: envDiag() })
    }
    sseWrite(res, 'error', { message })
    res.write('event: __close\ndata: error\n\n')
    res.end()
  }
}
