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

// ── Streaming API Call ──────────────────────────────

interface DeepSeekStreamOptions {
  model: string
  system: string
  user: string
  maxTokens: number
  temperature?: number
}

/**
 * 流式调用 DeepSeek API
 * - 逐段 yield delta.content 字符串
 * - 最后 yield 一个特殊键 { _complete: true, text: 完整响应文本 }
 */
export async function* callDeepSeekStream(options: DeepSeekStreamOptions): AsyncGenerator<string | { _complete: true; text: string }> {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('AI引擎未配置：缺少 DEEPSEEK_API_KEY 环境变量')
  }

  let lastError: Error | null = null
  let fullText = ''

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
          stream: true,
        }),
      })

      if (response.status === 429) {
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

      const reader = response.body?.getReader()
      if (!reader) throw new Error('DeepSeek streaming response body is null')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (delta?.content) {
              fullText += delta.content
              yield delta.content
            }
            // 如果有 reasoning_content（deepseek-reasoner 模型），也 yield
            if ((delta as any)?.reasoning_content) {
              const rc = (delta as any).reasoning_content
              yield rc
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      // 处理 buffer 中剩余的最后一个 data 行
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6)
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (delta?.content) {
              fullText += delta.content
            }
          } catch { /* */ }
        }
      }

      // 流结束，返回完整文本
      yield { _complete: true, text: fullText }
      return
    } catch (err) {
      lastError = err as Error
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        console.warn(`DeepSeek stream call attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (err as Error).message)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  throw lastError || new Error('DeepSeek streaming call failed after retries')
}

// ── Core API Call ──────────────────────────────────

interface DeepSeekCallOptions {
  model: string
  system: string
  user: string
  maxTokens: number
  temperature?: number
}

export async function callDeepSeek(options: DeepSeekCallOptions): Promise<{
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

export function extractJSON(text: string): any {
  const originalText = text
  let cleaned = text.trim()

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch { /* continue */ }

  const jsonString = extractTopLevelJSON(cleaned)
  if (jsonString) {
    try {
      return JSON.parse(jsonString)
    } catch (parseErr: any) {
      console.error('❌ extractJSON 提取后解析失败:', {
        originalResponse: originalText.slice(0, 2000),
        extractedJSON: jsonString,
        error: parseErr.message,
      })
    }
  }

  console.error('❌ extractJSON 完全解析失败:', {
    originalResponse: originalText.slice(0, 2000),
    error: '无法找到有效的JSON对象或数组',
  })
  throw new Error(`无法解析AI返回的JSON格式。原始响应摘要: ${originalText.slice(0, 200)}`)
}

function extractTopLevelJSON(text: string): string | null {
  let braceDepth = 0
  let bracketDepth = 0
  let inString = false
  let escape = false
  let startIndex = -1
  let endIndex = -1
  let startChar = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (char === '\\' && inString) {
      escape = true
      continue
    }

    if (char === '"' && !escape) {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') {
      if (braceDepth === 0 && bracketDepth === 0 && startIndex === -1) {
        startIndex = i
        startChar = '{'
      }
      braceDepth++
    } else if (char === '}') {
      braceDepth--
      if (braceDepth === 0 && bracketDepth === 0 && startIndex !== -1 && startChar === '{') {
        endIndex = i
        break
      }
    } else if (char === '[') {
      let j = i + 1
      while (j < text.length && /\s/.test(text[j])) {
        j++
      }
      const nextNonWhitespaceChar = text[j]
      const looksLikeJSONArray = nextNonWhitespaceChar === '{' || nextNonWhitespaceChar === '[' || nextNonWhitespaceChar === '"' || /\d/.test(nextNonWhitespaceChar) || nextNonWhitespaceChar === ']'
      if (bracketDepth === 0 && braceDepth === 0 && startIndex === -1 && looksLikeJSONArray) {
        startIndex = i
        startChar = '['
      }
      bracketDepth++
    } else if (char === ']') {
      bracketDepth--
      if (bracketDepth === 0 && braceDepth === 0 && startIndex !== -1 && startChar === '[') {
        endIndex = i
        break
      }
    }
  }

  if (startIndex !== -1 && endIndex !== -1) {
    return text.slice(startIndex, endIndex + 1)
  }

  return null
}

export function testExtractJSON(): void {
  const tests = [
    {
      name: '纯JSON对象',
      input: '{"type":"pyramid","size":2,"labels":["A","B","C","D","P"]}',
      expected: { type: 'pyramid', size: 2, labels: ['A', 'B', 'C', 'D', 'P'] },
    },
    {
      name: '纯JSON数组',
      input: '[{"step":1,"title":"测试"},{"step":2,"title":"分析"}]',
      expected: [{ step: 1, title: '测试' }, { step: 2, title: '分析' }],
    },
    {
      name: 'Markdown代码块',
      input: '```json\n{"type":"cube","size":3}\n```',
      expected: { type: 'cube', size: 3 },
    },
    {
      name: 'Reason+JSON',
      input: '[REASON] 这是一道四棱锥题\n[REASON] 需要分析线面平行关系\n\n{"type":"pyramid","size":2}',
      expected: { type: 'pyramid', size: 2 },
    },
    {
      name: '文本+JSON',
      input: '以下是解题步骤：\n{"steps":[{"title":"第一步","content":"识别几何体"}]}',
      expected: { steps: [{ title: '第一步', content: '识别几何体' }] },
    },
    {
      name: 'JSON前后都有文本',
      input: '开始分析\n{"data":123}\n分析结束',
      expected: { data: 123 },
    },
    {
      name: '嵌套对象',
      input: '[{"type":"pyramid","highlightLines":[{"from":"A","to":"B"}]}]',
      expected: [{ type: 'pyramid', highlightLines: [{ from: 'A', to: 'B' }] }],
    },
    {
      name: '非法JSON（缺少闭合括号）',
      input: '{"type":"cube",',
      shouldFail: true,
    },
  ]

  let passed = 0
  let failed = 0

  tests.forEach((t) => {
    try {
      const result = extractJSON(t.input)
      if (t.shouldFail) {
        console.log('❌', t.name, '期望失败但成功了')
        failed++
      } else {
        const match = JSON.stringify(result) === JSON.stringify(t.expected)
        if (match) {
          console.log('✅', t.name)
          passed++
        } else {
          console.log('❌', t.name, '期望:', JSON.stringify(t.expected), '实际:', JSON.stringify(result))
          failed++
        }
      }
    } catch (e: any) {
      if (t.shouldFail) {
        console.log('✅', t.name, '(预期失败)')
        passed++
      } else {
        console.log('❌', t.name, '错误:', e.message)
        failed++
      }
    }
  })

  console.log('\n测试结果:', passed, '通过,', failed, '失败')
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
1. type 只能是以下值之一：
   - cube: 正方体、立方体
   - cuboid: 长方体
   - pyramid: 棱锥、四棱锥、三棱锥、五棱锥（识别关键词：棱锥、锥体、P-ABCD）
   - prism: 棱柱、三棱柱、四棱柱（识别关键词：棱柱、柱体、ABC-A1B1C1）
   - cylinder: 圆柱
   - cone: 圆锥
   - sphere: 球体、球
   - squareFrustum: 四棱台、棱台
   - circularFrustum: 圆台

2. 重点识别模式：
   - 四棱锥P-ABCD：底面为四边形ABCD，顶点为P → type=pyramid
   - 三棱锥P-ABC：底面为三角形ABC，顶点为P → type=pyramid
   - 正方体ABCD-A1B1C1D1：12个顶点 → type=cube
   - 长方体ABCD-A1B1C1D1：12个顶点 → type=cuboid
   - 棱柱ABC-A1B1C1：上下底面为全等多边形 → type=prism

3. size 从题目数字中提取（如"棱长为3"→size=3，"半径为2"→size=2），找不到用2
4. labels 用题目中实际使用的字母标注，按顶点出现顺序排列
5. highlightLines 是题目中提到的关键线段或需要计算的线段
6. extraParams 用于需要额外参数的几何体（如长方体的宽高、棱台的上底半径等）
7. explanation 必须准确描述题目内容和要求
8. 只输出 JSON，不要有任何解释文字`

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

const REASON_SYSTEM_PROMPT = `你是一个顶尖的中学数学老师，专门从事立体几何教学。你的任务是针对用户的具体题目，生成一步步的真实数学推导过程。

🚫 绝对禁止：通用模板、泛化描述、"使用公式计算"这类空洞的话。
✅ 必须做到：针对具体题目，写出每一步的数学表达式和计算结果。

解题策略：
1. 异面直线夹角问题：用平移法或向量法构造辅助线，写出具体计算过程
2. 线面平行问题（如 PC//平面BEF）：应用线面平行性质定理，找到交线EF，利用平行线分线段成比例定理
3. 体积计算问题：应用对应几何体的体积公式（V=⅓S底h 等）
4. 表面积计算问题：分别计算各个面的面积，注意侧面积公式

对于四棱锥线面平行问题（如 P-ABCD，PC//平面BEF）：
- 第1步：识别几何体，描述已知条件（四棱锥P-ABCD，底面为平行四边形）
- 第2步：应用线面平行性质定理，找到平面PAC与平面BEF的交线EF，则PC//EF
- 第3步：利用平行线分线段成比例定理，计算线段比例（如 AF:FP = AG:GC）
- 第4步：得出最终答案

重要！
在输出最终 JSON 之前，先用自然语言逐步思考解题过程，
每句话前加 [REASON] 前缀，方便前端逐句显示你的推理过程。
例如：
[REASON] 这道题是一个正方体，棱长为 2。
[REASON] 要求的是体对角线长度。
[REASON] 体对角线公式是 d = a√3。
[REASON] 代入 a=2 得 d = 2√3。
推理结束后，再输出严格 JSON 数组。

严格输出以下 JSON 对象（不要 markdown 代码块）：

{
  "steps": [
    {
      "step": 1,
      "title": "识别几何体",
      "content": "正方体ABCD-A₁B₁C₁D₁，棱长为2。要计算异面直线A₁B与B₁C夹角。",
      "type": "observation",
      "sceneState": {
        "cameraPosition": [5, 3, 5],
        "cameraTarget": [0, 0, 0],
        "highlightEdges": [],
        "highlightColor": "#4A90E2",
        "showAuxiliaryLines": [],
        "showLabels": ["A","B","C","D","A1","B1","C1","D1"],
        "annotations": [{"text": "正方体，棱长=2", "position": "bottom"}],
        "opacity": {"faces": 0.6, "nonHighlightedEdges": 0.8},
        "animationType": "fade",
        "duration": 2000
      }
    }
  ],
  "finalAnswer": {
    "expression": "d = a√3",
    "value": "2√3"
  }
}

严格要求：
1. content 必须包含具体顶点名称和数值，写入真实的数学表达式。例如 "A₁B = √(2²+2²) = 2√2" 而不是 "用勾股定理求线段长"
2. highlightEdges 用 [{from: "A1", to: "B"}] 格式指定高亮线段
3. showAuxiliaryLines 用 [{from: "A1", to: "C", dashed: true, color: "#4A90E2"}] 格式
4. finalAnswer 字段必须包含题目要求的最终答案，expression 是答案表达式，value 是答案数值
5. 如果题目要求的是比例（如 AP/AF），请根据推导结果计算出最终数值答案
6. type: observation=观察分析, construction=作图构造, calculation=计算推导, conclusion=结论
7. 4-6个步骤，计算步骤中写出完整算式
8. 先输出 [REASON] 前缀的推理过程，再输出 JSON 对象`

export interface ReasoningResult {
  steps: Step[]
  finalAnswer: {
    expression: string
    value: string
  } | null
}

export async function generateReasoning(
  text: string,
  parsed: ParsedProblem,
  userId?: string
): Promise<ReasoningResult> {
  const normalized = normalizeText(text)
  const cacheKey = `reason_${hashText(normalized)}`

  const cached = cache.get(cacheKey)
  if (cached) {
    console.log('  📦 AI reason: cache hit')
    return cached
  }

  console.log('  🧠 AI reason: calling DeepSeek Flash...')

  const prompt = `题目：${text}\n\n几何体类型：${parsed.type}\n已知参数：${JSON.stringify({ size: parsed.size, labels: parsed.labels, highlightLines: parsed.highlightLines, extraParams: parsed.extraParams })}\n\n请为这道题生成分步解题讲解。`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: REASON_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 4096,
    temperature: 0.3,
  })

  const response = extractJSON(responseText) as { steps?: Step[]; finalAnswer?: { expression: string; value: string } }

  if (!response || !Array.isArray(response.steps)) {
    console.error('AI reasoning: expected object with steps array but got:', typeof response)
    console.error('Raw response start:', responseText.slice(0, 500))
    throw new Error('AI推理返回格式错误：期望包含steps数组的对象')
  }

  const steps = response.steps.map((s, i) => ({
    step: s.step || i + 1,
    title: s.title || `步骤 ${i + 1}`,
    content: s.content || '',
    type: s.type || 'observation',
    sceneState: s.sceneState || undefined,
  }))

  const finalAnswer = response.finalAnswer || null

  const result = { steps, finalAnswer }

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
  finalAnswer?: {
    expression: string
    value: string
  } | null
}

/**
 * 流式一站式解题（SSE 用）
 * - 先解析题目（非流式）
 * - 再流式推理（逐段 yield）
 * - 最后 yield 完整结构化步骤
 */
export async function* solveCompleteStream(
  text: string,
  plan: 'free' | 'pro' | 'teacher',
  userId?: string
): AsyncGenerator<{
  type: 'parsed' | 'reasoning' | 'done' | 'error'
  data: any
}> {
  try {
    // Layer 1: Parse (non-streaming, always available)
    const parsed = await parseProblem(text, userId)
    yield { type: 'parsed', data: parsed }

    // ── Fast path: 简单计算题不走 AI 推理 ──
    if (isSimpleCompute(text)) {
      const steps = computeBasicAnswer(parsed, text)
      if (steps.length > 0) {
        yield { type: 'done', data: { parsed, steps } }
        return
      }
    }

    // Layer 2: Stream AI Reasoning
    const normalized = normalizeText(text)
    const prompt = `题目：${text}\n\n几何体类型：${parsed.type}\n已知参数：${JSON.stringify({ size: parsed.size, labels: parsed.labels, highlightLines: parsed.highlightLines, extraParams: parsed.extraParams })}\n\n请为这道题生成分步解题讲解。`

    let fullResponse = ''
    for await (const chunk of callDeepSeekStream({
      model: FLASH_MODEL,
      system: REASON_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 4096,
      temperature: 0.3,
    })) {
      if (typeof chunk === 'string') {
        fullResponse += chunk
        // 只 yield [REASON] 前缀的内容（推理过程）
        if (chunk.startsWith('[REASON]') || fullResponse.includes('[REASON]')) {
          yield { type: 'reasoning', data: chunk }
        }
      } else if (chunk._complete) {
        fullResponse = chunk.text
      }
    }

    // Parse final JSON from response
    // Find the JSON array — it starts after the reasoning section
    const parsedSteps = extractJSON(fullResponse)
    const steps = (Array.isArray(parsedSteps) ? parsedSteps : []).map((s: any, i: number) => ({
      step: s.step || i + 1,
      title: s.title || `步骤 ${i + 1}`,
      content: s.content || '',
      type: s.type || 'observation',
      sceneState: s.sceneState || undefined,
    }))

    // Cache the result
    const normalized2 = normalizeText(text)
    cache.set(`reason_${hashText(normalized2)}`, steps)

    if (userId) {
      trackCost(userId, FLASH_MODEL, 0, fullResponse.length) // approximate token count
    }

    yield { type: 'done', data: { parsed, steps } }
  } catch (err: any) {
    yield { type: 'error', data: { message: err.message || '推理失败' } }
  }
}

/**
 * 检测题目是否为简单计算题（不需要 AI 推理）
 */
function isSimpleCompute(text: string): boolean {
  const t = text.toLowerCase()
  const hasComplexReasoning = /异面|夹角|二面角|线面角|点.*到.*距离|截面|内切|外接|平行|\/\/|证明|对棱|母线/.test(t)
  const hasSimpleCompute = /体积|volume|表面积|surface|对角线|diagonal|侧面积/.test(t)
  return hasSimpleCompute && !hasComplexReasoning
}

export async function solveComplete(
  text: string,
  plan: 'free' | 'pro' | 'teacher',
  userId?: string
): Promise<CompleteSolution> {
  // Layer 1: Parse (always available)
  const parsed = await parseProblem(text, userId)

  // ── Fast path: 简单计算题不走 AI 推理 ──
  if (isSimpleCompute(text)) {
    const steps = computeBasicAnswer(parsed, text)
    if (steps.length > 0) {
      return { parsed, steps }
    }
  }

  // Layer 2: AI Reasoning — 仅复杂题走 AI
  const reasoningResult = await generateReasoning(text, parsed, userId)

  return { parsed, steps: reasoningResult.steps, finalAnswer: reasoningResult.finalAnswer }
}

/**
 * 简单计算题快速计算（不调 AI）
 * 适用：正方体/球/圆柱/圆锥/棱锥的体积/表面积/对角线
 */
function computeBasicAnswer(parsed: ParsedProblem, text: string): Step[] {
  const type = parsed.type || 'cube'
  const size = parsed.size || 2
  const t = text.toLowerCase()

  const isVolume = /体积|volume/.test(t)
  const isSurface = /表面[积积]|表面积|surface/.test(t)
  const isDiagonal = /对角线|diagonal/.test(t)
  const isLateral = /侧面积/.test(t)

  let height = size * 1.5
  const hMatch = text.match(/高[为是]?\s*(\d+(?:\.\d+)?)/)
  if (hMatch) height = parseFloat(hMatch[1])
  let radius = size
  const rMatch = text.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/)
  if (rMatch) radius = parseFloat(rMatch[1])

  const steps: Step[] = []

  if (type === 'cube') {
    const a = size
    if (isVolume) {
      const v = a * a * a
      steps.push({ step: 1, title: '识别正方体', content: `正方体棱长为 ${a}。体积公式 V = a³。`, type: 'observation' })
      steps.push({ step: 2, title: '计算体积', content: `V = ${a}³ = ${v}。答案：${v}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `正方体的体积为 ${v}。答案：${v}。`, type: 'conclusion' })
    } else if (isSurface) {
      const s = 6 * a * a
      steps.push({ step: 1, title: '识别正方体', content: `正方体棱长为 ${a}。表面积公式 S = 6a²。`, type: 'observation' })
      steps.push({ step: 2, title: '计算表面积', content: `S = 6 × ${a}² = ${s}。答案：${s}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `正方体的表面积为 ${s}。答案：${s}。`, type: 'conclusion' })
    } else if (isDiagonal) {
      const sd = a * Math.sqrt(3)
      steps.push({ step: 1, title: '识别正方体', content: `正方体棱长为 ${a}。体对角线公式 d = a√3。`, type: 'observation' })
      steps.push({ step: 2, title: '计算体对角线', content: `d = ${a} × √3 ≈ ${sd.toFixed(2)}。答案：${sd.toFixed(2)}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `正方体的体对角线长度为 ${sd.toFixed(2)}。答案：${sd.toFixed(2)}。`, type: 'conclusion' })
    }
  } else if (type === 'sphere') {
    const r = radius
    if (isVolume) {
      const v = (4 / 3) * Math.PI * r * r * r
      steps.push({ step: 1, title: '识别球体', content: `球体半径为 ${r}。体积公式 V = ⁴⁄₃πr³。`, type: 'observation' })
      steps.push({ step: 2, title: '计算体积', content: `V ≈ ${v.toFixed(2)}。答案：${v.toFixed(2)}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `球体的体积约为 ${v.toFixed(2)}。答案：${v.toFixed(2)}。`, type: 'conclusion' })
    } else if (isSurface) {
      const s = 4 * Math.PI * r * r
      steps.push({ step: 1, title: '识别球体', content: `球体半径为 ${r}。表面积公式 S = 4πr²。`, type: 'observation' })
      steps.push({ step: 2, title: '计算表面积', content: `S ≈ ${s.toFixed(2)}。答案：${s.toFixed(2)}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `球体的表面积约为 ${s.toFixed(2)}。答案：${s.toFixed(2)}。`, type: 'conclusion' })
    }
  } else if (type === 'cylinder') {
    const r = radius, h = height
    if (isVolume) {
      const v = Math.PI * r * r * h
      steps.push({ step: 1, title: '识别圆柱', content: `圆柱底面半径 ${r}，高 ${h}。体积公式 V = πr²h。`, type: 'observation' })
      steps.push({ step: 2, title: '计算体积', content: `V = ${r * r * h}π ≈ ${v.toFixed(2)}。答案：${v.toFixed(2)}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `圆柱的体积约为 ${v.toFixed(2)}。答案：${v.toFixed(2)}。`, type: 'conclusion' })
    } else if (isLateral) {
      const s = 2 * Math.PI * r * h
      steps.push({ step: 1, title: '识别圆柱', content: `圆柱底面半径 ${r}，高 ${h}。侧面积公式 S侧 = 2πrh。`, type: 'observation' })
      steps.push({ step: 2, title: '计算侧面积', content: `S侧 = ${2 * r * h}π ≈ ${s.toFixed(2)}。答案：${s.toFixed(2)}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `圆柱的侧面积约为 ${s.toFixed(2)}。答案：${s.toFixed(2)}。`, type: 'conclusion' })
    }
  } else if (type === 'cone') {
    const r = radius, h = height
    const l = Math.sqrt(r * r + h * h)
    if (isVolume) {
      const v = (1 / 3) * Math.PI * r * r * h
      steps.push({ step: 1, title: '识别圆锥', content: `圆锥底面半径 ${r}，高 ${h}。体积公式 V = ⅓πr²h。`, type: 'observation' })
      steps.push({ step: 2, title: '计算体积', content: `V ≈ ${v.toFixed(2)}。答案：${v.toFixed(2)}。`, type: 'calculation' })
      steps.push({ step: 3, title: '得出结论', content: `圆锥的体积约为 ${v.toFixed(2)}。答案：${v.toFixed(2)}。`, type: 'conclusion' })
    }
  } else if (type === 'pyramid') {
    if (isVolume) {
      const a = size, h = height
      const ba = a * a
      const v = (1 / 3) * ba * h
      steps.push({ step: 1, title: '识别棱锥', content: `棱锥底面边长 ${a}，高 ${h}。体积公式 V = ⅓S底h。`, type: 'observation' })
      steps.push({ step: 2, title: '计算底面积', content: `S底 = ${a}² = ${ba}。`, type: 'calculation' })
      steps.push({ step: 3, title: '计算体积', content: `V = ⅓ × ${ba} × ${h} = ${v}。答案：${v}。`, type: 'calculation' })
      steps.push({ step: 4, title: '得出结论', content: `棱锥的体积为 ${v}。答案：${v}。`, type: 'conclusion' })
    }
  }

  return steps
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
