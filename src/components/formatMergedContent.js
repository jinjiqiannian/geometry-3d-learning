/**
 * UI Formatter：同谓词归纳显示（presentation layer only）
 * 不修改 ProofStep / Scheduler / Rule / Fact / Adapter。
 */

const NAME = String.raw`[A-Z][A-Z0-9']*`
/** 线段名：AB 或 A-B（引擎偶发用连字符） */
const LINE = String.raw`[A-Z][A-Z0-9']*(?:-[A-Z][A-Z0-9']*)*`
const SHOW_LIMIT = 7

function normalizeLineName(s) {
  return String(s ?? '').replace(/-/g, '')
}

/** 去掉 bullet / 引导语 / 规则→前缀 / 句首∵∴ / 句末句号，并统一关系词为符号 */
function stripDecorators(text) {
  if (!text || typeof text !== 'string') return ''
  let t = text.trim()
  t = t.replace(/^•\s*/, '')
  // 日志式引导语 → 去掉（展示层教材化）
  t = t.replace(/^(得到|由此可知|由此可得|可知|于是|故)[：:]\s*/u, '')
  // 「规则描述 → 结论」：标题已有规则名，只保留箭头后结论
  if (/→/.test(t)) {
    t = t.replace(/^[\s\S]*→\s*/, '')
  }
  t = t.replace(/^[∵∴]+\s*/u, '')
  t = t.replace(/[。．.]+$/u, '')
  // 直线 AB 在平面 X 内 / 上 → 直线AB∈平面X
  t = t.replace(
    new RegExp(`^直线\\s*(${LINE})\\s*在平面\\s*(${NAME})\\s*(?:上|内)$`),
    '直线$1∈平面$2',
  )
  // 自然语言位置 → 符号
  t = t.replace(new RegExp(`^(${NAME})\\s*在(?:线段|直线|棱)\\s*(${NAME})\\s*上`), '$1∈$2')
  t = t.replace(new RegExp(`^(${NAME})\\s*在\\s*(${NAME})\\s*上`), '$1∈$2')
  t = t.replace(new RegExp(`^(${NAME})\\s*在平面\\s*(${NAME})\\s*(?:上|内)`), '$1∈平面$2')
  // 中文关系词 → 符号（不做自然语言总结）
  t = t.replace(/属于/g, '∈')
  t = t.replace(/平行于/g, '∥')
  t = t.replace(/垂直于/g, '⊥')
  t = t.replace(/＝/g, '=')
  t = t.replace(/\s*([∈∥⊥=])\s*/g, '$1')
  return t.trim()
}

function uniqueInOrder(items) {
  const out = []
  for (const x of items) {
    if (!out.includes(x)) out.push(x)
  }
  return out
}

function formatWithOverflow(prefix, total) {
  if (total <= SHOW_LIMIT) return prefix
  return `${prefix}\n还有 ${total - SHOW_LIMIT} 项同类结论`
}

function takeShown(items) {
  return items.length > SHOW_LIMIT ? items.slice(0, SHOW_LIMIT) : items
}

/**
 * @returns {{ type: string, [k: string]: any } | null}
 */
function matchSimple(text) {
  const t = stripDecorators(text)
  if (!t) return null

  // 模式5：复杂证明句 —— 含「由…」「因为」「所以」或多子句，不处理
  if (
    /^(由|因为|由於|由于)/.test(t)
    || /所以|故(?!交线)/.test(t)
    || /[，,].*[∵∴]/.test(t)
    || (t.includes('∵') && t.includes('∴'))
  ) {
    return { type: 'complex', raw: t }
  }

  // 模式0：直线 l ∈ 平面 π（规则「直线在平面内」结论）
  const lineOnPlane = t.match(new RegExp(`^直线\\s*(${LINE})∈平面\\s*(${NAME})$`))
  if (lineOnPlane) {
    return {
      type: 'line_on_plane',
      line: normalizeLineName(lineOnPlane[1]),
      plane: lineOnPlane[2],
    }
  }

  // 模式1：X∈平面P
  const plane = t.match(new RegExp(`^(${NAME})∈平面\\s*(${NAME})$`))
  if (plane) {
    return { type: 'plane_in', point: plane[1], plane: plane[2] }
  }

  // 模式2：X∈直线l 或 X∈l（两字母线段）
  const lineWord = t.match(new RegExp(`^(${NAME})∈直线\\s*(${NAME})$`))
  if (lineWord) {
    return { type: 'line_in', point: lineWord[1], line: lineWord[2] }
  }
  const lineBare = t.match(new RegExp(`^(${NAME})∈(${NAME})$`))
  if (lineBare && lineBare[2].length <= 2) {
    return { type: 'line_in', point: lineBare[1], line: lineBare[2] }
  }
  // 三字母及以上无「平面」字时按平面名处理（如 PAC）
  if (lineBare && lineBare[2].length >= 3) {
    return { type: 'plane_in', point: lineBare[1], plane: lineBare[2] }
  }

  // 模式3：l∥平面π
  const parPlane = t.match(new RegExp(`^(${NAME})∥平面\\s*(${NAME})$`))
  if (parPlane) {
    return { type: 'parallel_plane', line: parPlane[1], plane: parPlane[2] }
  }

  // 模式4：AB=CD —— 识别但不归纳
  const eq = t.match(new RegExp(`^(${NAME})=(${NAME})$`))
  if (eq) {
    return { type: 'equality', raw: `${eq[1]}=${eq[2]}` }
  }

  // 其它简单平行（线∥线）—— 不归纳，原样
  const parLine = t.match(new RegExp(`^(${NAME})∥(${NAME})$`))
  if (parLine) {
    return { type: 'parallel_line', raw: `${parLine[1]}∥${parLine[2]}` }
  }

  return { type: 'other', raw: t }
}

/** 直线∈平面：按平面分组写成教材句 */
function compressLineOnPlane(items) {
  const byPlane = new Map()
  for (const x of items) {
    if (!byPlane.has(x.plane)) byPlane.set(x.plane, [])
    const list = byPlane.get(x.plane)
    if (!list.includes(x.line)) list.push(x.line)
  }
  const parts = []
  let truncated = 0
  for (const [plane, lines] of byPlane) {
    if (lines.length > SHOW_LIMIT) truncated += lines.length - SHOW_LIMIT
    parts.push(`${takeShown(lines).join('、')} ∈ 平面 ${plane}`)
  }
  const joined = parts.join('；')
  return truncated > 0 ? `${joined}\n还有 ${truncated} 项同类结论` : joined
}

/** 点∈平面：按平面分组写成教材句 */
function compressPlaneIn(items) {
  const byPlane = new Map()
  for (const x of items) {
    if (!byPlane.has(x.plane)) byPlane.set(x.plane, [])
    const list = byPlane.get(x.plane)
    if (!list.includes(x.point)) list.push(x.point)
  }
  const parts = []
  let truncated = 0
  for (const [plane, pts] of byPlane) {
    if (pts.length > SHOW_LIMIT) truncated += pts.length - SHOW_LIMIT
    parts.push(`${takeShown(pts).join('、')} ∈ 平面 ${plane}`)
  }
  const joined = parts.join('；')
  return truncated > 0 ? `${joined}\n还有 ${truncated} 项同类结论` : joined
}

/**
 * 对 merged card 内多条结论做同谓词归纳。
 * @param {string[]} contents
 * @returns {string}
 */
export function formatMergedContent(contents = []) {
  if (!Array.isArray(contents) || contents.length === 0) return ''

  const items = contents.map(matchSimple)

  // 规则→结论 清洗后若全部为直线∈平面，优先归纳（含去重）
  if (items.length > 0 && items.every((x) => x && x.type === 'line_on_plane')) {
    return compressLineOnPlane(items)
  }

  // 点∈平面：同构即可按平面分组（不必同一平面）
  if (items.length > 0 && items.every((x) => x && x.type === 'plane_in')) {
    return compressPlaneIn(items)
  }

  // 任一复杂句 / 无法全体同构 → 保持原样（逐行，不 AI 总结）
  if (items.some((x) => !x || x.type === 'complex' || x.type === 'other')) {
    return contents
      .map((c) => {
        let s = String(c ?? '').replace(/^•\s*/, '').trim()
        s = s.replace(/^(得到|由此可知|由此可得|可知|于是|故)[：:]\s*/u, '')
        // 合并卡内仍去掉重复规则前缀，只留结论
        if (/→/.test(s)) s = s.replace(/^[\s\S]*→\s*/, '')
        return s
      })
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .join('\n')
  }

  // 模式2：同直线归属
  if (items.every((x) => x.type === 'line_in')) {
    const line = items[0].line
    if (items.every((x) => x.line === line)) {
      const pts = uniqueInOrder(items.map((x) => x.point))
      const shown = takeShown(pts)
      return formatWithOverflow(`${shown.join('、')} ∈ 直线 ${line}`, pts.length)
    }
  }

  // 模式3：同平面平行
  if (items.every((x) => x.type === 'parallel_plane')) {
    const plane = items[0].plane
    if (items.every((x) => x.plane === plane)) {
      const lines = uniqueInOrder(items.map((x) => x.line))
      const shown = takeShown(lines)
      return formatWithOverflow(`${shown.join('、')} ∥ 平面 ${plane}`, lines.length)
    }
    // 不同平面：分行，不硬并
    return items.map((x) => `${x.line} ∥ 平面 ${x.plane}`).join('\n')
  }

  // 模式4：等式 —— 保持原样，不处理
  if (items.every((x) => x.type === 'equality')) {
    return items.map((x) => x.raw).join('\n')
  }

  // 线∥线等：保持原样
  if (items.every((x) => x.type === 'parallel_line')) {
    return items.map((x) => x.raw).join('\n')
  }

  return contents.map((c) => stripDecorators(c)).filter(Boolean).join('\n')
}
