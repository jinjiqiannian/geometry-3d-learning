// ═══════════════════════════════════════════════════════
//  自动连线引擎 — 输入顶点对 → 创建线段 → 识别类型
// ═══════════════════════════════════════════════════════

import { getVertexAndEdgeInfo } from './geometryEngine'

// ── 各几何体的面定义（顶点索引数组）───────────────────
export function getFaces(type) {
  switch (type) {
    case 'cube':
      return [
        [0, 1, 2, 3], // 底面 y=-s  (A,B,C,D)
        [4, 5, 6, 7], // 顶面 y=+s  (E,F,G,H)
        [2, 3, 7, 6], // 前面 z=+s  (C,D,H,G)
        [0, 1, 5, 4], // 后面 z=-s  (A,B,F,E)
        [0, 3, 7, 4], // 左面 x=-s  (A,D,H,E)
        [1, 2, 6, 5], // 右面 x=+s  (B,C,G,F)
      ]

    case 'pyramid':
      return [
        [0, 1, 2, 3],       // 底面 (A,B,C,D)
        [0, 1, 4],           // 侧面 PAB
        [1, 2, 4],           // 侧面 PBC
        [2, 3, 4],           // 侧面 PCD
        [3, 0, 4],           // 侧面 PDA
      ]

    case 'prism':
      return [
        [0, 1, 2],           // 底面 (A,B,C)
        [3, 4, 5],           // 顶面 (A',B',C')
        [0, 1, 4, 3],        // 侧面 ABB'A'
        [1, 2, 5, 4],        // 侧面 BCC'B'
        [2, 0, 3, 5],        // 侧面 CAA'C'
      ]

    case 'squareFrustum':
      return [
        [0, 1, 2, 3],        // 底面 ABCD
        [4, 5, 6, 7],        // 顶面 EFGH
        [0, 1, 5, 4],        // 侧面 ABFE
        [1, 2, 6, 5],        // 侧面 BCGF
        [2, 3, 7, 6],        // 侧面 CDHG
        [3, 0, 4, 7],        // 侧面 DAEH
      ]

    default:
      return []
  }
}

// ── 空间对角线对（正方体专用）─────────────────────────
function getSpaceDiagonals(type) {
  if (type === 'cube') return [
    [0, 6], [1, 7], [2, 4], [3, 5],
  ]
  return []
}

// ── 解析用户输入 ──────────────────────────────────────
/**
 * 将用户输入的字符串解析为顶点对
 * 支持格式: "AC", "A'C", "A'C'", "AB'"
 * 返回 { fromLabel, toLabel, fromIdx, toIdx } 或 null
 */
export function parseVertexPair(input, vertexLabels) {
  if (!input || input.length < 2) return null

  const cleaned = input.replace(/\s+/g, '')
  const sorted = [...vertexLabels].sort((a, b) => b.length - a.length)

  const first = matchLabel(cleaned, 0, sorted)
  if (!first) return null

  const second = matchLabel(cleaned, first.len, sorted)
  if (!second) return null

  // 确保解析完了整个字符串（仅2标签模式）
  if (first.len + second.len !== cleaned.length) return null

  const fromIdx = vertexLabels.indexOf(first.label)
  const toIdx = vertexLabels.indexOf(second.label)

  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return null

  return { fromLabel: first.label, toLabel: second.label, fromIdx, toIdx }
}

/** 将输入解析为顶点标签序列，支持顺序连线
 *  输入 "ACBD" → [{label:"A",idx:0}, {label:"C",idx:2}, {label:"B",idx:1}, {label:"D",idx:3}]
 *  返回标签序列或 null（无法完整解析时）
 */
export function parseVertexChain(input, vertexLabels) {
  if (!input || input.length < 2) return null

  const cleaned = input.replace(/\s+/g, '')
  const sorted = [...vertexLabels].sort((a, b) => b.length - a.length)
  const chain = []
  let pos = 0

  while (pos < cleaned.length) {
    const m = matchLabel(cleaned, pos, sorted)
    if (!m) return null // 无法匹配
    const idx = vertexLabels.indexOf(m.label)
    if (idx < 0) return null
    chain.push({ label: m.label, idx })
    pos += m.len
  }

  return chain.length >= 2 ? chain : null
}

function matchLabel(str, start, sortedLabels) {
  for (const label of sortedLabels) {
    if (str.startsWith(label, start)) {
      return { label, len: label.length }
    }
  }
  return null
}

// ── 线段类型检测 ──────────────────────────────────────
/**
 * 判断两点连线属于哪种类型
 * 返回 { category, dashed }
 */
export function detectLineType(fromIdx, toIdx, type, params) {
  const info = getVertexAndEdgeInfo(type, params)
  const { edges } = info

  // 1. 检查是否为棱边
  if (edges) {
    const isEdge = edges.some(
      ([a, b]) =>
        (a === fromIdx && b === toIdx) ||
        (a === toIdx && b === fromIdx)
    )
    if (isEdge) return { category: '棱', dashed: false }
  }

  // 2. 检查是否为空间对角线
  const spaceDiags = getSpaceDiagonals(type)
  const isSpace = spaceDiags.some(
    ([a, b]) =>
      (a === fromIdx && b === toIdx) ||
      (a === toIdx && b === fromIdx)
  )
  if (isSpace) return { category: '空间对角线', dashed: true }

  // 3. 检查是否在同一面上（面对角线）
  const faces = getFaces(type)
  for (const face of faces) {
    const hasFrom = face.includes(fromIdx)
    const hasTo = face.includes(toIdx)
    if (hasFrom && hasTo) {
      // 在同一面上但不是边 → 面对角线
      return { category: '面对角线', dashed: true }
    }
  }

  // 4. 检查是否为高线（顶点到底面/顶面中心）
  // 正方体：顶点到对面中心
  // 棱锥：顶点到底面中心
  // 棱柱：顶点到底面/顶面中心
  // （这里简化处理，因为中心点不在顶点列表中）

  // 5. 默认：辅助构造线
  return { category: '辅助构造线', dashed: true }
}

// ── 自动补全 ──────────────────────────────────────────
/**
 * 生成所有有效顶点对，过滤已有线段，按前缀匹配
 * 返回 [{ label, category }]
 */
export function getAutocompleteSuggestions(prefix, vertexLabels, existingKeys = new Set()) {
  if (!prefix || prefix.length === 0) return []

  const cleaned = prefix.replace(/\s+/g, '')
  const n = vertexLabels.length
  const results = []

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const label = vertexLabels[i] + vertexLabels[j]
      const keyBase = label
      if (!label.startsWith(cleaned)) continue

      // 检查是否已在 existingKeys 中（去重）
      const alreadyExists = [...existingKeys].some(k => {
        const parts = k.split('|')
        return parts[0] === keyBase
      })
      if (alreadyExists) continue

      results.push({ label, i, j })
    }
  }

  // 按匹配质量排序（精确前缀优先，短标签优先）
  results.sort((a, b) => {
    if (a.label.startsWith(cleaned) && !b.label.startsWith(cleaned)) return -1
    if (!a.label.startsWith(cleaned) && b.label.startsWith(cleaned)) return 1
    return a.label.length - b.label.length
  })

  return results.slice(0, 8).map(r => ({
    label: r.label,
    fromIdx: r.i,
    toIdx: r.j,
  }))
}

// ── 一键生成辅助线 ────────────────────────────────────
/**
 * operation:
 *   'diagonals'     — 所有面对角线 + 空间对角线
 *   'height'        — 高线
 *   'median'        — 中线（边中点连线）
 */
export function generateOperationLines(type, operation, params) {
  const info = getVertexAndEdgeInfo(type, params)
  const { vertices, edges, labels } = info
  const lines = []

  switch (operation) {
    case 'diagonals': {
      const faces = getFaces(type)
      const spaceDiags = getSpaceDiagonals(type)
      const seen = new Set()

      // 空间对角线
      spaceDiags.forEach(([a, b]) => {
        const id = labels[a] + labels[b]
        if (!seen.has(id)) {
          seen.add(id)
          lines.push({ id, category: '空间对角线', from: a, to: b, dashed: true })
        }
      })

      // 面对角线（同面但不是边）
      faces.forEach(face => {
        for (let i = 0; i < face.length; i++) {
          for (let j = i + 1; j < face.length; j++) {
            // 跳过相邻顶点（它们是边）
            const diff = Math.abs(face.indexOf(face[i]) - face.indexOf(face[j]))
            if (diff === 1 || diff === face.length - 1) continue
            // 跳过对边中点连线（四边形中对面的两个顶点）
            const a = face[i], b = face[j]
            const isEdge = edges.some(
              ([x, y]) => (x === a && y === b) || (x === b && y === a)
            )
            if (isEdge) continue
            const id = labels[a] + labels[b]
            if (!seen.has(id)) {
              seen.add(id)
              lines.push({ id, category: '面对角线', from: a, to: b, dashed: true })
            }
          }
        }
      })
      break
    }

    case 'height': {
      if (type === 'cube') {
        // 正方体：两个对面的中心连线（3条）
        // 简化：体心到各面中心
        const faceCenters = getFaces(type)
        // 使用面对面的中心
        lines.push({ id: 'h_x', category: '高线', from: 'left', to: 'right', dashed: true })
        lines.push({ id: 'h_y', category: '高线', from: 'bottom', to: 'top', dashed: true })
        lines.push({ id: 'h_z', category: '高线', from: 'front', to: 'back', dashed: true })
      } else if (type === 'pyramid') {
        lines.push({ id: 'PO', category: '高线', from: 4, to: 'base', dashed: true })
      } else if (type === 'prism') {
        lines.push({ id: 'h1', category: '高线', from: 'baseBottom', to: 'baseTop', dashed: true })
      } else if (type === 'sphere' || type === 'cylinder' || type === 'cone') {
        lines.push({ id: 'NS', category: '高线', from: 0, to: 1, dashed: true })
      } else if (type === 'squareFrustum') {
        lines.push({ id: 'h', category: '高线', from: 'bottom', to: 'top', dashed: true })
      } else if (type === 'circularFrustum') {
        lines.push({ id: "OO'", category: '高线', from: 0, to: 1, dashed: true })
      }
      break
    }

    case 'median': {
      // 中线：连接两条边中点的线段（三角形中位线）
      if (type === 'prism' && info.vertices) {
        // 底面三角形 ABC (0,1,2)：中位线连接 AB中点 → AC中点, etc.
        const v = info.vertices
        const mid = (a, b) => [
          (v[a][0] + v[b][0]) / 2,
          (v[a][1] + v[b][1]) / 2,
          (v[a][2] + v[b][2]) / 2,
        ]
        // AB中点 → AC中点
        lines.push({ id: 'mid_AB_AC', category: '辅助构造线', from: mid(0, 1), to: mid(0, 2), dashed: true })
        // AB中点 → BC中点
        lines.push({ id: 'mid_AB_BC', category: '辅助构造线', from: mid(0, 1), to: mid(1, 2), dashed: true })
        // AC中点 → BC中点
        lines.push({ id: 'mid_AC_BC', category: '辅助构造线', from: mid(0, 2), to: mid(1, 2), dashed: true })
      } else if (type === 'pyramid' && info.vertices) {
        const v = info.vertices
        const mid = (a, b) => [
          (v[a][0] + v[b][0]) / 2,
          (v[a][1] + v[b][1]) / 2,
          (v[a][2] + v[b][2]) / 2,
        ]
        // 底面正方形中位线
        lines.push({ id: 'mid_AB_CD', category: '辅助构造线', from: mid(0, 1), to: mid(2, 3), dashed: true })
        lines.push({ id: 'mid_BC_DA', category: '辅助构造线', from: mid(1, 2), to: mid(3, 0), dashed: true })
      } else if (type === 'squareFrustum' && info.vertices) {
        const v = info.vertices
        const mid = (a, b) => [
          (v[a][0] + v[b][0]) / 2,
          (v[a][1] + v[b][1]) / 2,
          (v[a][2] + v[b][2]) / 2,
        ]
        // 底面正方形中位线
        lines.push({ id: 'mid_AB_CD', category: '辅助构造线', from: mid(0, 1), to: mid(2, 3), dashed: true })
        lines.push({ id: 'mid_BC_DA', category: '辅助构造线', from: mid(1, 2), to: mid(3, 0), dashed: true })
        // 顶面正方形中位线
        lines.push({ id: 'mid_EF_GH', category: '辅助构造线', from: mid(4, 5), to: mid(6, 7), dashed: true })
        lines.push({ id: 'mid_FG_HE', category: '辅助构造线', from: mid(5, 6), to: mid(7, 4), dashed: true })
      }
      break
    }

    default:
      break
  }

  return lines
}

// ── 搜索匹配 ──────────────────────────────────────────
/**
 * 根据搜索文本过滤线段
 * 支持：id 匹配、category 中文匹配、关键词匹配
 */
export function searchLines(query, allLines) {
  if (!query || query.trim() === '') return []

  const q = query.trim()

  // 关键词映射
  const keywordMap = {
    '全部对角线': ['空间对角线', '面对角线'],
    '对角线': ['空间对角线', '面对角线'],
    '对角': ['空间对角线', '面对角线'],
    '棱': ['棱', '底面边', '顶面边', '侧棱'],
    '高': ['高线'],
    '辅助': ['辅助构造线'],
  }

  const matchCategories = keywordMap[q] || null

  return allLines.filter(l => {
    const key = `${l.id}|${l.category}`
    if (l.id.toUpperCase().includes(q.toUpperCase())) return true
    if (l.category.includes(q)) return true
    if (matchCategories && matchCategories.includes(l.category)) return true
    return false
  }).map(l => `${l.id}|${l.category}`)
}
