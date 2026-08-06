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
const FLASH_MODEL = 'deepseek-v4-flash'
const PRO_MODEL = 'deepseek-v4-pro'

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
  /** V4：解题推理开启 thinking；解析/轻量任务可关 */
  thinking?: boolean
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
          ...(options.thinking
            ? { thinking: { type: 'enabled' }, reasoning_effort: 'high' }
            : {}),
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
            // V4 thinking / 旧 reasoner：reasoning_content 一并流式输出
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
  thinking?: boolean
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
          ...(options.thinking
            ? { thinking: { type: 'enabled' }, reasoning_effort: 'high' }
            : {}),
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
//  OCR — 题目图片 → 题干文字 + 构图 hint（图只辅助，文字为准）
// ═══════════════════════════════════════════════════════

export interface VisionHints {
  /** 与前端 extractRelations 同格式，如 "E midpoint PD" */
  relations?: string[]
  points?: string[]
  planes?: string[]
}

export interface OcrResult {
  text: string
  visionHints?: VisionHints
}

const OCR_SYSTEM_PROMPT = `你是中学试题 OCR 助手。用户上传题目照片/截图，科目可能是数学、物理、化学等。

只识别文字，禁止解题、改写、补全或套用任何例题模板。

输出严格 JSON（不要 markdown 代码块）：
{
  "text": "完整题干纯文本（含选项与(1)(2)小问），保留 ⊥、∥、√、π、分数与物理量符号",
  "visionHints": {
    "relations": [],
    "points": [],
    "planes": []
  }
}

rules:
1. text 必须以卷面可见文字为准；看不清就省略，禁止编造卷面没有的句子。
2. 物理题照录 B、l、k、v、磁场、射出 等原文；不要改成立体几何题。
3. 仅当图中有立体几何点线面关系时，才往 visionHints.relations 写英文短短语（如 "E midpoint PD"、"PA perpendicular plane ABCD"）；否则 visionHints 用空对象。
4. 禁止输出与输入图无关的模板题干。`

/** 规范化视觉 OCR 模型输出 → OcrResult（失败时绝不把整段 JSON 当题干） */
function normalizeOcrPayload(raw: string): OcrResult {
  let cleaned = String(raw || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (!cleaned) throw new Error('未能识别出文字，请手动补全题干')

  const pickHints = (vh: any): VisionHints | undefined => {
    if (!vh || typeof vh !== 'object') return undefined
    return {
      relations: Array.isArray(vh.relations)
        ? vh.relations.filter((r: unknown) => typeof r === 'string')
        : undefined,
      points: Array.isArray(vh.points)
        ? vh.points.filter((p: unknown) => typeof p === 'string')
        : undefined,
      planes: Array.isArray(vh.planes)
        ? vh.planes.filter((p: unknown) => typeof p === 'string')
        : undefined,
    }
  }

  const fromObj = (obj: any): OcrResult | null => {
    if (!obj || typeof obj !== 'object') return null
    if (typeof obj.text !== 'string' || !obj.text.trim()) return null
    return { text: obj.text.trim(), visionHints: pickHints(obj.visionHints) }
  }

  // 1) 直接 JSON.parse
  try {
    const hit = fromObj(JSON.parse(cleaned))
    if (hit) return hit
  } catch { /* continue */ }

  // 2) 从混杂文本中抽出顶层 {...}
  try {
    const hit = fromObj(extractJSON(cleaned))
    if (hit) return hit
  } catch { /* continue */ }

  // 3) 仍是 JSON 外壳但解析失败：尽量抠 "text":"..." 字段，避免把 visionHints 显示进搜索框
  if (/^\s*\{/.test(cleaned) && /"text"\s*:/.test(cleaned)) {
    const m = cleaned.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/)
    if (m?.[1]) {
      const text = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim()
      if (text) return { text }
    }
    console.warn('[ocr] JSON 外壳无法完整解析，已拒绝把原始 JSON 写入题干')
    throw new Error('识图结果格式异常，请重试或手动输入题干')
  }

  return { text: cleaned }
}

/**
 * 拆分「总述 + (1)(2)…」小问，避免多小问证明串题。
 */
export function splitSubProblems(text: string): {
  stem: string
  parts: { id: string; text: string }[]
} {
  const src = (text || '').trim()
  if (!src) return { stem: '', parts: [] }

  // 匹配小问起点：(1) （1） 1、 1. １．
  const markerRe =
    /(?:^|[\n\r；;。])\s*([(（]?\s*[1-9１-９]\s*[)）、.．:：])/g
  const starts: { index: number; label: string }[] = []
  let m: RegExpExecArray | null
  while ((m = markerRe.exec(src)) !== null) {
    const label = m[1]
    const index = m.index + m[0].length - label.length
    // 跳过题号如「16.」若后面不是求证/求/若（弱启发）：仍收录，靠「至少 2 段」过滤
    starts.push({ index, label })
  }

  // 去重相近起点
  const uniq: { index: number; label: string }[] = []
  for (const s of starts) {
    if (uniq.length && s.index - uniq[uniq.length - 1].index < 2) continue
    uniq.push(s)
  }

  if (uniq.length < 2) {
    return { stem: src, parts: [] }
  }

  const stem = src.slice(0, uniq[0].index).trim()
  const parts = uniq.map((s, i) => {
    const end = i + 1 < uniq.length ? uniq[i + 1].index : src.length
    const chunk = src.slice(s.index, end).trim()
    const raw = (s.label.match(/[1-9１-９]/) || ['1'])[0]
    const id =
      raw >= '１' && raw <= '９'
        ? String(raw.charCodeAt(0) - '０'.charCodeAt(0))
        : raw
    return { id, text: chunk }
  })

  return { stem, parts }
}

function buildReasonUserPrompt(text: string, parsed: ParsedProblem): string {
  const { stem, parts } = splitSubProblems(text)
  const base = `题目：${text}\n\n几何体类型：${parsed.type}\n已知参数：${JSON.stringify({
    size: parsed.size,
    labels: parsed.labels,
    highlightLines: parsed.highlightLines,
    extraParams: parsed.extraParams,
  })}`

  if (parts.length === 0) {
    return `${base}\n\n请为这道题生成分步解题讲解。`
  }

  const list = parts.map((p) => `(${p.id}) ${p.text}`).join('\n')
  return `${base}

本题含 ${parts.length} 个小问，必须分开作答，禁止串题：
【总述/已知】${stem || '（见题干前半）'}
【小问】
${list}

要求：
1. 先写共用已知与构图（observation），再按 (1)(2)… 分别证明/计算
2. 属于某小问的步骤 title 必须以「(1)」「(2)」等形式开头
3. 每个 step 增加 "part" 字段：0=共用，1/2/…=对应小问编号
4. 不要把后一小问的结论写进前一小问；每个小问结束有 conclusion`
}


async function extractWithGemini(dataUrl: string, userId?: string): Promise<OcrResult> {
  const key = env.GEMINI_API_KEY
  if (!key) throw new Error('NO_GEMINI')

  const pure = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const mime = (dataUrl.match(/^data:(image\/[\w+]+);/) || [])[1] || 'image/jpeg'
  const model = process.env.GEMINI_OCR_MODEL || 'gemini-2.0-flash'
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: OCR_SYSTEM_PROMPT + '\n\n请按 JSON 提取题干与 visionHints：' },
            { inline_data: { mime_type: mime, data: pure } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = (errBody as any)?.error?.message || `Gemini OCR 失败 (${response.status})`
    throw new Error(msg)
  }

  const data = await response.json()
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p.text || '')
    .join('')
    .trim()
  if (!text) throw new Error('未能识别出文字')
  if (userId) trackCost(userId, model, 800, Math.ceil(text.length / 4))
  return normalizeOcrPayload(text)
}

async function extractWithOpenAICompatibleVision(
  dataUrl: string,
  userId?: string
): Promise<OcrResult> {
  const presets: Record<string, { base: string; model: string }> = {
    // 通义千问 VL（国内好申请）https://dashscope.console.aliyun.com/
    qwen: {
      base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-vl-plus',
    },
    // 智谱 GLM-4V（有免费额度）https://open.bigmodel.cn/
    zhipu: {
      base: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4v-flash',
    },
    // OpenAI
    openai: {
      base: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
    // 硅基流动（可跑多模态开源模型）https://cloud.siliconflow.cn/
    siliconflow: {
      base: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen2.5-VL-32B-Instruct',
    },
    // Moonshot / Kimi
    moonshot: {
      base: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k-vision-preview',
    },
  }

  const provider = env.VISION_PROVIDER
  const preset = provider ? presets[provider] : undefined
  const apiKey = env.VISION_API_KEY
  if (!apiKey) throw new Error('NO_VISION')

  const base = (env.VISION_API_BASE || preset?.base || '').replace(/\/$/, '')
  const model = env.VISION_API_MODEL || preset?.model || ''
  if (!base || !model) {
    throw new Error(
      '请设置 VISION_PROVIDER（qwen/zhipu/openai/siliconflow/moonshot），或同时设置 VISION_API_BASE + VISION_API_MODEL'
    )
  }

  // 智谱 GLM-4V：image_url.url 要纯 base64，不要 data:image/...;base64, 前缀
  let imageUrl = dataUrl
  if (provider === 'zhipu' || /glm-4v/i.test(model)) {
    imageUrl = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
  }

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: OCR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请按 JSON 提取完整题干 text 与构图 visionHints：' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      // 智谱 glm-4v 等上限 1024
      max_tokens: 1024,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    throw new Error(
      (errBody as any)?.error?.message ||
        `视觉 OCR 失败 (${response.status}, ${provider || 'custom'})`
    )
  }

  const data = await response.json()
  const text = (data?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('未能识别出文字，请手动补全题干')
  const tokensIn = data?.usage?.prompt_tokens || 0
  const tokensOut = data?.usage?.completion_tokens || 0
  if (userId) trackCost(userId, model, tokensIn, tokensOut)
  return normalizeOcrPayload(text)
}

async function extractWithDeepSeekVision(dataUrl: string, userId?: string): Promise<OcrResult> {
  if (!env.DEEPSEEK_API_KEY) throw new Error('NO_DEEPSEEK')
  const visionModel = process.env.DEEPSEEK_VISION_MODEL || ''
  if (!visionModel) {
    throw new Error('NO_DEEPSEEK_VISION')
  }

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: visionModel,
      messages: [
        { role: 'system', content: OCR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请按 JSON 提取完整题干 text 与构图 visionHints：' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1200,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    throw new Error((errBody as any)?.error?.message || `OCR 失败 (${response.status})`)
  }

  const data = await response.json()
  const text = (data?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('未能识别出文字，请手动补全题干')
  const tokensIn = data?.usage?.prompt_tokens || 0
  const tokensOut = data?.usage?.completion_tokens || 0
  if (userId) trackCost(userId, visionModel, tokensIn, tokensOut)
  return normalizeOcrPayload(text)
}

export async function extractProblemFromImage(
  imageBase64: string,
  userId?: string
): Promise<OcrResult> {
  if (!imageBase64 || imageBase64.length < 32) {
    throw new Error('图片无效')
  }

  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`

  const errors: string[] = []

  // 1) OpenAI 兼容视觉（通义 / 智谱 / OpenAI / 硅基流动…）
  if (env.VISION_API_KEY) {
    try {
      return await extractWithOpenAICompatibleVision(dataUrl, userId)
    } catch (err: any) {
      if (err?.message !== 'NO_VISION') {
        console.warn('[ocr] vision-compat failed:', err?.message)
        errors.push(err?.message || 'vision-compat')
      }
    }
  }

  // 2) Gemini
  if (env.GEMINI_API_KEY) {
    try {
      return await extractWithGemini(dataUrl, userId)
    } catch (err: any) {
      if (err?.message !== 'NO_GEMINI') {
        console.warn('[ocr] Gemini failed:', err?.message)
        errors.push(err?.message || 'gemini')
      }
    }
  }

  // 3) DeepSeek 显式视觉模型
  try {
    return await extractWithDeepSeekVision(dataUrl, userId)
  } catch (err: any) {
    if (err?.message !== 'NO_DEEPSEEK' && err?.message !== 'NO_DEEPSEEK_VISION') {
      console.warn('[ocr] DeepSeek vision failed:', err?.message)
      errors.push(err?.message || 'deepseek-vision')
    }
  }

  throw new Error(
    errors[0] ||
      '未配置识图 AI。请在 server/.env 设置 VISION_PROVIDER=zhipu（或 qwen）和 VISION_API_KEY'
  )
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
7. 单小问 4-6 步；多小问时共用条件 1-2 步 + 每小问 3-5 步，总步数可超过 6
8. 若题含 (1)(2)…：必须按小问分段，title 以「(1)」「(2)」开头，step.part=小问号（共用为 0），禁止把不同小问的证明混在同一段
9. 先输出 [REASON] 前缀的推理过程，再输出 JSON 对象`

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

  console.log('  🧠 AI reason: calling DeepSeek V4 Pro...')

  const prompt = buildReasonUserPrompt(text, parsed)

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: PRO_MODEL,
    system: REASON_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 8192,
    temperature: 0.3,
    thinking: true,
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

    // Layer 2: Stream AI Reasoning（多小问时按 part 拆分提示）
    const prompt = buildReasonUserPrompt(text, parsed)

    let fullResponse = ''
    for await (const chunk of callDeepSeekStream({
      model: PRO_MODEL,
      system: REASON_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 8192,
      temperature: 0.3,
      thinking: true,
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

    // Parse final JSON from response（兼容 steps 数组 或 { steps, finalAnswer }）
    const parsedOut = extractJSON(fullResponse)
    const rawSteps = Array.isArray(parsedOut)
      ? parsedOut
      : Array.isArray(parsedOut?.steps)
        ? parsedOut.steps
        : []
    const steps = rawSteps.map((s: any, i: number) => ({
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

    // Cache the result
    const normalized2 = normalizeText(text)
    cache.set(`reason_${hashText(normalized2)}`, steps)

    if (userId) {
      trackCost(userId, PRO_MODEL, 0, fullResponse.length) // approximate token count
    }

    yield { type: 'done', data: { parsed, steps, finalAnswer: parsedOut?.finalAnswer ?? null } }
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

// ═══════════════════════════════════════════════════════
//  ExplainIR — 排组/概率 · 导数 · 圆锥曲线（Flash JSON）
// ═══════════════════════════════════════════════════════

const EXPLAIN_TOPIC_HINT: Record<string, string> = {
  combo:
    '排列组合与概率。重点讲清「为什么乘/加、有序还是无序」。problemType 用 multiply_add | perm_comb | classical_prob。',
  derivative:
    '导数。重点拆计算步骤与易错点（求导、切线、单调性）。problemType 用 deriv_poly | deriv_tangent | deriv_mono 或自拟短名。',
  conic:
    '圆锥曲线。重点认 a,b,c 与公式（椭圆减、双曲线加）。problemType 用 ellipse_e | hyper_focus | circle_r 或自拟短名。',
  physics:
    '高中物理力学。重点拆清公式选用与代入（匀变速、F=ma、功）。problemType 用 phys_kinematic | phys_newton | phys_work 或自拟短名。',
}

/**
 * 生成与前端 LogicIR / ExplainIR 同形的步骤+思路树 JSON
 */
export async function generateExplainIR(
  problemText: string,
  topic: 'combo' | 'derivative' | 'conic' | 'physics',
  _userId?: string
): Promise<Record<string, unknown>> {
  const cacheKey = hashText(`explain:${topic}:` + normalizeText(problemText))
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const system = `你是高中数学老师。只输出一个 JSON 对象，不要 markdown，不要其它文字。
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

  cache.set(cacheKey, ir)
  return ir
}
