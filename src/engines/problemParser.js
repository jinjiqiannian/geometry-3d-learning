// ═══════════════════════════════════════════════════════
//  AI 题目解析引擎 — 文字题目 + 拍照 → 结构化几何数据
// ═══════════════════════════════════════════════════════

import { extractVerticesFromText, normalizeSubscripts } from './labelMapper'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

// ── 几何题解析 System Prompt ─────────────────────────
const PARSE_SYSTEM_PROMPT = `你是一个中学立体几何题目解析器。用户输入一道几何题的文字描述，你提取所有几何信息。

严格输出以下 JSON 格式（不要输出其他内容，不要用 markdown 代码块包裹）：

{
  "type": "cube|sphere|cylinder|cone|pyramid|prism",
  "size": 数字（边长/半径，题目未给出则默认2）,
  "labels": ["题目中使用的顶点标签，按标准顺序排列"],
  "highlightLines": [{"from": "A", "to": "C", "label": "AC", "reason": "题目要求"}],
  "annotations": [{"text": "已知条件", "position": "bottom|top|left|right"}],
  "explanation": "一句话概述你理解的题目内容"
}

规则：
1. type 只能是: cube（正方体）、sphere（球体）、cylinder（圆柱）、cone（圆锥）、pyramid（棱锥/四棱锥）、prism（棱柱/三棱柱）
2. size 从题目数字中提取（如"棱长为3"→size=3，"半径为2"→size=2），找不到用2
3. labels 用题目中实际使用的字母标注（如 ABCD-EFGH 表示正方体8个顶点）
4. highlightLines 是题目中提到的关键线段（要求计算的、已知长度的、需要证明的）
5. 如果识别不出任何几何体，type 用 "unknown" 并在 explanation 中说明原因
6. 只输出 JSON，不要有任何解释文字`

// ── 图片识别 System Prompt ───────────────────────────
const IMAGE_SYSTEM_PROMPT = `你是一个几何题图片识别器。请识别图片中的几何题目文字内容。

要求：
1. 先完整抄录图片中的所有文字（包括中文、数学符号、字母标注）
2. 如果图片中有几何图形，描述图形的形状和标注
3. 如果图片中没有几何题，请明确说明

输出格式：
{
  "hasProblem": true/false,
  "problemText": "题目完整文字内容",
  "figureDescription": "图形描述",
  "error": null 或 "错误原因"
}`

// ═══════════════════════════════════════════════════════
//  核心函数
// ═══════════════════════════════════════════════════════

/**
 * 调用 Anthropic API
 * @param {Object} options
 * @param {string} options.system - 系统提示
 * @param {string} options.message - 用户消息
 * @param {Array} [options.images] - base64 图片数组
 * @param {string} options.apiKey - API 密钥
 * @returns {Promise<Object>} API 响应 JSON
 */
async function callClaude({ system, message, images, apiKey }) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('请先设置 API Key')
  }

  const content = []

  // 如果有图片，先添加图片
  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType || 'image/jpeg',
          data: img.data,
        },
      })
    }
  }

  // 添加文字消息
  content.push({ type: 'text', text: message })

  const body = {
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content }],
  }

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('API Key 无效，请检查后重试')
    }
    if (response.status === 429) {
      throw new Error('请求过于频繁，请稍后重试')
    }
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`)
  }

  const data = await response.json()
  return data
}

/**
 * 从 API 响应中提取文本内容
 */
function extractText(response) {
  if (!response.content || response.content.length === 0) {
    throw new Error('AI 未返回任何内容')
  }
  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock) {
    throw new Error('AI 返回格式异常')
  }
  return textBlock.text
}

// ═══════════════════════════════════════════════════════
//  公开 API
// ═══════════════════════════════════════════════════════

/**
 * 解析文字题目，返回结构化几何数据
 * @param {string} text - 用户输入的中文几何题
 * @param {string} apiKey - Anthropic API 密钥
 * @returns {Promise<{type:string, size:number, labels:string[], highlightLines:Array, annotations:Array, explanation:string}>}
 */
export async function parseProblem(text, apiKey) {
  if (!text || text.trim().length < 3) {
    throw new Error('请输入至少3个字的题目描述')
  }

  const trimmed = text.trim()

  // 先尝试本地关键词匹配（快速路径，不消耗 API）
  const quickResult = quickMatch(trimmed)
  if (quickResult && quickResult.confidence >= 0.9) {
    return quickResult
  }

  // 调用 Claude API 解析
  const response = await callClaude({
    system: PARSE_SYSTEM_PROMPT,
    message: `请解析以下几何题目：\n\n${trimmed}`,
    apiKey,
  })

  const rawText = extractText(response)
  return parseResponse(rawText)
}

/**
 * 解析拍照图片，识别题目文字
 * @param {string} base64Data - 图片 base64 编码（不含 data:xxx;base64, 前缀）
 * @param {string} mediaType - 图片 MIME 类型（如 image/jpeg）
 * @param {string} apiKey - Anthropic API 密钥
 * @returns {Promise<{hasProblem:boolean, problemText:string, figureDescription:string}>}
 */
export async function parseImage(base64Data, mediaType, apiKey) {
  if (!base64Data) {
    throw new Error('请先拍摄或选择图片')
  }

  const response = await callClaude({
    system: IMAGE_SYSTEM_PROMPT,
    message: '请识别这张图片中的几何题目。',
    images: [{ data: base64Data, mediaType: mediaType || 'image/jpeg' }],
    apiKey,
  })

  const rawText = extractText(response)
  const result = parseResponse(rawText)

  if (!result.hasProblem) {
    throw new Error(result.error || '图片中未识别到几何题目')
  }

  return result
}

/**
 * 先识别图片文字，再解析为几何数据（组合调用）
 * @param {string} base64Data - 图片 base64
 * @param {string} mediaType - 图片类型
 * @param {string} apiKey - API 密钥
 * @returns {Promise<Object>} 与 parseProblem 相同的返回格式
 */
export async function parseImageToGeometry(base64Data, mediaType, apiKey) {
  // 第一步：识别图片中的题目文字
  const imageResult = await parseImage(base64Data, mediaType, apiKey)

  if (!imageResult.hasProblem || !imageResult.problemText) {
    throw new Error('未能从图片中识别出几何题目')
  }

  // 第二步：用识别的文字生成几何数据
  return parseProblem(imageResult.problemText, apiKey)
}

// ═══════════════════════════════════════════════════════
//  辅助函数
// ═══════════════════════════════════════════════════════

/**
 * 解析 AI 返回的文本，提取 JSON
 */
function parseResponse(text) {
  // 尝试直接解析
  let cleaned = text.trim()

  // 去掉可能的 markdown 代码块标记
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // 尝试提取第一个 { 到最后一个 } 之间的内容
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
      } catch (e2) {
        // 继续向下
      }
    }

    throw new Error('AI 返回格式无法解析，请重试。原始返回：' + text.slice(0, 200))
  }
}

/**
 * 本地快速关键词匹配（减少不必要的 API 调用）
 * 返回 null 表示无法匹配，需要调用 API
 */
export function quickMatch(text) {
  const t = text.toLowerCase()

  // ── 检测问题子类型 ──
  function detectSubType(text, type) {
    if (/二面角|dihedral/.test(text)) return 'dihedral_angle'
    if (/线面角|直线.*(?:与|和).*(?:平面|面).*(?:所成|的)角/.test(text)) return 'line_plane_angle'
    if (/异面|skew|异面直线/.test(text) && type === 'cube') return 'skew_lines'
    if (/点.*到.*(?:平面|面).*距离|等体积法/.test(text)) return 'point_plane_distance'
    if (/对角线|diagonal/.test(text) && (type === 'cube' || type === 'cuboid')) return 'diagonal'
    if (/内接|内切|inscribed/.test(text)) return 'inscribed'
    if (/外接|外切|circumscribed/.test(text)) return 'circumscribed'
    if (/体积|volume/.test(text)) return 'volume'
    if (/截面|section/.test(text)) return 'section'
    if (/侧面积|侧面展开/.test(text)) return 'lateral_area'
    if (/母线|generatrix/.test(text)) return 'generatrix'
    if (/表面[积积]|表面|面积/.test(text)) return 'surface_area'
    if (/球冠|crown|spherical cap/.test(text)) return 'spherical_cap'
    if (/对棱/.test(text)) return 'opposite_edges'
    return 'general'
  }

  // ── 边名提取（通用，支持Unicode下标） ──
  function extractEdgeRefs(text) {
    const lines = []
    const seen = new Set()

    // 模式1: 关键词后跟边名（如 "异面直线 A₁B 与 B₁C"）
    const pattern1 = /(?:对角线|异面直线|线段|求|求长|计算|证明|夹角|与|等于|=|已知)\s*([A-Za-z][₀₁₂₃₄₅₆₇₈₉'ᵢ]*(?:[A-Za-z][₀₁₂₃₄₅₆₇₈₉'ᵢ]*)?)/g
    let m
    while ((m = pattern1.exec(text)) !== null) {
      const raw = m[1].replace(/\s/g, '')
      const normalized = normalizeSubscripts(raw)
      if (normalized.length >= 2 && !seen.has(normalized)) {
        seen.add(normalized)
        // 标签，尝试分割：A₁B → 找出前缀和后缀
        const tokens = splitEdgeTokens(normalized)
        if (tokens) {
          lines.push({ from: tokens[0], to: tokens[1], label: normalized, reason: '题目提及' })
        }
      }
    }

    // 模式2: 通用相邻字母对（回退）
    if (lines.length === 0) {
      const pattern2 = /([A-Za-z])[₀₁₂₃₄₅₆₇₈₉]*([A-Za-z])/g
      while ((m = pattern2.exec(text)) !== null) {
        const a = normalizeSubscripts(m[1])
        const b = normalizeSubscripts(m[2])
        const label = a + b
        if (!seen.has(label)) {
          seen.add(label)
          lines.push({ from: a, to: b, label, reason: '题目提及' })
        }
      }
    }

    return lines

    // 辅助：将规范化边名分割为两个 token
    // "A1B" → ["A1", "B"], "AB" → ["A", "B"], "B1C" → ["B1", "C"]
    function splitEdgeTokens(s) {
      if (s.length < 2) return null
      // 尝试匹配首字符+数字（如A1）作为第一个 token
      if (s.length >= 3 && /\d/.test(s[1])) {
        return [s[0] + s[1], s.slice(2)]
      }
      // 简单两个字符
      if (s.length === 2) {
        return [s[0], s[1]]
      }
      return null
    }
  }

  // 正方体
  const cubeMatch = t.match(/正方体|立方体|cube/)
  if (cubeMatch) {
    const sizeMatch = t.match(/棱长[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2

    // 从题目文本提取实际顶点标签（支持 A₁B₁C₁D₁ 等命名）
    const extractedLabels = extractVerticesFromText(text)
    let labels = extractedLabels || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    let confidence = 0.6
    let vertices = labels // 顶点列表

    if (extractedLabels) {
      confidence = 0.85
    }
    if (sizeMatch) confidence = 0.9

    const highlightLines = extractEdgeRefs(text)

    return {
      type: 'cube',
      size,
      subType: detectSubType(text, 'cube'),
      labels,          // 显示用标签（含Unicode下标 A₁）
      vertices,        // 顶点列表（规范化形式 A1）
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `正方体，棱长 ${size}`
        : '正方体（参数来自快速匹配）',
      confidence,
    }
  }

  // 球体
  const sphereMatch = t.match(/球体|球|sphere/)
  if (sphereMatch) {
    const sizeMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2
    return {
      type: 'sphere',
      size,
      subType: detectSubType(text, 'sphere'),
      labels: ['N', 'S', 'E', 'W', 'F', 'B'],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: sizeMatch ? `球体，半径 ${size}` : '球体（参数来自快速匹配）',
      confidence: sizeMatch ? 0.9 : 0.6,
    }
  }

  // 圆柱
  const cylinderMatch = t.match(/圆柱|cylinder/)
  if (cylinderMatch) {
    const rMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/)
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = rMatch ? parseFloat(rMatch[1]) : 2
    return {
      type: 'cylinder',
      size,
      subType: detectSubType(text, 'cylinder'),
      labels: ['O', "O'", 'A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"],
      highlightLines: [],
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 2 },
      annotations: hMatch ? [{ text: `高=${parseFloat(hMatch[1])}`, position: 'right' }] : [],
      explanation: `圆柱，半径 ${size}` + (hMatch ? `，高 ${parseFloat(hMatch[1])}` : ''),
      confidence: rMatch ? 0.85 : 0.6,
    }
  }

  // 圆锥
  const coneMatch = t.match(/圆锥|cone/)
  if (coneMatch) {
    const rMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = rMatch ? parseFloat(rMatch[1]) : 2
    return {
      type: 'cone',
      size,
      subType: detectSubType(text, 'cone'),
      labels: ['O', 'P', 'A', 'B', 'C', 'D'],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: rMatch ? `圆锥，半径 ${size}` : '圆锥（参数来自快速匹配）',
      confidence: rMatch ? 0.85 : 0.6,
    }
  }

  // 棱锥/四棱锥
  const pyramidMatch = t.match(/棱锥|四棱锥|pyramid/)
  if (pyramidMatch) {
    const sizeMatch = t.match(/边长[为是]?\s*(\d+(?:\.\d+)?)/)
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2
    return {
      type: 'pyramid',
      size,
      subType: detectSubType(text, 'pyramid'),
      labels: ['A', 'B', 'C', 'D', 'P'],
      highlightLines: [],
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 1.5 },
      annotations: [],
      explanation: sizeMatch ? `正四棱锥，底面边长 ${size}` : '正四棱锥（参数来自快速匹配）',
      confidence: sizeMatch ? 0.85 : 0.6,
    }
  }

  // 棱柱/三棱柱
  const prismMatch = t.match(/棱柱|三棱柱|prism/)
  if (prismMatch) {
    const sizeMatch = t.match(/(?:棱长|边长)[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2
    return {
      type: 'prism',
      size,
      subType: detectSubType(text, 'prism'),
      labels: ['A', 'B', 'C', "A'", "B'", "C'"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: sizeMatch ? `直角三棱柱，边长 ${size}` : '直角三棱柱（参数来自快速匹配）',
      confidence: sizeMatch ? 0.85 : 0.6,
    }
  }

  // 长方体
  const cuboidMatch = t.match(/长方体|cuboid/)
  if (cuboidMatch) {
    const sizeMatch = t.match(/(?:棱长[为是]?|长[为是]?)\s*(\d+(?:\.\d+)?)/)
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2

    const extractedLabels = extractVerticesFromText(text)
    const labels = extractedLabels || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    const highlightLines = extractEdgeRefs(text)
    return {
      type: 'cuboid',
      size,
      subType: detectSubType(text, 'cuboid'),
      labels,
      vertices: labels,
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch ? `长方体，棱长 ${size}` : '长方体（参数来自快速匹配）',
      confidence: 0.85,
    }
  }

  // 正四面体
  const tetraMatch = t.match(/正四面体|四面体|tetrahedron/)
  if (tetraMatch) {
    const sizeMatch = t.match(/(?:棱长|边长)[为是]?\s*(\d+(?:\.\d+)?)/)
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2

    const extractedLabels = extractVerticesFromText(text)
    const labels = extractedLabels || ['A', 'B', 'C', 'D']

    const highlightLines = extractEdgeRefs(text)
    return {
      type: 'tetrahedron',
      size,
      subType: detectSubType(text, 'tetrahedron'),
      labels,
      vertices: labels,
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch ? `正四面体，棱长 ${size}` : '正四面体（参数来自快速匹配）',
      confidence: sizeMatch ? 0.9 : 0.75,
    }
  }

  return null // 需要 API 解析
}

/**
 * 验证 API Key 是否有效
 * @param {string} apiKey
 * @returns {Promise<{valid:boolean, error?:string}>}
 */
export async function validateApiKey(apiKey) {
  try {
    await callClaude({
      system: '回复 OK',
      message: 'ping',
      apiKey,
      max_tokens: 10,
    })
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e.message }
  }
}

/**
 * 预设示例题目（方便用户快速体验）
 */
export const EXAMPLE_PROBLEMS = [
  {
    title: '正方体对角线',
    text: '正方体ABCD-EFGH的棱长为2，求体对角线AG的长度。',
  },
  {
    title: '球体体积',
    text: '一个球体的半径为3，求它的体积和表面积。',
  },
  {
    title: '三棱柱高',
    text: '直角三棱柱ABC-A\'B\'C\'中，底面是边长为2的正三角形，求三棱柱的高。',
  },
  {
    title: '棱锥侧棱',
    text: '正四棱锥P-ABCD，底面正方形边长为2，高为3，求侧棱PA的长。',
  },
  {
    title: '圆柱截面',
    text: '圆柱的底面半径为2，高为4，过上下底面中心作截面，求截面面积。',
  },
  {
    title: '圆锥母线',
    text: '圆锥的底面半径为3，高为4，求母线长。',
  },
  {
    title: '异面直线夹角',
    text: '正方体ABCD-A₁B₁C₁D₁棱长为2，求异面直线A₁B与B₁C所成角的余弦值。',
  },
  {
    title: '二面角',
    text: '正方体ABCD-A₁B₁C₁D₁棱长为2，求平面A₁BD与平面ABCD所成二面角的余弦值。',
  },
  {
    title: '线面角',
    text: '正方体ABCD-A₁B₁C₁D₁棱长为1，求直线B₁D与平面ABCD所成角的正弦值。',
  },
  {
    title: '点面距离',
    text: '正方体ABCD-A₁B₁C₁D₁棱长为2，求点C到平面A₁BD的距离。',
  },
  {
    title: '外接球',
    text: '正方体ABCD-EFGH棱长为3，求其外接球的半径和表面积。',
  },
  {
    title: '内切球',
    text: '正方体棱长为6，求其内切球的半径和体积。',
  },
  {
    title: '圆台体积',
    text: '圆台上底面半径3，下底面半径5，高为4，求圆台的体积。',
  },
  {
    title: '球冠体积',
    text: '球体半径为5，用一个距球心3的平面截球，求球冠的体积。',
  },
]
