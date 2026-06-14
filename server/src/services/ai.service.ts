// ═══════════════════════════════════════════════════════
//  AI Service — DeepSeek 统一调用层 ★核心护城河
//
//  三层模型路由:
//    Layer 1: Flash (deepseek-chat) → 题目解析 + 题型识别
//    Layer 2: Pro (deepseek-reasoner) → 解题推理（schema填充）
//    Layer 3: Flash (deepseek-chat) → 3D可视化映射
//
//  特性:
//    - 自动 Flash/Pro 路由
//    - LRU 内存缓存（相同题目复用）
//    - 指数退避 retry（最多3次）
//    - Token 成本追踪
//    - 结构化输出解析
//    - Step Schema Registry（结构由代码决定，prompt只填充内容）
// ═══════════════════════════════════════════════════════
import { env } from '../config/env.js'
import type { ParsedProblem, Step, SceneState, NarrationPhrase, ProblemSubType, StepType } from '../types/index.js'

// ── Constants ──────────────────────────────────────
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'
const FLASH_MODEL = 'deepseek-chat'
const PRO_MODEL = 'deepseek-reasoner'  // DeepSeek V4 Pro 推理模型

const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── Step Schema Registry ──────────────────────────
// 纯数据结构：每种题型定义步骤序列（结构由代码决定，不依赖 prompt）
// Prompt 只填充 content/why/stuck，不决定步骤数和 type
interface StepSchemaEntry {
  step: number
  type: StepType
  title: string
}

interface StepSchema {
  steps: StepSchemaEntry[]
}

const STEP_SCHEMA_REGISTRY: Record<string, StepSchema> = {
  skew_lines: {
    steps: [
      { step: 1, type: 'conceptual',   title: '确认异面直线' },
      { step: 2, type: 'construction', title: '寻找平移方向' },
      { step: 3, type: 'construction', title: '构造共面三角形' },
      { step: 4, type: 'calculation',  title: '用余弦定理计算夹角' },
      { step: 5, type: 'validation',   title: '验证角度范围' },
    ],
  },
  dihedral_angle: {
    steps: [
      { step: 1, type: 'conceptual',   title: '确定两个平面与交线' },
      { step: 2, type: 'construction', title: '在交线上作垂线' },
      { step: 3, type: 'conceptual',   title: '确定二面角的平面角' },
      { step: 4, type: 'calculation',  title: '计算平面角大小' },
      { step: 5, type: 'validation',   title: '判断锐角还是钝角' },
    ],
  },
  line_plane_angle: {
    steps: [
      { step: 1, type: 'conceptual',   title: '确定直线与平面' },
      { step: 2, type: 'construction', title: '作直线在平面上的投影' },
      { step: 3, type: 'conceptual',   title: '确定线面角' },
      { step: 4, type: 'calculation',  title: '计算线面角的正弦值' },
      { step: 5, type: 'validation',   title: '验证角度范围' },
    ],
  },
  section: {
    steps: [
      { step: 1, type: 'conceptual',   title: '确定截面条件' },
      { step: 2, type: 'construction', title: '找截面与棱的交点' },
      { step: 3, type: 'construction', title: '连接交点确定截面形状' },
      { step: 4, type: 'calculation',  title: '计算截面面积或周长' },
    ],
  },
  shortest_distance: {
    steps: [
      { step: 1, type: 'conceptual',   title: '确定最短距离类型' },
      { step: 2, type: 'construction', title: '构造公垂线段' },
      { step: 3, type: 'calculation',  title: '计算距离' },
      { step: 4, type: 'validation',   title: '验证是否为最短' },
    ],
  },
  volume: {
    steps: [
      { step: 1, type: 'conceptual',   title: '识别几何体和已知量' },
      { step: 2, type: 'calculation',  title: '计算底面积' },
      { step: 3, type: 'calculation',  title: '计算高' },
      { step: 4, type: 'calculation',  title: '代入体积公式' },
      { step: 5, type: 'validation',   title: '验证单位与合理性' },
    ],
  },
  spatial_vector: {
    steps: [
      { step: 1, type: 'conceptual',   title: '建立空间直角坐标系' },
      { step: 2, type: 'construction', title: '写出各点坐标' },
      { step: 3, type: 'construction', title: '求方向向量或法向量' },
      { step: 4, type: 'calculation',  title: '代入向量公式计算' },
      { step: 5, type: 'validation',   title: '验证结果' },
    ],
  },
  distance_point_plane: {
    steps: [
      { step: 1, type: 'conceptual',   title: '确定点和平面' },
      { step: 2, type: 'construction', title: '建立坐标系或找垂线' },
      { step: 3, type: 'calculation',  title: '代入距离公式' },
      { step: 4, type: 'validation',   title: '验证距离合理性' },
    ],
  },
  inscribed_circumscribed: {
    steps: [
      { step: 1, type: 'conceptual',   title: '理解内切或外接关系' },
      { step: 2, type: 'construction', title: '确定球心位置' },
      { step: 3, type: 'calculation',  title: '计算半径' },
      { step: 4, type: 'calculation',  title: '计算体积或表面积' },
    ],
  },
  general: {
    steps: [
      { step: 1, type: 'conceptual',   title: '识别几何体和已知条件' },
      { step: 2, type: 'construction', title: '构造辅助线或坐标系' },
      { step: 3, type: 'calculation',  title: '进行计算推导' },
      { step: 4, type: 'validation',   title: '得出结论' },
    ],
  },
}

function getSchema(problemType?: string): StepSchema {
  return STEP_SCHEMA_REGISTRY[problemType || 'general'] || STEP_SCHEMA_REGISTRY.general
}

// 以 Schema 结构为准合并 AI 内容，防止结构 drift
function mergeSchemaWithContent(schema: StepSchema, aiSteps: any[]): Step[] {
  return schema.steps.map((entry, i) => {
    const ai = aiSteps?.[i]
    return {
      step: entry.step,
      title: entry.title,
      content: ai?.content || '',
      type: entry.type,
      why: ai?.why || undefined,
      stuck: ai?.stuck || undefined,
      sceneState: ai?.sceneState || undefined,
    }
  })
}

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

/**
 * 用户输入消毒 — 防止 Prompt Injection
 * 1. 截断到最大长度
 * 2. 用分隔符包裹，与系统指令隔离
 */
function sanitizeInput(text: string, maxLength = 2000): string {
  const cleaned = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // 移除控制字符
    .trim()
    .slice(0, maxLength)
  return `【题目开始】\n${cleaned}\n【题目结束】`
}

// ── Core API Call ──────────────────────────────────

interface DeepSeekCallOptions {
  model: string
  system: string
  user: string
  maxTokens: number
  temperature?: number
}

async function callDeepSeek(options: DeepSeekCallOptions, userId?: string): Promise<{
  text: string
  tokensIn: number
  tokensOut: number
}> {
  // 每日成本上限检查
  checkCostLimit(userId)

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

// ── Token cost tracking + 每日上限 ────────────────

const tokenCosts: { userId: string; tokensIn: number; tokensOut: number; model: string; timestamp: number }[] = []

// 默认每日硬上限（USD），可通过环境变量覆盖
const DAILY_COST_LIMIT = env.DAILY_AI_COST_LIMIT
const USER_DAILY_COST_LIMIT = env.USER_DAILY_AI_COST_LIMIT

function getTodayCosts(userId?: string): { total: number; userTotal: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = today.getTime()

  const todayCosts = tokenCosts.filter(t => t.timestamp >= cutoff)

  const total = todayCosts.reduce((sum, t) => {
    const price = t.model === PRO_MODEL ? { in: 0.55, out: 2.19 } : { in: 0.14, out: 0.28 }
    return sum + (t.tokensIn / 1_000_000) * price.in + (t.tokensOut / 1_000_000) * price.out
  }, 0)

  const userTotal = userId
    ? todayCosts.filter(t => t.userId === userId).reduce((sum, t) => {
        const price = t.model === PRO_MODEL ? { in: 0.55, out: 2.19 } : { in: 0.14, out: 0.28 }
        return sum + (t.tokensIn / 1_000_000) * price.in + (t.tokensOut / 1_000_000) * price.out
      }, 0)
    : 0

  return { total, userTotal }
}

function checkCostLimit(userId?: string): void {
  const { total, userTotal } = getTodayCosts(userId)

  if (total > DAILY_COST_LIMIT) {
    console.error(`❌ Daily AI cost limit reached: $${total.toFixed(4)} / $${DAILY_COST_LIMIT}`)
    throw new Error(`AI 服务每日预算已超限（$${total.toFixed(2)} / $${DAILY_COST_LIMIT}），请明天再试`)
  }

  if (userId && userTotal > USER_DAILY_COST_LIMIT) {
    console.warn(`⚠️ User ${userId.slice(0, 8)} daily AI cost limit reached: $${userTotal.toFixed(4)} / $${USER_DAILY_COST_LIMIT}`)
    throw new Error('您的 AI 使用量已达每日上限')
  }
}

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
//  Layer 1: Flash — 题目解析（含题型识别）
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
  "extraParams": {"height": 数字, "radius2": 数字},
  "problemType": "题目类型（见下方规则7）"
}

规则：
1. type 只能是: cube正方体、cuboid长方体、sphere球体、cylinder圆柱、cone圆锥、pyramid棱锥、prism棱柱、squareFrustum四棱台、circularFrustum圆台
2. size 从题目数字中提取（如"棱长为3"→size=3，"半径为2"→size=2），找不到用2
3. labels 用题目中实际使用的字母标注
4. highlightLines 是题目中提到的关键线段
5. extraParams 用于需要额外参数的几何体（如长方体的宽高、棱台的上底等）
6. 只输出 JSON，不要有任何解释文字
7. problemType 字段：根据题目内容判断题型
   - "skew_lines": 异面直线夹角/所成角/异面直线
   - "dihedral_angle": 二面角/两个平面的夹角
   - "line_plane_angle": 线面角/直线与平面所成角
   - "section": 截面/截平面
   - "shortest_distance": 最短距离/最小值/最短路程
   - "volume": 体积/容积
   - "spatial_vector": 向量法/坐标法/法向量
   - "distance_point_plane": 点到平面距离/点面距离
   - "inscribed_circumscribed": 内切/内接/外接/外切
   - "general": 无法确定时用此`

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
    user: sanitizeInput(text) + `\n\n请严格按 JSON 格式输出解析结果。`,
    maxTokens: 800,
    temperature: 0.1,
  }, userId)

  const parsed = extractJSON(responseText) as ParsedProblem

  // Normalize
  if (!parsed.type) parsed.type = 'cube'
  if (!parsed.size) parsed.size = 2
  if (!parsed.labels) parsed.labels = []
  if (!parsed.highlightLines) parsed.highlightLines = []
  if (!parsed.annotations) parsed.annotations = []
  // problemType is optional — keep AI's answer or leave undefined for frontend fallback

  // Cache result
  cache.set(cacheKey, parsed)

  if (userId) trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

  return parsed
}

// ═══════════════════════════════════════════════════════
//  Layer 2: Pro — 解题推理（Schema 填充模式）
//
//  流程：
//  1. 根据题型获取 Step Schema（固定结构）
//  2. 将 Schema 结构信息传给 AI，AI 只填充 content/why/stuck
//  3. mergeSchemaWithContent() 以 Schema 为准合并结果，防止结构 drift
// ═══════════════════════════════════════════════════════

const REASON_SYSTEM_PROMPT = `你是一个顶尖的中学数学老师，专门从事立体几何教学。你的任务是针对用户的具体题目，在给定步骤框架内填充教学讲解。

🚫 绝对禁止：通用模板、泛化描述、"使用公式计算"这类空洞的话。
🚫 不要改变步骤数量或顺序，严格按照用户给定的步骤框架填充。
✅ 必须做到：针对具体题目，写出每一步的数学表达式和计算结果。
✅ 每步必须包含 why.intuition（生活类比）、why.math_reason（数学原理）、stuck.misconception（学生错误）、stuck.correction（正确理解）。

用户将在题目信息中提供：
- 步骤数量和各步标题（固定，不要修改）
- 题目描述和已知条件

你需要为每步输出以下格式：

{
  "content": "具体到这步做什么，使用真实顶点名称和数值，写出完整数学表达式",
  "why": {
    "intuition": "用生活类比或直观理解解释：为什么要做这步？（1-2句话）",
    "math_reason": "严格的数学原理：为什么这样做是正确的？（1-2句话）"
  },
  "stuck": {
    "misconception": "学生在这步最可能产生的错误理解",
    "correction": "正确的理解方式"
  },
  "sceneState": {
    "cameraPosition": [5, 3, 5],
    "cameraTarget": [0, 0, 0],
    "highlightEdges": [{"from": "A1", "to": "B"}],
    "highlightColor": "#4A90E2",
    "showAuxiliaryLines": [],
    "showLabels": ["A","B","C","D","A1","B1","C1","D1"],
    "annotations": [{"text": "关键说明", "position": "bottom"}],
    "opacity": {"faces": 0.6, "nonHighlightedEdges": 0.8},
    "animationType": "fade",
    "duration": 2000
  }
}

严格要求：
1. content 必须包含具体顶点名称和数值，写入真实的数学表达式。例如 "A₁B = √(2²+2²) = 2√2" 而不是 "用勾股定理求线段长"
2. why.intuition 用生活类比解释（如"平移就像把筷子拿到同一张桌子上"）
3. why.math_reason 写严格的数学原理（1-2句话）
4. stuck.misconception 判断学生这步最可能的错误
5. stuck.correction 用简洁的语言纠正
6. 计算步骤中写出完整算式和代入过程
7. 只输出 JSON 数组，不要任何额外文字`

/**
 * 根据题型生成步骤填充 prompt
 * 告诉 AI 它需要填充多少步、每步标题，让 AI 按框架生成内容
 */
function buildFillPrompt(text: string, parsed: ParsedProblem, schema: StepSchema): string {
  const stepsOutline = schema.steps
    .map(s => `  步骤${s.step}: ${s.title}`)
    .join('\n')

  return `题目：${sanitizeInput(text)}

题型：${parsed.problemType || '综合题'}
几何体类型：${parsed.type}
已知参数：${JSON.stringify({
    size: parsed.size,
    labels: parsed.labels,
    highlightLines: parsed.highlightLines,
    extraParams: parsed.extraParams,
  })}

步骤框架（共 ${schema.steps.length} 步，请严格按此结构填充，不要增删步骤）：
${stepsOutline}

请为每步填充 content、why（intuition+math_reason）、stuck（misconception+correction）和 sceneState。`
}

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

  // 1. 获取题型对应的 Step Schema
  const schema = getSchema(parsed.problemType)

  // 2. 构建填充 prompt
  const prompt = buildFillPrompt(text, parsed, schema)

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: PRO_MODEL,
    system: REASON_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 3000,
    temperature: 0.3,
  }, userId)

  const aiSteps = extractJSON(responseText) as any[]

  // Validate
  if (!Array.isArray(aiSteps)) {
    throw new Error('AI推理返回格式错误：期望数组')
  }

  // 3. 以 Schema 为准合并 AI 内容，防止结构 drift
  const result = mergeSchemaWithContent(schema, aiSteps)

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
  }, userId)

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

  const prompt = `题目：${sanitizeInput(problemText)}\n\n解题步骤：\n${steps.map(s => `步骤${s.step}: ${s.title}\n内容：${s.content}`).join('\n\n')}`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL, // Use Flash for narration (cheaper, faster)
    system: NARRATE_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 2000,
    temperature: 0.5,
  }, userId)

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
}

export async function solveComplete(
  text: string,
  plan: 'free' | 'pro' | 'teacher',
  userId?: string
): Promise<CompleteSolution> {
  // Layer 0: 缓存检查 — 相同题目直接命中
  const normalized = normalizeText(text)
  const solveCacheKey = `solve_${hashText(normalized)}`
  const cached = cache.get(solveCacheKey)
  if (cached) {
    console.log('  📦 solveComplete: cache hit')
    return cached
  }

  // Layer 1: Parse (always available) — 同时输出题型
  const parsed = await parseProblem(text, userId)

  // Layer 2: Reasoning — 按 plan 路由模型
  let steps: Step[]

  switch (plan) {
    case 'free':
      // Free 用户走本地模板（零 AI 成本）
      steps = generateLocalTemplateSteps(parsed)
      console.log('  🏗️ Free user: using local template steps (zero AI cost)')
      break

    case 'pro':
      // Pro 用户走 Pro 推理
      steps = await generateReasoning(text, parsed, userId)
      console.log('  ⚡ Pro user: using Pro reasoning')
      break

    case 'teacher':
      // Teacher 走 Pro（高质量，课堂场景）
      steps = await generateReasoning(text, parsed, userId)
      console.log('  🧠 Teacher user: using Pro reasoning')
      break

    default:
      steps = generateLocalTemplateSteps(parsed)
  }

  const result: CompleteSolution = { parsed, steps }
  cache.set(solveCacheKey, result)
  return result
}

// ═══════════════════════════════════════════════════════
//  Local template (Free plan) — 题型感知 + 结构化 why/stuck
// ═══════════════════════════════════════════════════════

// 本地模板内容 — 每个题型每步的结构化教学文本
const LOCAL_CONTENT: Record<string, Record<number, string>> = {
  skew_lines: {
    1: '检查题目中的两条直线是否共面。若不共面，则为异面直线。判断方法：两条线既不相交也不平行 → 异面。',
    2: '选择其中一条直线，沿几何体的棱方向平移到与另一条直线有公共点的位置。通常选择更容易计算的路线。',
    3: '平移后两条直线相交于一点，构造包含这两条直线的三角形。第三边通常通过连接两个已知顶点得到。',
    4: '在三角形中，已知三边长度，使用余弦定理求目标角：cosθ = (a²+b²-c²)/(2ab)。代入具体数值计算。',
    5: '异面直线夹角的范围是(0°, 90°]。检查计算结果：若余弦为负，说明实际夹角为钝角，应取其补角（锐角）。',
  },
  dihedral_angle: {
    1: '确定题目中涉及的两个平面，以及它们的交线。二面角是这两个平面之间的夹角。',
    2: '在交线上取一点，分别在两个平面内作交线的垂线。这两条垂线所成的角即为二面角的平面角。',
    3: '两条垂线与交线构成的角就是二面角的平面角。该平面角的大小唯一确定二面角的大小。',
    4: '利用向量法：分别求两个平面的法向量n₁和n₂，二面角余弦 = |n₁·n₂|/(|n₁|·|n₂|)。或使用几何法直接计算。',
    5: '判断二面角是锐角还是钝角。观察图形：若两个平面在交线同侧"张开"，则平面角为锐角；否则为钝角。',
  },
  line_plane_angle: {
    1: '确定题目中的直线和目标平面，找出直线与平面的交点（若不相交则延长）。',
    2: '过直线上一点（非交点）作平面的垂线，连接垂足与交点，得到的线段即为直线在平面上的投影。',
    3: '直线与投影线所成的锐角即为线面角。线面角的范围是[0°, 90°]。',
    4: '利用公式：sinθ = 点到平面的距离 / 斜线段长度。或用向量法：sinθ = |方向向量·法向量|/(|方向向量|·|法向量|)。',
    5: '验证角度是否在[0°, 90°]范围内。若计算出的正弦值为负，说明方向取反，取绝对值即可。',
  },
  section: {
    1: '确定截平面经过的点或满足的条件。截面是平面与几何体各面的交线围成的多边形。',
    2: '利用"若一条直线上有两点在平面内，则该直线在平面内"的原理，找截面与棱的交点。',
    3: '依次连接各交点，形成闭合多边形。注意交线顺序，截面最多为六边形（正方体）。',
    4: '将截面多边形分解为三角形，利用坐标法或海伦公式计算面积。或直接使用向量叉积求多边形面积。',
  },
  volume: {
    1: '确定几何体类型和已知参数（底面边长、高、半径等）。不同的几何体使用不同的体积公式。',
    2: '计算底面积：正方形 S = a²；圆 S = πr²；三角形 S = (1/2)×底×高；正六边形 S = (3√3/2)a²。',
    3: '确定几何体的高：对于棱柱/圆柱，高为两底面距离；对于棱锥/圆锥，高为顶点到底面的垂线长度。',
    4: '代入体积公式：柱体 V = S底×h；锥体 V = (1/3)×S底×h；台体 V = (h/3)(S₁+S₂+√(S₁S₂))。',
    5: '检查单位是否一致（所有长度单位相同），数值是否合理（体积不能为负，锥体体积<等底等高柱体）。',
  },
  general: {
    1: '识别几何体类型（正方体/长方体/球/锥/柱/台等），提取题目中的已知数据。',
    2: '根据需要作辅助线、辅助平面，或将几何体放入坐标系中，使空间问题转化为可计算的形式。',
    3: '选择合适的公式和方法进行计算，写出完整的代入过程。',
    4: '整理计算结果，得出最终答案。回顾解题思路，确认每一步的数学依据。',
  },
}

const LOCAL_WHY: Record<string, Record<number, { intuition: string; math_reason: string }>> = {
  skew_lines: {
    1: { intuition: '两条异面直线不在同一平面，就像天花板和地板上各有一条线，不能直接量夹角。', math_reason: '角度的定义要求两条线共面。异面直线必须通过平移转化为共面直线后才能度量夹角。' },
    2: { intuition: '平移就像把一根筷子从一张桌子拿到另一张桌子上，方向不变。', math_reason: '平移是等距变换，保持线段的方向向量不变。因此平移后的直线与原直线平行，夹角不变。' },
    3: { intuition: '两条线交于一点后，就像时钟的两根指针，我们可以量它们之间的角度。', math_reason: '两条相交直线确定唯一平面。在该平面内可以使用平面几何方法（余弦定理）计算夹角。' },
    4: { intuition: '知道三角形的三条边，就能求出任何一个角——就像知道门的三边就知道门开的角度。', math_reason: '余弦定理是平面几何的基本定理，适用于任意三角形，已知三边即可求得任意内角。' },
    5: { intuition: '两条线之间的夹角习惯取较小的那个，就像你问路时别人会告诉你"往左转"而不是"往右转270度"。', math_reason: '异面直线夹角的数学定义规定其取值范围为(0°, 90°]，取两条直线所成角中的锐角或直角。' },
  },
  dihedral_angle: {
    1: { intuition: '想象一本打开的书，两个页面之间的张开角度就是二面角。', math_reason: '二面角是从一条直线（交线）出发的两个半平面所组成的图形，其大小由平面角唯一确定。' },
    2: { intuition: '要量两面墙之间的角度，可以在墙角处用直角尺分别贴紧两面墙来量。', math_reason: '由二面角的定义，过交线上同一点在两个半平面内作交线的垂线，这两条垂线的夹角即为二面角的平面角。' },
    4: { intuition: '法向量就像垂直于平面的"指针"，两个指针的夹角反映了两个平面的夹角。', math_reason: '两平面的夹角等于它们法向量夹角的补角（或相等）。通过向量点积可精确计算夹角大小。' },
  },
  line_plane_angle: {
    2: { intuition: '太阳照在一根棍子上，棍子在地上的影子就是它在水平面上的投影。', math_reason: '直线在平面上的投影是过直线上各点向平面作垂线，垂足构成的直线。线面角定义为直线与投影线的夹角。' },
    4: { intuition: '棍子越长、影子越短，说明棍子越接近垂直于地面——角度越大。', math_reason: '线面角的正弦等于点到平面的距离除以斜线段长度。向量法中通过方向向量与法向量的点积计算。' },
  },
  section: {
    2: { intuition: '就像用刀切豆腐，刀面与豆腐表面相交的痕迹就是截面与棱的交线。', math_reason: '若截平面经过一条棱上的两个点，则该棱完全在截面内。利用此性质可逐步确定截面边界。' },
  },
  volume: {
    3: { intuition: '柱体的高就像一摞硬币的高度，每层面积相同，总体积=底面积×层数。', math_reason: '锥体体积是等底等高柱体的1/3，可通过积分或祖暅原理证明。台体可看作大锥体减去小锥体。' },
  },
}

const LOCAL_STUCK: Record<string, Record<number, { misconception: string; correction: string }>> = {
  skew_lines: {
    1: { misconception: '学生以为"不相交"就是异面，忽略了平行线也不相交但不是异面。', correction: '异面直线必须同时满足：①不相交 ②不平行。在空间中两条直线只有三种关系：平行、相交、异面。' },
    2: { misconception: '学生不知道该往哪个方向平移，或者以为可以任意平移。', correction: '平移方向必须沿着几何体的棱或已知线段方向，使平移后的直线经过另一条直线上的某个顶点，便于后续计算。' },
    3: { misconception: '学生以为平移后直接看夹角就行，不需要构造三角形。', correction: '平移后两线相交，但还需要找到第三条边构成三角形，才能用余弦定理求角。第三边通常是连接两个已知顶点的线段。' },
    4: { misconception: '学生代入余弦定理时容易用错边，把邻边和对边搞混。', correction: '余弦定理：a² = b² + c² - 2bc·cosA，其中a是角A的对边。求夹角时，对边是"不构成该角的那条边"。' },
    5: { misconception: '学生直接输出余弦值作为答案，忽略了角度范围限制。', correction: '异面直线夹角的定义域是(0°, 90°]，余弦为负说明夹角>90°，应取补角（180°-所得角）得到锐角。' },
  },
  dihedral_angle: {
    2: { misconception: '学生不知道"在交线上取一点"取哪一点，以为任意点结果不同。', correction: '交线上任意一点作垂线得到的平面角都相等（等角定理），因此选择方便计算的点即可。' },
    4: { misconception: '学生直接用两平面法向量夹角作为二面角，没有考虑锐钝。', correction: '法向量夹角与二面角可能相等也可能互补，需要根据图形判断二面角是锐角还是钝角来调整。' },
  },
  line_plane_angle: {
    1: { misconception: '学生弄不清"哪条线"和"哪个面"，特别是当直线在平面外时。', correction: '线面角一定是直线和它在平面上的投影的夹角。首先要确定"直线和它的投影"。' },
  },
  volume: {
    2: { misconception: '学生忘记区分"底面积"是针对哪个面，或者用错底面公式。', correction: '底面积是垂直于高的那个面的面积。柱体/锥体的"高"是两底面（或顶点到底面）的垂直距离。' },
  },
}

// 通用兜底
for (const key of Object.keys(LOCAL_CONTENT)) {
  if (key === 'general') continue
  if (!LOCAL_WHY[key]) LOCAL_WHY[key] = {}
  if (!LOCAL_STUCK[key]) LOCAL_STUCK[key] = {}
}

const GENERAL_WHY: Record<number, { intuition: string; math_reason: string }> = {
  1: { intuition: '做题第一步先看清题目给了什么、问什么，就像出发前先看地图。', math_reason: '明确已知条件和求解目标是解题的前提。不同的几何体有不同的性质和公式。' },
  2: { intuition: '遇到复杂问题，先简化——加辅助线就像在迷宫中做标记。', math_reason: '辅助线将空间问题转化为平面问题，坐标系则提供代数化的计算工具。' },
  3: { intuition: '有了工具就可以算了，就像有了尺子就可以量长度。', math_reason: '代入已知数据，使用相应的几何公式或向量方法进行计算推导。' },
  4: { intuition: '算完要回头检查，就像做完饭要尝一尝咸淡。', math_reason: '验证结果的合理性和正确性，确保解题过程完整无误。' },
}

const GENERAL_STUCK: Record<number, { misconception: string; correction: string }> = {
  1: { misconception: '学生可能只关注数字忽略图形结构。', correction: '既要看清数值，也要理解几何体的空间结构特征。' },
  2: { misconception: '学生不知道作什么样的辅助线。', correction: '辅助线的目的是将未知转化为已知。空间问题→平面问题，这是基本原则。' },
  3: { misconception: '学生只套公式不理解原理。', correction: '公式要结合具体题目使用，理解每一步代入的意义。' },
  4: { misconception: '学生算完就觉得完事了。', correction: '最后一步要回顾题目问的是什么，确认答案完全回答了问题。' },
}

function generateLocalTemplateSteps(parsed: ParsedProblem): Step[] {
  const problemType = parsed.problemType || 'general'
  const schema = getSchema(problemType)

  const getContent = (stepNum: number): string =>
    LOCAL_CONTENT[problemType]?.[stepNum] || LOCAL_CONTENT.general?.[stepNum] || ''

  const getWhy = (stepNum: number): { intuition: string; math_reason: string } | undefined =>
    LOCAL_WHY[problemType]?.[stepNum] || GENERAL_WHY[stepNum]

  const getStuck = (stepNum: number): { misconception: string; correction: string } | undefined =>
    LOCAL_STUCK[problemType]?.[stepNum] || GENERAL_STUCK[stepNum]

  return schema.steps.map(entry => ({
    step: entry.step,
    title: entry.title,
    content: getContent(entry.step),
    type: entry.type,
    why: getWhy(entry.step),
    stuck: getStuck(entry.step),
  }))
}
