// ═══════════════════════════════════════════════════════
//  AI Service — DeepSeek 统一调用层 ★核心护城河
//
//  三层模型路由:
//    Layer 1: Flash (deepseek-chat) → 题目解析
//    Layer 2: Pro (deepseek-reasoner) → 解题推理
//    Layer 3: Flash (deepseek-chat) → 3D可视化映射
//
//  特性:
//    - 自动 Flash/Pro 路由
//    - LRU 内存缓存（相同题目复用）
//    - 指数退避 retry（最多3次）
//    - Token 成本追踪
//    - 结构化输出解析
// ═══════════════════════════════════════════════════════
import { env } from '../config/env.js'
import type { ParsedProblem, Step, SceneState, NarrationPhrase } from '../types/index.js'

// ── Constants ──────────────────────────────────────
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'
const FLASH_MODEL = 'deepseek-chat'
const PRO_MODEL = 'deepseek-reasoner'  // DeepSeek V4 Pro 推理模型

const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── LRU Cache ──────────────────────────────────────
interface CacheEntry {
  data: any
  timestamp: number
  hash: string
}

class LRUCache {
  private map = new Map<string, CacheEntry>()
  private maxSize: number

  constructor(maxSize = 500) {
    this.maxSize = maxSize
  }

  get(key: string): any | null {
    const entry = this.map.get(key)
    if (!entry) return null

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.map.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.data
  }

  set(key: string, data: any): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest
      const first = this.map.keys().next()
      if (!first.done) this.map.delete(first.value)
    }

    this.map.set(key, {
      data,
      timestamp: Date.now(),
      hash: key,
    })
  }

  size(): number {
    return this.map.size
  }
}

const cache = new LRUCache(500)

// ── Hash helper ────────────────────────────────────
function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return 'ai_' + Math.abs(hash).toString(36)
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

// ── Core API Call ──────────────────────────────────

interface DeepSeekCallOptions {
  model: string
  system: string
  user: string
  maxTokens: number
  temperature?: number
}

async function callDeepSeek(options: DeepSeekCallOptions): Promise<{
  text: string
  tokensIn: number
  tokensOut: number
}> {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('AI引擎未配置：缺少 DEEPSEEK_API_KEY 环境变量')
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: [
            { role: 'system', content: options.system },
            { role: 'user', content: options.user },
          ],
          max_tokens: options.maxTokens,
          temperature: options.temperature ?? 0.3,
          stream: false,
        }),
      })

      if (response.status === 429) {
        // Rate limited — exponential backoff
        const delay = RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 500
        console.warn(`DeepSeek rate limited, retrying in ${Math.round(delay)}ms...`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        const msg = (errBody as any)?.error?.message || `DeepSeek API returned ${response.status}`
        throw new Error(msg)
      }

      const data = await response.json() as any
      const choice = data.choices?.[0]
      const text = choice?.message?.content || ''

      return {
        text,
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
      }
    } catch (err) {
      lastError = err as Error
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        console.warn(`AI call attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (err as Error).message)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  throw lastError || new Error('AI call failed after retries')
}

// ── JSON extraction from AI response ───────────────

function extractJSON(text: string): any {
  let cleaned = text.trim()

  // Remove Markdown code blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  // Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch { /* continue */ }

  // Try to extract first JSON object/array
  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')

  if (firstBracket >= 0 && (firstBracket < firstBrace || firstBrace < 0)) {
    const lastBracket = cleaned.lastIndexOf(']')
    if (lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1))
    }
  }

  if (firstBrace >= 0) {
    const lastBrace = cleaned.lastIndexOf('}')
    if (lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    }
  }

  throw new Error('无法解析AI返回的JSON格式')
}

// ── Token cost tracking ────────────────────────────

const tokenCosts: { userId: string; tokensIn: number; tokensOut: number; model: string; timestamp: number }[] = []

function trackCost(userId: string, model: string, tokensIn: number, tokensOut: number): void {
  tokenCosts.push({
    userId,
    tokensIn,
    tokensOut,
    model,
    timestamp: Date.now(),
  })

  // Keep only last 10000 entries
  if (tokenCosts.length > 10000) {
    tokenCosts.splice(0, tokenCosts.length - 5000)
  }
}

export function getTokenCosts(userId?: string): {
  totalTokensIn: number
  totalTokensOut: number
  estimatedCostUSD: number
} {
  const relevant = userId
    ? tokenCosts.filter(t => t.userId === userId)
    : tokenCosts

  const totalTokensIn = relevant.reduce((sum, t) => sum + t.tokensIn, 0)
  const totalTokensOut = relevant.reduce((sum, t) => sum + t.tokensOut, 0)

  // DeepSeek pricing (per 1M tokens)
  const flashInPrice = 0.14
  const flashOutPrice = 0.28
  const proInPrice = 0.55
  const proOutPrice = 2.19

  const estimatedCostUSD = relevant.reduce((sum, t) => {
    if (t.model === PRO_MODEL) {
      return sum + (t.tokensIn / 1_000_000) * proInPrice + (t.tokensOut / 1_000_000) * proOutPrice
    }
    return sum + (t.tokensIn / 1_000_000) * flashInPrice + (t.tokensOut / 1_000_000) * flashOutPrice
  }, 0)

  return { totalTokensIn, totalTokensOut, estimatedCostUSD }
}

// ═══════════════════════════════════════════════════════
//  Layer 1: Flash — 题目解析
// ═══════════════════════════════════════════════════════

const PARSE_SYSTEM_PROMPT = `你是一个中学立体几何题目解析器。用户输入一道几何题的文字描述，你提取所有几何信息。

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

规则：
1. type 只能是: cube正方体、cuboid长方体、sphere球体、cylinder圆柱、cone圆锥、pyramid棱锥、prism棱柱、squareFrustum四棱台、circularFrustum圆台
2. size 从题目数字中提取（如"棱长为3"→size=3，"半径为2"→size=2），找不到用2
3. labels 用题目中实际使用的字母标注
4. highlightLines 是题目中提到的关键线段
5. extraParams 用于需要额外参数的几何体（如长方体的宽高、棱台的上底等）
6. 只输出 JSON，不要有任何解释文字`

export async function parseProblem(
  text: string,
  userId?: string
): Promise<ParsedProblem> {
  const normalized = normalizeText(text)
  const cacheKey = `parse_${hashText(normalized)}`

  // Check cache
  const cached = cache.get(cacheKey)
  if (cached) {
    console.log('  📦 AI parse: cache hit')
    return cached
  }

  console.log('  🤖 AI parse: calling DeepSeek Flash...')

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: PARSE_SYSTEM_PROMPT,
    user: `请解析以下几何题目：\n\n${text}`,
    maxTokens: 800,
    temperature: 0.1,
  })

  const parsed = extractJSON(responseText) as ParsedProblem

  // Normalize
  if (!parsed.type) parsed.type = 'cube'
  if (!parsed.size) parsed.size = 2
  if (!parsed.labels) parsed.labels = []
  if (!parsed.highlightLines) parsed.highlightLines = []
  if (!parsed.annotations) parsed.annotations = []

  // Cache result
  cache.set(cacheKey, parsed)

  if (userId) trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

  return parsed
}

// ═══════════════════════════════════════════════════════
//  Layer 2: Pro — 解题推理（Pro/Teacher only）
// ═══════════════════════════════════════════════════════

const REASON_SYSTEM_PROMPT = `你是一个顶尖的中学数学老师，擅长用简洁清晰、具体到题目的语言讲解立体几何题。

重要：你必须针对用户的具体题目生成讲解，不要用通用模板！

对于异面直线夹角问题，请用平移法或向量法具体求解。

严格输出以下 JSON 格式（不要 markdown 代码块）：

[
  {
    "step": 1,
    "title": "步骤标题（如"识别几何体"）",
    "content": "这一步的详细讲解，2-4句话，必须包含具体的几何关系描述和数值",
    "type": "observation|construction|calculation|conclusion",
    "sceneState": {
      "cameraPosition": [5, 3, 5],
      "cameraTarget": [0, 0, 0],
      "highlightEdges": [],
      "highlightColor": "#FF6B6B",
      "showAuxiliaryLines": [],
      "showLabels": [],
      "annotations": [{"text": "具体标注", "position": "top"}],
      "opacity": {"faces": 0.6, "nonHighlightedEdges": 0.8},
      "animationType": "fade",
      "duration": 2000
    }
  }
]

严格要求：
1. 必须针对具体题目，不能套模板。content 中要出现具体的顶点名称（如A₁B）、数值（如2√2）
2. 第几步高亮哪些线段（highlightEdges），第几步画辅助线（showAuxiliaryLines），都要根据题目设置
3. 最后一步的 annotations 中写出最终答案
4. 4-6个步骤
5. type: observation=观察分析, construction=作图构造, calculation=计算推导, conclusion=结论
6. 只输出 JSON 数组，不要任何额外文字`

export async function generateReasoning(
  text: string,
  parsed: ParsedProblem,
  userId?: string
): Promise<Step[]> {
  const normalized = normalizeText(text)
  const cacheKey = `reason_${hashText(normalized)}`

  const cached = cache.get(cacheKey)
  if (cached) {
    console.log('  📦 AI reason: cache hit')
    return cached
  }

  console.log('  🧠 AI reason: calling DeepSeek Pro...')

  const prompt = `题目：${text}\n\n几何体类型：${parsed.type}\n已知参数：${JSON.stringify({ size: parsed.size, labels: parsed.labels, highlightLines: parsed.highlightLines, extraParams: parsed.extraParams })}\n\n请为这道题生成分步解题讲解。`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: PRO_MODEL,
    system: REASON_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 3000,
    temperature: 0.3,
  })

  const steps = extractJSON(responseText) as Step[]

  // Validate
  if (!Array.isArray(steps)) {
    throw new Error('AI推理返回格式错误：期望数组')
  }

  // Normalize each step
  const result = steps.map((s, i) => ({
    step: s.step || i + 1,
    title: s.title || `步骤 ${i + 1}`,
    content: s.content || '',
    type: s.type || 'observation',
    sceneState: s.sceneState || undefined,
  }))

  cache.set(cacheKey, result)

  if (userId) trackCost(userId, PRO_MODEL, tokensIn, tokensOut)

  return result
}

// ═══════════════════════════════════════════════════════
//  Layer 3: Flash — 3D可视化状态生成
// ═══════════════════════════════════════════════════════

const VISUALIZE_SYSTEM_PROMPT = `你是一个3D几何可视化专家。根据解题步骤生成每一帧的3D场景状态。

严格输出 JSON 数组（不要 markdown 代码块）：

[
  {
    "stepIdx": 0,
    "cameraPosition": [5, 3, 5],
    "cameraTarget": [0, 0, 0],
    "highlightEdges": [],
    "highlightColor": "#FF6B6B",
    "showAuxiliaryLines": [],
    "showLabels": [],
    "annotations": [],
    "opacity": {"faces": 0.6, "nonHighlightedEdges": 0.8},
    "animationType": "fade",
    "duration": 2000
  },
  ...
]

规则：
1. 为每个步骤生成一个sceneState
2. cameraPosition 根据几何体调整（正方体用[5,3,5]、球体用[0,5,0]等）
3. 高亮线段在第一二步逐渐增加，后续步骤保持
4. 辅助线用虚线（dashed:true），蓝色
5. 动画不能太复杂，简单fade即可
6. 只输出 JSON 数组`

export async function generateVisualStates(
  parsed: ParsedProblem,
  steps: Step[],
  userId?: string
): Promise<SceneState[]> {
  const cacheKey = `vis_${hashText(JSON.stringify({ type: parsed.type, steps: steps.length }))}`

  const cached = cache.get(cacheKey)
  if (cached) {
    console.log('  📦 AI visualize: cache hit')
    return cached
  }

  console.log('  🎨 AI visualize: calling DeepSeek Flash...')

  const prompt = `几何体：${parsed.type}，尺寸：${parsed.size}\n顶点：${parsed.labels?.join(',')}\n关键线段：${JSON.stringify(parsed.highlightLines)}\n\n解题步骤：\n${steps.map(s => `步骤${s.step}: ${s.title} - ${s.content}`).join('\n')}\n\n请为每个步骤生成3D场景状态。`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: VISUALIZE_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 2000,
    temperature: 0.2,
  })

  const states = extractJSON(responseText) as SceneState[]

  if (!Array.isArray(states)) {
    throw new Error('可视化状态生成格式错误')
  }

  cache.set(cacheKey, states)

  if (userId) trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

  return states
}

// ═══════════════════════════════════════════════════════
//  Narration — 教师讲稿生成（Teacher only）
// ═══════════════════════════════════════════════════════

const NARRATE_SYSTEM_PROMPT = `你是一个中学数学老师，正在课堂上用3D可视化工具讲解立体几何题。

请为每个解题步骤生成讲稿。严格输出 JSON 数组：

[
  {
    "stepIdx": 0,
    "phrase": "同学们好，今天我们来看这道题...",
    "delay": 5000
  },
  ...
]

要求：
1. 讲稿口语化、适合课堂使用
2. delay 根据内容长度设置（中文朗读约3字/秒）
3. 可以加入提问停顿（"同学们看看这个角是多少度？"后给3秒思考）
4. 只输出 JSON 数组`

export async function generateNarration(
  problemText: string,
  steps: Step[],
  userId?: string
): Promise<NarrationPhrase[]> {
  const cacheKey = `narrate_${hashText(problemText)}`

  const cached = cache.get(cacheKey)
  if (cached) return cached

  console.log('  🎤 AI narrate: calling DeepSeek Pro...')

  const prompt = `题目：${problemText}\n\n解题步骤：\n${steps.map(s => `步骤${s.step}: ${s.title}\n内容：${s.content}`).join('\n\n')}`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL, // Use Flash for narration (cheaper, faster)
    system: NARRATE_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 2000,
    temperature: 0.5,
  })

  const narration = extractJSON(responseText) as NarrationPhrase[]

  cache.set(cacheKey, narration)

  if (userId) trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

  return narration
}

// ═══════════════════════════════════════════════════════
//  All-in-one: solveComplete
// ═══════════════════════════════════════════════════════

export interface CompleteSolution {
  parsed: ParsedProblem
  steps: Step[]
  visualStates: SceneState[]
}

export async function solveComplete(
  text: string,
  plan: 'free' | 'pro' | 'teacher',
  userId?: string
): Promise<CompleteSolution> {
  // Layer 1: Parse (always available)
  const parsed = await parseProblem(text, userId)

  // Layer 2: Reasoning — 所有用户走 DeepSeek V4 Pro 推理
  let steps: Step[]
  steps = await generateReasoning(text, parsed, userId)

  // Layer 3: Visual states
  const visualStates = await generateVisualStates(parsed, steps, userId)

  // Merge visual states into steps
  steps = steps.map((step, i) => ({
    ...step,
    sceneState: visualStates[i] || visualStates[visualStates.length - 1] || undefined,
  }))

  return { parsed, steps, visualStates }
}

// ═══════════════════════════════════════════════════════
//  Local template fallback (Free plan)
// ═══════════════════════════════════════════════════════

function generateLocalTemplateSteps(parsed: ParsedProblem): Step[] {
  const type = parsed.type || 'cube'

  const templates: Record<string, Step[]> = {
    cube: [
      { step: 1, title: '识别几何体', content: '正方体，所有棱长相等，每个面都是全等的正方形，对面互相平行。', type: 'observation' },
      { step: 2, title: '分析题目条件', content: '仔细阅读题目，提取已知条件和求解目标。', type: 'observation' },
      { step: 3, title: '构建辅助线/面', content: '根据需要作辅助线或辅助平面，将空间问题转化为平面问题。', type: 'construction' },
      { step: 4, title: '计算求解', content: '使用勾股定理、余弦定理或向量法进行计算。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '整理计算结果，得出最终答案。', type: 'conclusion' },
    ],
    cuboid: [
      { step: 1, title: '识别几何体', content: '长方体，三组对面分别平行且全等，相邻面互相垂直。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '长方体长、宽、高分别为a、b、c，提取已知条件。', type: 'observation' },
      { step: 3, title: '构建辅助线', content: '根据需要作对角线或辅助平面。', type: 'construction' },
      { step: 4, title: '计算求解', content: '使用勾股定理的推广：体对角线 = √(a² + b² + c²)。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '整理计算结果。', type: 'conclusion' },
    ],
    sphere: [
      { step: 1, title: '识别几何体', content: '球体，所有表面点到球心的距离等于半径r。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '提取题目中给出的半径或直径信息。', type: 'observation' },
      { step: 3, title: '应用球体公式', content: '体积 V = (4/3)πr³，表面积 S = 4πr²。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将半径值代入公式进行计算。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '球体的体积和表面积。', type: 'conclusion' },
    ],
    cylinder: [
      { step: 1, title: '识别几何体', content: '圆柱，上下底面为全等的圆，侧面展开为矩形。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面半径r，高h。', type: 'observation' },
      { step: 3, title: '应用圆柱公式', content: '体积 V = πr²h，侧面积 S侧 = 2πrh。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将数值代入公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆柱的体积、侧面积和表面积。', type: 'conclusion' },
    ],
    cone: [
      { step: 1, title: '识别几何体', content: '圆锥，底面为圆，顶点在底面中心的正上方。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面半径r，高h，母线l = √(r² + h²)。', type: 'observation' },
      { step: 3, title: '应用圆锥公式', content: '体积 V = (1/3)πr²h，侧面积 S侧 = πrl。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '先求母线长，再代入公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆锥的体积和表面积。', type: 'conclusion' },
    ],
    pyramid: [
      { step: 1, title: '识别几何体', content: '正棱锥，底面为正多边形，顶点在底面中心的垂直上方。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面边长a，高h。', type: 'observation' },
      { step: 3, title: '应用棱锥公式', content: '体积 V = (1/3)×底面积×高。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '计算底面积，再求体积。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '棱锥的体积。', type: 'conclusion' },
    ],
    prism: [
      { step: 1, title: '识别几何体', content: '棱柱，上下底面为全等的多边形，侧面为矩形。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面边长和棱柱的高。', type: 'observation' },
      { step: 3, title: '应用棱柱公式', content: '体积 V = 底面积 × 高。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '先计算底面积，再乘高。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '棱柱的体积。', type: 'conclusion' },
    ],
    squareFrustum: [
      { step: 1, title: '识别几何体', content: '四棱台（平截头棱锥），上下底面为相似的正方形。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '上底边长a，下底边长b，高h。', type: 'observation' },
      { step: 3, title: '应用棱台公式', content: '体积 V = h/3 × (S₁ + S₂ + √(S₁S₂))。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将数值代入棱台体积公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '四棱台的体积。', type: 'conclusion' },
    ],
    circularFrustum: [
      { step: 1, title: '识别几何体', content: '圆台（平截头圆锥），上下底面为半径不同的圆。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '上底面半径r，下底面半径R，高h。', type: 'observation' },
      { step: 3, title: '应用圆台公式', content: '体积 V = πh/3 × (R² + r² + Rr)。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将数值代入圆台体积公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆台的体积和表面积。', type: 'conclusion' },
    ],
  }

  return templates[type] || templates.cube
}
