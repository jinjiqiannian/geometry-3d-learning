// ═══════════════════════════════════════════════════════
//  线段定义系统 — 每种几何体的所有重要线段
//  id 格式: "顶点标签-顶点标签" 或 "名称"
// ═══════════════════════════════════════════════════════

/** 根据 size 参数计算所有顶点和参考点 */
function getPoints(type, params) {
  const { size = 2 } = params
  const s = size / 2

  switch (type) {
    case 'cube': {
      // 底面→顶面：ABCD 底面，EFGH 顶面
      const v = [
        [-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s],  // 0-3 底面
        [-s, s, -s], [s, s, -s], [s, s, s], [-s, s, s],        // 4-7 顶面
      ]
      const c = {
        body: [0, 0, 0],
        front: [0, 0, s], back: [0, 0, -s],
        left: [-s, 0, 0], right: [s, 0, 0],
        top: [0, s, 0], bottom: [0, -s, 0],
      }
      return { vertices: v, centers: c, labels: 'ABCDEFGH'.split('') }
    }

    case 'pyramid': {
      const v = [
        [-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s],
        [0, s, 0],
      ]
      const baseCenter = [0, -s, 0]
      const c = { body: [0, 0, 0], base: baseCenter, apex: [0, s, 0] }
      return { vertices: v, centers: c, labels: 'ABCDP'.split('') }
    }

    case 'prism': {
      const v = [
        [-s, -s, -s], [s, -s, -s], [-s, -s, s],
        [-s, s, -s], [s, s, -s], [-s, s, s],
      ]
      const c = {
        body: [-s / 3, 0, -s / 3],
        baseBottom: [-s / 3, -s, -s / 3],
        baseTop: [-s / 3, s, -s / 3],
      }
      return { vertices: v, centers: c, labels: "ABC A'B'C'".match(/[A-C]'?/g) }
    }

    case 'sphere': {
      const v = [
        [0, -s, 0], [0, s, 0], [s, 0, 0],
        [-s, 0, 0], [0, 0, s], [0, 0, -s],
      ]
      return { vertices: v, centers: { body: [0, 0, 0] }, labels: 'SNEWFB'.split('') }
    }

    case 'cylinder': {
      const v = [
        [0, -s, 0], [0, s, 0],
        [s, -s, 0], [-s, -s, 0], [0, -s, s], [0, -s, -s],
        [s, s, 0], [-s, s, 0], [0, s, s], [0, s, -s],
      ]
      return { vertices: v, centers: { body: [0, 0, 0], top: [0, s, 0], bottom: [0, -s, 0] },
        labels: "OO'ABCDA'B'C'D'".match(/[A-O]'?/g) }
    }

    case 'cone': {
      const v = [
        [0, -s, 0], [0, s, 0],
        [s, -s, 0], [-s, -s, 0], [0, -s, s], [0, -s, -s],
      ]
      return { vertices: v, centers: { base: [0, -s, 0], apex: [0, s, 0] },
        labels: 'OPABCD'.split('') }
    }

    case 'squareFrustum': {
      // 底面正方形(边长size) + 顶面正方形(边长size/2)，高=size，中心对齐
      const topS = s / 2
      const v = [
        [-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s],     // 底面 ABCD (0-3)
        [-topS, s, -topS], [topS, s, -topS], [topS, s, topS], [-topS, s, topS],  // 顶面 EFGH (4-7)
      ]
      const c = {
        body: [0, 0, 0],
        bottom: [0, -s, 0],
        top: [0, s, 0],
      }
      return { vertices: v, centers: c, labels: 'ABCDEFGH'.split('') }
    }

    case 'circularFrustum': {
      const v = [
        [0, -s, 0], [0, s, 0],                                     // O(0) 底面圆心, O'(1) 顶面圆心
        [s, -s, 0], [-s, -s, 0], [0, -s, s], [0, -s, -s],          // 底面标记 A-D (2-5)
        [s / 2, s, 0], [-s / 2, s, 0], [0, s, s / 2], [0, s, -s / 2],  // 顶面标记 A'-D' (6-9)
      ]
      return { vertices: v, centers: { body: [0, 0, 0], top: [0, s, 0], bottom: [0, -s, 0] },
        labels: "OO'ABCDA'B'C'D'".match(/[A-O]'?/g) }
    }

    default:
      return { vertices: [], centers: {}, labels: [] }
  }
}

// ── 线段定义工厂 ────────────────────────────────────

/**
 * 返回格式:
 * {
 *   points: { [label]: [x,y,z] },       // 所有顶点 + 参考点
 *   lines: [{ id, category, from, to, dashed?, label? }]
 * }
 */
export function getLineDefinitions(type, params) {
  const { size = 2 } = params
  const s = size / 2
  const pts = getPoints(type, params)
  const v = pts.vertices
  const L = pts.labels
  const lines = []

  const def = (id, category, from, to, dashed = false) =>
    lines.push({ id, category, from, to, dashed })

  switch (type) {

    // ─── 正方体（底面 ABCD → 顶面 EFGH）───
    case 'cube': {
      // 12 棱
      def('AB', '棱', 0, 1); def('BC', '棱', 1, 2)
      def('CD', '棱', 2, 3); def('DA', '棱', 3, 0)
      def('EF', '棱', 4, 5); def('FG', '棱', 5, 6)
      def('GH', '棱', 6, 7); def('HE', '棱', 7, 4)
      def('AE', '棱', 0, 4); def('BF', '棱', 1, 5)
      def('CG', '棱', 2, 6); def('DH', '棱', 3, 7)

      // 底面边
      def('AB', '底面边', 0, 1); def('BC', '底面边', 1, 2)
      def('CD', '底面边', 2, 3); def('DA', '底面边', 3, 0)
      // 顶面边
      def('EF', '顶面边', 4, 5); def('FG', '顶面边', 5, 6)
      def('GH', '顶面边', 6, 7); def('HE', '顶面边', 7, 4)
      // 侧棱
      def('AE', '侧棱', 0, 4); def('BF', '侧棱', 1, 5)
      def('CG', '侧棱', 2, 6); def('DH', '侧棱', 3, 7)

      // 面对角线（6面 × 2 = 12条）
      def('AC', '面对角线', 0, 2, true); def('BD', '面对角线', 1, 3, true)  // 底面
      def('EG', '面对角线', 4, 6, true); def('FH', '面对角线', 5, 7, true)  // 顶面
      def('AF', '面对角线', 0, 5, true); def('BE', '面对角线', 1, 4, true)  // 后面
      def('DG', '面对角线', 3, 6, true); def('CH', '面对角线', 2, 7, true)  // 前面
      def('AH', '面对角线', 0, 7, true); def('DE', '面对角线', 3, 4, true)  // 左面
      def('BG', '面对角线', 1, 6, true); def('CF', '面对角线', 2, 5, true)  // 右面

      // 空间对角线
      def('AG', '空间对角线', 0, 6, true); def('BH', '空间对角线', 1, 7, true)
      def('CE', '空间对角线', 2, 4, true); def('DF', '空间对角线', 3, 5, true)

      break
    }

    // ─── 正四棱锥 ───
    case 'pyramid': {
      // 底面边 4条
      def('AB', '底面边', 0, 1)
      def('BC', '底面边', 1, 2)
      def('CD', '底面边', 2, 3)
      def('DA', '底面边', 3, 0)
      // 侧棱 4条
      def('PA', '侧棱', 4, 0)
      def('PB', '侧棱', 4, 1)
      def('PC', '侧棱', 4, 2)
      def('PD', '侧棱', 4, 3)
      // 棱（全部）
      def('AB', '棱', 0, 1)
      def('BC', '棱', 1, 2)
      def('CD', '棱', 2, 3)
      def('DA', '棱', 3, 0)
      def('PA', '棱', 4, 0)
      def('PB', '棱', 4, 1)
      def('PC', '棱', 4, 2)
      def('PD', '棱', 4, 3)
      // 底面面对角线
      def('AC', '面对角线', 0, 2, true)
      def('BD', '面对角线', 1, 3, true)
      // 高线（P 到底面中心 O）
      def('PO', '高线', 4, 'base', true)
      break
    }

    // ─── 直角三棱柱 ───
    case 'prism': {
      // 底面边
      def('AB', '底面边', 0, 1)
      def('BC', '底面边', 1, 2)
      def('CA', '底面边', 2, 0)
      // 顶面边
      def("A'B'", '顶面边', 3, 4)
      def("B'C'", '顶面边', 4, 5)
      def("C'A'", '顶面边', 5, 3)
      // 侧棱
      def("AA'", '侧棱', 0, 3)
      def("BB'", '侧棱', 1, 4)
      def("CC'", '侧棱', 2, 5)
      // 棱（全部9条）
      def('AB', '棱', 0, 1)
      def('BC', '棱', 1, 2)
      def('CA', '棱', 2, 0)
      def("A'B'", '棱', 3, 4)
      def("B'C'", '棱', 4, 5)
      def("C'A'", '棱', 5, 3)
      def("AA'", '棱', 0, 3)
      def("BB'", '棱', 1, 4)
      def("CC'", '棱', 2, 5)
      // 高线：底面中心 → 顶面中心
      def('h1', '高线', 'baseBottom', 'baseTop', true)
      break
    }

    // ─── 球体 ───
    case 'sphere': {
      def('NS', '高线', 1, 0)      // 南北极轴
      def('EW', '高线', 3, 2, true) // 赤道直径
      def('FB', '高线', 5, 4, true) // 前后直径
      def('NO', '辅助构造线', 1, 'body', true)
      def('SO', '辅助构造线', 0, 'body', true)
      break
    }

    // ─── 圆柱 ───
    case 'cylinder': {
      def("OO'", '高线', 0, 1, true)     // 中心轴
      def('h1', '侧棱', 2, 6, true)      // 右母线
      def('h2', '侧棱', 3, 7, true)      // 左母线
      break
    }

    // ─── 圆锥 ───
    case 'cone': {
      def('OP', '高线', 0, 1, true)      // 中心轴
      def('h1', '侧棱', 2, 1, true)      // 母线
      def('h2', '侧棱', 3, 1, true)
      def('h3', '侧棱', 4, 1, true)
      def('h4', '侧棱', 5, 1, true)
      break
    }

    // ─── 四棱台（底面 ABCD → 顶面 EFGH）───
    case 'squareFrustum': {
      // 底面边 4条
      def('AB', '底面边', 0, 1); def('BC', '底面边', 1, 2)
      def('CD', '底面边', 2, 3); def('DA', '底面边', 3, 0)
      // 顶面边 4条
      def('EF', '顶面边', 4, 5); def('FG', '顶面边', 5, 6)
      def('GH', '顶面边', 6, 7); def('HE', '顶面边', 7, 4)
      // 侧棱 4条
      def('AE', '侧棱', 0, 4); def('BF', '侧棱', 1, 5)
      def('CG', '侧棱', 2, 6); def('DH', '侧棱', 3, 7)
      // 棱（全部12条）
      def('AB', '棱', 0, 1); def('BC', '棱', 1, 2)
      def('CD', '棱', 2, 3); def('DA', '棱', 3, 0)
      def('EF', '棱', 4, 5); def('FG', '棱', 5, 6)
      def('GH', '棱', 6, 7); def('HE', '棱', 7, 4)
      def('AE', '棱', 0, 4); def('BF', '棱', 1, 5)
      def('CG', '棱', 2, 6); def('DH', '棱', 3, 7)
      // 底面面对角线 2条
      def('AC', '面对角线', 0, 2, true); def('BD', '面对角线', 1, 3, true)
      // 顶面面对角线 2条
      def('EG', '面对角线', 4, 6, true); def('FH', '面对角线', 5, 7, true)
      // 侧面对角线（梯形对角线）4条
      def('AF', '面对角线', 0, 5, true); def('BE', '面对角线', 1, 4, true)
      def('BG', '面对角线', 1, 6, true); def('CF', '面对角线', 2, 5, true)
      def('CH', '面对角线', 2, 7, true); def('DG', '面对角线', 3, 6, true)
      def('DE', '面对角线', 3, 4, true); def('AH', '面对角线', 0, 7, true)
      // 高线（底面中心 → 顶面中心）
      def('h', '高线', 'bottom', 'top', true)
      break
    }

    // ─── 圆台（类似圆柱）───
    case 'circularFrustum': {
      def("OO'", '高线', 0, 1, true)     // 中心轴
      def('h1', '侧棱', 2, 6, true)      // 右母线
      def('h2', '侧棱', 3, 7, true)      // 左母线
      def('h3', '侧棱', 4, 8, true)      // 前母线
      def('h4', '侧棱', 5, 9, true)      // 后母线
      break
    }

    default:
      break
  }

  // 去重：同一 id + category 只保留一条（category 不同的保留多条）
  const seen = new Set()
  const deduped = []
  lines.forEach(l => {
    const key = `${l.id}|${l.category}`
    if (!seen.has(key)) { seen.add(key); deduped.push(l) }
  })

  return { points: pts, lines: deduped }
}

// ── 将点标签解析为坐标 ───────────────────────────────
export function resolvePoint(label, points) {
  // 如果已是坐标数组，直接返回
  if (Array.isArray(label)) return label
  const { vertices, centers, labels } = points
  // 先查标签
  const idx = labels.indexOf(label)
  if (idx >= 0 && idx < vertices.length) return vertices[idx]
  // 再查参考点
  if (centers[label] != null) return centers[label]
  // 数字索引
  const n = parseInt(label)
  if (!isNaN(n) && n < vertices.length) return vertices[n]
  return null
}

// ── 教材模式默认可见线段 ─────────────────────────────
export function textbookDefaults(type) {
  const defaults = {
    cube: ['棱'],
    pyramid: ['棱'],
    prism: ['棱'],
    sphere: ['高线'],
    cylinder: [],
    cone: [],
  }
  return new Set(defaults[type] || [])
}

// ── 分类中文名 ──────────────────────────────────────
export const CATEGORY_NAMES = {
  '棱': '所有棱',
  '底面边': '底面边',
  '顶面边': '顶面边',
  '侧棱': '侧棱',
  '空间对角线': '空间对角线',
  '面对角线': '面对角线',
  '高线': '高线',
  '辅助构造线': '辅助构造线',
}

// ── 分类排序权重 ────────────────────────────────────
export const CATEGORY_ORDER = [
  '棱', '底面边', '顶面边', '侧棱',
  '空间对角线', '面对角线',
  '高线', '辅助构造线',
]

// ── 线段样式映射 ────────────────────────────────────
/** category → { color, dash, opacity }
 *  WebGL lineWidth 在 Windows 上限 1px，通过颜色+透明度区分粗细感
 */
export const CATEGORY_STYLES = {
  '棱':       { color: '#1a1a1a', dash: false, opacity: 1.0 },
  '底面边':   { color: '#1a1a1a', dash: false, opacity: 1.0 },
  '顶面边':   { color: '#1a1a1a', dash: false, opacity: 1.0 },
  '侧棱':     { color: '#1a1a1a', dash: false, opacity: 1.0 },
  '空间对角线': { color: '#888888', dash: true, opacity: 0.65 },
  '面对角线': { color: '#888888', dash: true, opacity: 0.65 },
  '高线':     { color: '#666666', dash: true, opacity: 0.55 },
  '辅助构造线': { color: '#aaaaaa', dash: true, opacity: 0.45 },
}

/** 返回样式对象，未匹配的返回默认样式 */
export function getLineStyle(category) {
  return CATEGORY_STYLES[category] || { color: '#888888', dash: true, opacity: 0.5 }
}

// ── 获取所有可能的顶点对（用于自动补全）───────────────
export function getAllVertexPairs(type) {
  const { labels } = getPoints(type, { size: 2 })
  const pairs = []
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      pairs.push({ label: labels[i] + labels[j], i, j })
    }
  }
  return pairs
}

// ── 一键操作预设 ────────────────────────────────────
export const PRESETS = {
  '显示全部': (type) => {
    const { lines } = getLineDefinitions(type, { size: 2 })
    return new Set(lines.map(l => `${l.id}|${l.category}`))
  },
  '隐藏全部': () => new Set(),
  '教材模式': (type) => {
    const { lines } = getLineDefinitions(type, { size: 2 })
    return new Set(
      lines.filter(l => ['棱', '底面边', '顶面边', '侧棱', '高线'].includes(l.category) && !l.dashed)
        .map(l => `${l.id}|${l.category}`)
    )
  },
  '仅显示棱': (type) => {
    const { lines } = getLineDefinitions(type, { size: 2 })
    return new Set(lines.filter(l => l.category === '棱').map(l => `${l.id}|${l.category}`))
  },
  '含对角线': (type) => {
    const { lines } = getLineDefinitions(type, { size: 2 })
    return new Set(
      lines.filter(l => ['棱', '空间对角线', '面对角线'].includes(l.category))
        .map(l => `${l.id}|${l.category}`)
    )
  },
}
