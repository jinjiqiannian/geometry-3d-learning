/**
 * Vercel Serverless — 排组/导数/圆锥/物理 ExplainIR 兜底
 * POST /api/ai/explain  body: { problemText, topic }
 *
 * 本地引擎认不出时前端会调此接口。缺此文件时生产 404。
 *
 * 环境变量：DEEPSEEK_API_KEY（与 solve-stream 共用）
 */

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'
const FLASH_MODEL = process.env.DEEPSEEK_FLASH_MODEL || 'deepseek-chat'

const TOPICS = new Set(['combo', 'derivative', 'conic', 'physics'])

const EXPLAIN_TOPIC_HINT = {
  combo:
    '排列组合与概率。重点讲清「为什么乘/加、有序还是无序」。problemType 用 multiply_add | perm_comb | classical_prob。',
  derivative:
    '导数。重点拆计算步骤与易错点（求导、切线、单调性）。problemType 用 deriv_poly | deriv_tangent | deriv_mono 或自拟短名。',
  conic:
    '圆锥曲线。重点认 a,b,c 与公式（椭圆减、双曲线加）。problemType 用 ellipse_e | hyper_focus | circle_r 或自拟短名。',
  physics:
    '高中物理（力学+电磁）。重点拆清公式选用与代入（匀变速、F=ma、U=IR、E=F/q、ε=ΔΦ/Δt）。problemType 用 phys_kinematic | phys_ohm | phys_efield_def | phys_faraday 或自拟短名。',
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

function extractJSON(text) {
  let cleaned = String(text || '').trim()
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) cleaned = codeBlock[1].trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    /* continue */
  }
  const startObj = cleaned.indexOf('{')
  const startArr = cleaned.indexOf('[')
  let start = -1
  if (startObj < 0) start = startArr
  else if (startArr < 0) start = startObj
  else start = Math.min(startObj, startArr)
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

async function callDeepSeek({ model, system, user, maxTokens, temperature }) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!apiKey) {
    throw new Error('未配置 DEEPSEEK_API_KEY：请在 Vercel 项目环境变量中添加后重新部署')
  }

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
      temperature: temperature ?? 0.2,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = errBody?.error?.message || `DeepSeek API ${response.status}`
    throw new Error(msg)
  }

  const data = await response.json()
  return { text: data?.choices?.[0]?.message?.content || '' }
}

function envDiag() {
  const key = (process.env.DEEPSEEK_API_KEY || '').trim()
  return {
    ok: true,
    hasDeepseekKey: key.length > 0,
    deepseekKeyLength: key.length,
    flashModel: FLASH_MODEL,
    hint: key
      ? 'DEEPSEEK_API_KEY 已注入，可 ExplainIR 兜底'
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

  try {
    const problemText = String(req.body?.problemText || '').trim()
    const topic = String(req.body?.topic || '').trim()

    if (problemText.length < 3) {
      return res.status(400).json({ success: false, error: '题目至少3个字符' })
    }
    if (!TOPICS.has(topic)) {
      return res.status(400).json({
        success: false,
        error: 'topic 须为 combo | derivative | conic | physics',
      })
    }

    if (!(process.env.DEEPSEEK_API_KEY || '').trim()) {
      return res.status(500).json({
        success: false,
        error: '未配置 DEEPSEEK_API_KEY：请在 Vercel 环境变量中添加后重新部署',
        diag: envDiag(),
      })
    }

    const system = `你是高中数学/物理老师。只输出一个 JSON 对象，不要 markdown，不要其它文字。
目标：把题目拆成「能看懂为什么」的步骤，并给出思路树节点。

JSON 形状（字段名必须一致）:
{
  "version": 1,
  "problemType": "短英文题型名",
  "topic": "${topic}",
  "goal": "题干或求什么",
  "coreIdea": "一句话核心思路",
  "rootId": "root",
  "nodes": [
    { "id": "root", "label": "节点文案", "kind": "choice", "children": ["a"], "why": "为什么" }
  ],
  "steps": [
    {
      "index": 1,
      "title": "短标题",
      "content": "学生可读讲解",
      "why": "这一步为什么这样做（必填）",
      "formula": "可选公式",
      "highlightNodeIds": ["root"]
    }
  ],
  "answer": "最终答案字符串"
}

规则:
- steps 3~6 步；每步必须有 why
- nodes 形成树：rootId 存在，children 只引用已有 id
- highlightNodeIds 对应该步要高亮的节点
- 数学用 Unicode（² ³ √ −）或纯文本分数 3/5
- ${EXPLAIN_TOPIC_HINT[topic] || ''}`

    const result = await callDeepSeek({
      model: FLASH_MODEL,
      system,
      user: problemText,
      maxTokens: 2000,
      temperature: 0.2,
    })

    const ir = extractJSON(result.text)
    if (!ir || typeof ir !== 'object') {
      throw new Error('AI 未返回有效 ExplainIR')
    }
    if (!Array.isArray(ir.steps) || !Array.isArray(ir.nodes)) {
      throw new Error('ExplainIR 缺少 steps/nodes')
    }
    ir.version = 1
    ir.topic = topic
    if (!ir.rootId) ir.rootId = 'root'
    if (!ir.goal) ir.goal = problemText

    return res.status(200).json({ success: true, data: ir })
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'ExplainIR 生成失败',
      diag: envDiag(),
    })
  }
}
