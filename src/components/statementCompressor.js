/**
 * Mathematical Statement Compressor（仅展示层）
 * 将连续同类数学结论压缩为教材写法；不修改 ProofStep / 推理引擎。
 */

/** 点 / 线段 / 平面名：A、A'、AB、ABCD */
const NAME = String.raw`[A-Z][A-Z0-9']*`

/**
 * 教材化数学符号转换规则（按序应用，幂等）。
 * 仅作用于展示文本；未命中的模式保留原文。
 */
const TEXTBOOK_REWRITES = [
  // 平面交线长句 → 符号表达
  [
    /平面\s*([A-Z][A-Z0-9']*)\s*与\s*平面\s*([A-Z][A-Z0-9']*)\s*有公共点[^，。]*[，,]?\s*故交线为\s*([A-Z][A-Z0-9']*)\s*。?/g,
    '平面$1∩平面$2=$3',
  ],
  [/三角形\s*([A-Z][A-Z0-9']{2})\s*相似于\s*三角形\s*([A-Z][A-Z0-9']{2})/g, '△$1∽△$2'],
  [/三角形\s*([A-Z][A-Z0-9']{2})\s*全等于\s*三角形\s*([A-Z][A-Z0-9']{2})/g, '△$1≅△$2'],
  [/三角形/g, '△'],
  [/角\s*([A-Z][A-Z0-9']{2})\s*等于\s*角\s*([A-Z][A-Z0-9']{2})/g, '∠$1=∠$2'],
  [/角([A-Z][A-Z0-9']{2})/g, '∠$1'],
  [/全等于/g, '≅'],
  [/相似于/g, '∽'],
  [/平行于/g, '∥'],
  [/垂直于/g, '⊥'],
  [/属于/g, '∈'],
  [/等于/g, '='],
  // 自然语言位置 → ∈
  [/([A-Z][A-Z0-9']*)\s*在(?:线段|直线|棱)\s*([A-Z][A-Z0-9']*)\s*上/g, '$1∈$2'],
  [/([A-Z][A-Z0-9']*)\s*在平面\s*([A-Z][A-Z0-9']*)\s*(?:上|内)/g, '$1∈平面$2'],
  // 比例冒号与等号
  [/(?<=[A-Z0-9])\s*:\s*(?=[A-Z0-9])/g, '∶'],
  [/(?<=[A-Z0-9])\s*=\s*(?=[A-Z0-9])/g, '='],
  // 全角等号 / 旧全等号 → 规范符号
  [/＝/g, '='],
  [/≌/g, '≅'],
]

/**
 * 将任意展示文本转换为教材数学符号写法。
 * ∈∥ 两侧保留空格；「平面/直线 + 名」之间留空格。
 * @param {string} text
 * @returns {string}
 */
export function toTextbookMath(text) {
  if (!text || typeof text !== 'string') return text ?? ''
  let out = text
  for (const [pattern, replacement] of TEXTBOOK_REWRITES) {
    out = out.replace(pattern, replacement)
  }
  // 平面名 / 直线名：平面 ABCD、直线 PA（不拆「平面归属」等中文词）
  out = out.replace(/平面\s*([A-Z][A-Z0-9']*)/g, '平面 $1')
  out = out.replace(/直线\s*([A-Z][A-Z0-9']*)/g, '直线 $1')
  // 关系符教材间距
  out = out.replace(/\s*([∈∥⊥])\s*/g, ' $1 ')
  out = out.replace(/\s*([∩∽≅=])\s*/g, '$1')
  return out.replace(/[ \t]{2,}/g, ' ').trim()
}

/**
 * 清洗单条结论：教材符号 + 去掉句首∵∴与句末句号。
 */
export function cleanStatement(text) {
  if (!text || typeof text !== 'string') return ''
  let t = text.trim()
  t = t.replace(/^(得到|由此可知|由此可得|可知|于是|故)[：:]\s*/u, '')
  t = toTextbookMath(t)
  t = t.replace(/^[∵∴]+\s*/u, '')
  t = t.replace(/[。．.]+$/u, '')
  return t.trim()
}

/**
 * @returns {{ type: string, [key: string]: any }}
 */
export function parseStatement(text) {
  const raw = cleanStatement(text)
  if (!raw) return { type: 'unknown', raw: '' }

  // ⑤ 比例：含比号/分数比，不压缩
  if (
    /[∶:]/.test(raw)
    || /(?:^|[^A-Z])([A-Z][A-Z0-9']*)\s*\/\s*([A-Z][A-Z0-9']*)/.test(raw)
  ) {
    return { type: 'ratio', raw }
  }

  // ⑥ 角：不压缩
  if (/∠/.test(raw)) {
    return { type: 'angle', raw }
  }

  // ① 点 ∈ 平面XXX
  const plane = raw.match(new RegExp(`^(${NAME})\\s*∈\\s*平面\\s*(${NAME})$`))
  if (plane) {
    return { type: 'plane_membership', point: plane[1], plane: plane[2], withPlaneWord: true }
  }

  // ①′ / ②：点 ∈ 直线l 或 ∈名
  const lineWord = raw.match(new RegExp(`^(${NAME})\\s*∈\\s*直线\\s*(${NAME})$`))
  if (lineWord) {
    return { type: 'line_membership', point: lineWord[1], line: lineWord[2] }
  }
  const mem = raw.match(new RegExp(`^(${NAME})\\s*∈\\s*(${NAME})$`))
  if (mem) {
    const target = mem[2]
    if (target.length <= 2) {
      return { type: 'line_membership', point: mem[1], line: target }
    }
    return { type: 'plane_membership', point: mem[1], plane: target, withPlaneWord: false }
  }

  // ④ 平行（整句仅为平行关系）
  const par = raw.match(new RegExp(`^(${NAME})\\s*∥\\s*(.+)$`))
  if (par && !/[，,]/.test(raw)) {
    const right = par[2].trim().replace(/\s+/g, '').replace(/^平面/, '平面')
    if (right && !/[∵∴]/.test(right)) {
      return { type: 'parallel', raw: `${par[1]}∥${right}` }
    }
  }

  // ③ 简单等式 AB=CD
  const eq = raw.match(new RegExp(`^(${NAME})\\s*=\\s*(${NAME})$`))
  if (eq) {
    return { type: 'equality', left: eq[1], right: eq[2] }
  }

  return { type: 'unknown', raw }
}

function uniqueInOrder(items) {
  const out = []
  for (const x of items) {
    if (!out.includes(x)) out.push(x)
  }
  return out
}

function compressPlaneMembership(parsed) {
  const plane = parsed[0].plane
  if (!parsed.every((p) => p.type === 'plane_membership' && p.plane === plane)) {
    return null
  }
  const points = uniqueInOrder(parsed.map((p) => p.point))
  const shown = points.length > MERGE_SHOW_LIMIT ? points.slice(0, MERGE_SHOW_LIMIT) : points
  const line = `${shown.join('、')} ∈ 平面 ${plane}`
  if (points.length > MERGE_SHOW_LIMIT) {
    return `${line}\n还有 ${points.length - MERGE_SHOW_LIMIT} 项同类结论`
  }
  return line
}

function compressLineMembership(parsed) {
  const line = parsed[0].line
  if (!parsed.every((p) => p.type === 'line_membership' && p.line === line)) {
    return null
  }
  const points = uniqueInOrder(parsed.map((p) => p.point))
  const shown = points.length > MERGE_SHOW_LIMIT ? points.slice(0, MERGE_SHOW_LIMIT) : points
  const text = `${shown.join('、')} ∈ 直线 ${line}`
  if (points.length > MERGE_SHOW_LIMIT) {
    return `${text}\n还有 ${points.length - MERGE_SHOW_LIMIT} 项同类结论`
  }
  return text
}

/** 模式4：等式保持原样，不链式合并 */
function compressEqualities(parsed) {
  if (!parsed.every((p) => p.type === 'equality')) return null
  return parsed.map((p) => `${p.left}=${p.right}`).join('\n')
}

function compressParallels(parsed) {
  if (!parsed.every((p) => p.type === 'parallel')) return null
  // 同平面平行 → 归纳；否则分行
  const planeRe = new RegExp(`^(${NAME})∥平面\\s*(${NAME})$`)
  const planes = parsed.map((p) => {
    const m = p.raw.match(planeRe)
    return m ? { line: m[1], plane: m[2] } : null
  })
  if (planes.every(Boolean) && planes.every((x) => x.plane === planes[0].plane)) {
    const lines = uniqueInOrder(planes.map((x) => x.line))
    return `${lines.join('、')} ∥ 平面 ${planes[0].plane}`
  }
  return parsed.map((p) => p.raw.replace(/\s*∥\s*/g, ' ∥ ').replace(/平面\s*/g, '平面 ')).join('\n')
}

const MERGE_SHOW_LIMIT = 7
const MERGE_COLLAPSE_THRESHOLD = 8

/** 无法识别时：直接列数学语句，无引导语、无 bullet */
function formatFallback(texts) {
  const cleaned = texts.map(cleanStatement).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]

  const total = cleaned.length
  const overflow = total > MERGE_COLLAPSE_THRESHOLD
  const shown = overflow ? cleaned.slice(0, MERGE_SHOW_LIMIT) : cleaned
  const lines = [...shown]
  if (overflow) {
    lines.push('……')
    lines.push(`还有 ${total - MERGE_SHOW_LIMIT} 项同类结论`)
  }
  return lines.join('\n')
}

/**
 * 压缩多条展示用数学结论。
 * @param {string[]} texts
 * @returns {string}
 */
export function compressStatements(texts = []) {
  if (!Array.isArray(texts) || texts.length === 0) return ''

  const parsed = texts.map(parseStatement)

  if (parsed.length === 1) {
    return parsed[0].raw || cleanStatement(texts[0])
  }

  // ⑤⑥ 比例 / 角：不合并
  if (parsed.every((p) => p.type === 'ratio' || p.type === 'angle')) {
    return formatFallback(texts)
  }

  const plane = compressPlaneMembership(parsed)
  if (plane) return plane

  const line = compressLineMembership(parsed)
  if (line) return line

  const eqs = compressEqualities(parsed)
  if (eqs) return eqs

  const pars = compressParallels(parsed)
  if (pars) return pars

  // ⑦ 无法识别：保持展示（仅符号清洗，不做语义替换）
  return formatFallback(texts)
}
