// ═══════════════════════════════════════════════════════
//  LabelMapper — 题目标签 ↔ 内部顶点索引映射
//
//  核心职责:
//    1. 将用户题目中的顶点标签（A₁,B₁,C₁,D₁）映射到
//       几何体内部索引（0-7 for cube）
//    2. 将用户命名的边（A₁B）转换为内部边 ID（EB）
//    3. 提供统一的显示标签数组
//
//  支持的命名体系:
//    - ABCD-EFGH（标准正方体/长方体）
//    - ABCD-A₁B₁C₁D₁（中国教材常见）
//    - A₁B₁C₁D₁-A₂B₂C₂D₂（扩展命名）
//    - PQRST（自定义命名）
//    - P-ABCD（棱锥）
// ═══════════════════════════════════════════════════════

/**
 * 几何体类型 → 内部标准标签
 * 这些是几何引擎内部使用的固定标签体系
 */
export const INTERNAL_LABELS = {
  cube: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  cuboid: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  pyramid: ['A', 'B', 'C', 'D', 'P'],
  prism: ['A', 'B', 'C', "A'", "B'", "C'"],
  squareFrustum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  tetrahedron: ['A', 'B', 'C', 'D'],
  octahedron: ['T', 'R', 'F', 'L', 'B', 'D'],
  sphere: ['S', 'N', 'E', 'W', 'F', 'B'],
  cylinder: ['O', "O'", 'A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"],
  cone: ['O', 'P', 'A', 'B', 'C', 'D'],
  circularFrustum: ['O', "O'", 'A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"],
}

/**
 * Unicode 下标数字映射
 * A₁ → A1,  B₂ → B2,  C₃ → C3,  D₄ → D4
 */
const SUBSCRIPT_MAP = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3',
  '₄': '4', '₅': '5', '₆': '6', '₇': '7',
  '₈': '8', '₉': '9',
}

/**
 * 将 Unicode 下标转为普通数字后缀
 * "A₁B₁C₁D₁" → "A1B1C1D1"
 * "A₁B" → "A1B"
 */
export function normalizeSubscripts(label) {
  return label.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, ch => SUBSCRIPT_MAP[ch] || ch)
}

/**
 * 将普通后缀转为 Unicode 下标（显示用）
 * "A1" → "A₁"
 */
export function toSubscriptDisplay(label) {
  return label.replace(/([A-Za-z])(\d+)/g, (_, letter, digits) => {
    const sub = digits.split('').map(d => {
      const num = parseInt(d, 10)
      return String.fromCharCode(0x2080 + num)
    }).join('')
    return letter + sub
  })
}

/**
 * 创建标签映射
 *
 * @param {string[]} userLabels — 题目中使用的标签（如 ["A","B","C","D","A1","B1","C1","D1"]）
 * @param {string[]} internalLabels — 几何体内部标准标签（如 ["A","B","C","D","E","F","G","H"]）
 * @returns {Object} 映射对象
 */
export function createLabelMap(userLabels, internalLabels) {
  if (!userLabels || !internalLabels) {
    return createIdentityMap(internalLabels)
  }

  const labelToIndex = {}
  const indexToLabel = {}
  const displayLabels = userLabels.map(l => toSubscriptDisplay(l))

  // 建立 userLabel → internalIndex 映射
  // 按位置对应: userLabels[i] → internalLabels[i]
  const len = Math.min(userLabels.length, internalLabels.length)
  for (let i = 0; i < len; i++) {
    const ul = userLabels[i]
    const il = internalLabels[i]
    labelToIndex[ul] = i
    indexToLabel[i] = ul
  }

  // 对于 userLabels 超出 internalLabels 的部分，也记录
  for (let i = internalLabels.length; i < userLabels.length; i++) {
    labelToIndex[userLabels[i]] = i
    indexToLabel[i] = userLabels[i]
  }

  // 生成边映射：userEdge → internalEdge
  // 如 "A1B" → "EB"（A₁→索引4=E, B→索引1=B）
  const edgeMap = {}

  // 从 internalLabels 提取所有已知的内部边
  const internalSet = new Set(internalLabels)

  return {
    labelToIndex,    // { A:0, B:1, C:2, D:3, A1:4, B1:5, C1:6, D1:7 }
    indexToLabel,    // { 0:"A", 1:"B", 2:"C", 3:"D", 4:"A1", 5:"B1", 6:"C1", 7:"D1" }
    displayLabels,   // ["A","B","C","D","A₁","B₁","C₁","D₁"]
    internalLabels,  // 原始内部标签
    userLabels,      // 原始用户标签
  }
}

/**
 * 创建恒等映射（userLabels === internalLabels）
 */
function createIdentityMap(labels) {
  if (!labels) return null
  const labelToIndex = {}
  labels.forEach((l, i) => { labelToIndex[l] = i })
  return {
    labelToIndex,
    indexToLabel: Object.fromEntries(labels.map((l, i) => [i, l])),
    displayLabels: labels,
    internalLabels: labels,
    userLabels: labels,
  }
}

/**
 * 将用户命名的边解析为内部边 ID
 *
 * @param {string} userEdge — 用户命名的边（如 "A1B", "B1C", "AB"）
 * @param {Object} labelMap — createLabelMap 的输出
 * @returns {string|null} 内部边 ID（如 "EB"），或 null 无法解析
 */
export function resolveEdge(userEdge, labelMap) {
  if (!labelMap || !userEdge || userEdge.length < 2) return null

  // 直接匹配内部边
  if (labelMap.internalLabels.includes(userEdge)) return userEdge

  // 将用户标签分段解析
  // 支持 "A1B" → 解析为 ["A1", "B"] 或 ["A", "1B"]
  // 规则：从前往后匹配最长的已知标签
  const tokens = tokenizeEdge(userEdge, labelMap)
  if (!tokens || tokens.length < 2) return null

  const [from, to] = tokens
  const fromIdx = labelMap.labelToIndex[from]
  const toIdx = labelMap.labelToIndex[to]

  if (fromIdx === undefined || toIdx === undefined) return null

  // 解析为内部边
  const internalFrom = labelMap.internalLabels[fromIdx]
  const internalTo = labelMap.internalLabels[toIdx]
  if (!internalFrom || !internalTo) return null

  // 尝试两种顺序
  const edge1 = internalFrom + internalTo
  const edge2 = internalTo + internalFrom
  // 返回按字母排序的（因为内部边通常按此约定）
  return internalFrom < internalTo ? edge1 : edge2
}

/**
 * 将用户边字符串分割为两个标签 token
 * "A1B" → ["A1", "B"]
 * "AB" → ["A", "B"]
 * "B1C" → ["B1", "C"]
 * "A'B'" → ["A'", "B'"]
 */
function tokenizeEdge(edge, labelMap) {
  const labels = Object.keys(labelMap.labelToIndex)
  // 按长度降序排列（优先匹配长标签如 "A1" 而非 "A"）
  const sorted = [...labels].sort((a, b) => b.length - a.length)

  // 从位置0开始匹配
  for (const first of sorted) {
    if (edge.startsWith(first)) {
      const rest = edge.slice(first.length)
      if (rest.length === 0) continue
      // 在剩余部分匹配第二个标签
      for (const second of sorted) {
        if (rest === second) {
          return [first, second]
        }
      }
      // 如果剩余部分只有一个字符且存在于标签中
      if (rest.length === 1 && labels.includes(rest)) {
        return [first, rest]
      }
    }
  }

  // 回退：两个字符各算一个
  if (edge.length === 2) {
    const [a, b] = edge.split('')
    if (labels.includes(a) && labels.includes(b)) {
      return [a, b]
    }
  }

  return null
}

/**
 * 从题目文本中提取顶点标签模式
 * "正方体 ABCD-A₁B₁C₁D₁" → ["A","B","C","D","A1","B1","C1","D1"]
 *
 * @param {string} text — 题目文本
 * @returns {string[]|null} 提取的标签数组，失败返回 null
 */
export function extractVerticesFromText(text) {
  if (!text) return null

  // 模式1: "ABCD-A₁B₁C₁D₁" 或 "ABCD-EFGH"
  // 匹配字母序列（含Unicode下标）
  const pattern1 = /([A-Z](?:[₁₂₃₄₅₆₇₈₉₀]|')?)+-([A-Z](?:[₁₂₃₄₅₆₇₈₉₀]|')?)+/g
  const match = pattern1.exec(text)
  if (match) {
    const full = match[0].replace(/-/g, '')
    const normalized = normalizeSubscripts(full)
    // 分割成单个标签
    const labels = splitIntoLabels(normalized)
    if (labels && labels.length > 0) return labels
  }

  // 模式2: "P-ABCD"（棱锥）
  const pattern2 = /([A-Z])-([A-Z]{2,4})/g
  const match2 = pattern2.exec(text)
  if (match2) {
    const [, apex, base] = match2
    const baseLabels = base.split('')
    if (apex && baseLabels.length >= 3) {
      return [...baseLabels, apex]
    }
  }

  // 模式3: 散装标签（通过题目语境推断）
  // 如 "正方体ABCD-A₁B₁C₁D₁" 无空格
  const pattern3 = /正方体\s*([A-Z]+)/g
  const match3 = pattern3.exec(text)
  if (match3) {
    return match3[1].split('')
  }

  return null
}

/**
 * 将连续的标签字符串分割为单个标签
 * "ABCDA1B1C1D1" → ["A","B","C","D","A1","B1","C1","D1"]
 * "ABCDEFGH" → ["A","B","C","D","E","F","G","H"]
 * "ABCDP" → ["A","B","C","D","P"]
 */
function splitIntoLabels(str) {
  if (!str) return null
  const labels = []
  let i = 0
  while (i < str.length) {
    const ch = str[i]
    if (/[A-Za-z]/.test(ch)) {
      // 检查后面是否有数字（下标转换后的数字）
      if (i + 1 < str.length && /\d/.test(str[i + 1])) {
        labels.push(ch + str[i + 1])
        i += 2
      } else {
        labels.push(ch)
        i += 1
      }
    } else {
      i += 1 // 跳过未知字符
    }
  }
  return labels.length > 0 ? labels : null
}

/**
 * 快速检测用户顶点标签与内部标签是否兼容
 * 如果不兼容，返回建议的修复
 */
export function validateLabels(userLabels, internalLabels) {
  if (!userLabels || !internalLabels) {
    return { valid: false, warning: '缺少标签数据' }
  }

  if (userLabels.length !== internalLabels.length) {
    return {
      valid: false,
      warning: `标签数量不匹配：用户${userLabels.length}个，内部${internalLabels.length}个`,
    }
  }

  // 检查重复标签
  const seen = new Set()
  for (const l of userLabels) {
    if (seen.has(l)) {
      return { valid: false, warning: `重复标签: ${l}` }
    }
    seen.add(l)
  }

  return { valid: true, warning: null }
}
