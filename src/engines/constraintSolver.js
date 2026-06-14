// ═══════════════════════════════════════════════════════
//  约束求解器 — 边方向分组 / 顶点模板计算 / 迭代松弛
// ═══════════════════════════════════════════════════════
import { getScaledTemplate } from './sceneIRTemplate'

// ── 多面体棱边方向分组 ────────────────────────────────
//  返回 { groupLabel: [edgeId, ...] }
//  用于约束模式：同组边共享同一长度
export function getEdgeDirectionGroups(type) {
  switch (type) {
    case 'cube':
    case 'cuboid':
      // 3组：长(x轴)、宽(z轴)、高(y轴)
      return {
        '长 (X)':  ['AB', 'CD', 'EF', 'GH'],
        '宽 (Z)':  ['BC', 'DA', 'FG', 'HE'],
        '高 (Y)':  ['AE', 'BF', 'CG', 'DH'],
      }

    case 'pyramid':
      // 2组：底面边、侧棱
      return {
        '底面边': ['AB', 'BC', 'CD', 'DA'],
        '侧棱':   ['PA', 'PB', 'PC', 'PD'],
      }

    case 'prism':
      // 3组：底面边、顶面边、侧棱（高）
      return {
        '底面边': ['AB', 'BC', 'CA'],
        '顶面边': ["A'B'", "B'C'", "C'A'"],
        '侧棱':   ["AA'", "BB'", "CC'"],
      }

    case 'squareFrustum':
      // 3组：底面边、顶面边、侧棱
      return {
        '底面边': ['AB', 'BC', 'CD', 'DA'],
        '顶面边': ['EF', 'FG', 'GH', 'HE'],
        '侧棱':   ['AE', 'BF', 'CG', 'DH'],
      }

    default:
      return {}
  }
}

// ── 获取所有棱边 ID 列表（仅棱边，不含对角线/高线）───
export function getAllEdgeKeys(type) {
  const groups = getEdgeDirectionGroups(type)
  return Object.values(groups).flat()
}

// ── 从约束参数计算默认边长 ───────────────────────────
/** 根据当前 size 或约束参数，导出每条棱的长度 */
export function getDefaultEdgeLengths(type, constraintMode, modeParams) {
  const keys = getAllEdgeKeys(type)
  const lengths = {}

  switch (constraintMode) {
    case 'cube': {
      const s = modeParams.cubeSize ?? 2
      keys.forEach(k => { lengths[k] = s })
      break
    }
    case 'cuboid': {
      const groups = getEdgeDirectionGroups(type)
      const a = modeParams.cuboidA ?? 2      // x（长）
      const b = modeParams.cuboidB ?? 1.2    // z（宽）
      const c = modeParams.cuboidC ?? 2      // y（高）
      const groupVals = { '长 (X)': a, '宽 (Z)': b, '高 (Y)': c }
      // 对其他类型（pyramid等），使用分组名
      for (const [gName, edges] of Object.entries(groups)) {
        const val = groupVals[gName]
        if (val != null) {
          edges.forEach(k => { lengths[k] = val })
        }
      }
      // 回退：未分配的使用 size
      keys.forEach(k => {
        if (lengths[k] == null) lengths[k] = 2
      })
      break
    }
    case 'free': {
      // 从 freeEdgeLengths 读取，缺失的使用默认值 2
      const free = modeParams.freeEdgeLengths || {}
      keys.forEach(k => {
        lengths[k] = free[k] ?? 2
      })
      break
    }
    default: {
      keys.forEach(k => { lengths[k] = 2 })
    }
  }

  return lengths
}

// ── 初始顶点模板（从默认尺寸构建）─────────────────────
// ★ 顶点坐标统一从 sceneIRTemplate 获取

/** 返回初始顶点坐标，用于迭代松弛的起点 */
export function getTemplateVertices(type, size = 2) {
  const tpl = getScaledTemplate(type, { size })
  return tpl.vertices
}

// ── 边 → 顶点索引映射 ─────────────────────────────────
/** 返回 { edgeId: [fromIdx, toIdx] } */
export function getEdgeIndexMap(type) {
  switch (type) {
    case 'cube':
    case 'cuboid':
      return {
        'AB': [0, 1], 'BC': [1, 2], 'CD': [2, 3], 'DA': [3, 0],
        'EF': [4, 5], 'FG': [5, 6], 'GH': [6, 7], 'HE': [7, 4],
        'AE': [0, 4], 'BF': [1, 5], 'CG': [2, 6], 'DH': [3, 7],
      }
    case 'pyramid':
      return {
        'AB': [0, 1], 'BC': [1, 2], 'CD': [2, 3], 'DA': [3, 0],
        'PA': [4, 0], 'PB': [4, 1], 'PC': [4, 2], 'PD': [4, 3],
      }
    case 'prism':
      return {
        'AB': [0, 1], 'BC': [1, 2], 'CA': [2, 0],
        "A'B'": [3, 4], "B'C'": [4, 5], "C'A'": [5, 3],
        "AA'": [0, 3], "BB'": [1, 4], "CC'": [2, 5],
      }
    case 'squareFrustum':
      return {
        'AB': [0, 1], 'BC': [1, 2], 'CD': [2, 3], 'DA': [3, 0],
        'EF': [4, 5], 'FG': [5, 6], 'GH': [6, 7], 'HE': [7, 4],
        'AE': [0, 4], 'BF': [1, 5], 'CG': [2, 6], 'DH': [3, 7],
      }
    default:
      return {}
  }
}

// ── 从约束参数计算顶点坐标 ────────────────────────────
/**
 * @param {string} type - 几何体类型
 * @param {string} constraintMode - 'cube' | 'cuboid' | 'free'
 * @param {object} modeParams - 约束参数
 * @param {number[][]} [currentVertices] - 自由模式下的当前顶点（用作初始猜测）
 * @returns {number[][]} 顶点坐标数组
 */
export function computeVerticesFromParams(type, constraintMode, modeParams, currentVertices) {
  const s = (modeParams.size ?? 2) / 2

  switch (constraintMode) {
    case 'cube': {
      const edgeLen = modeParams.cubeSize ?? 2
      const h = edgeLen / 2
      if (type === 'cuboid') {
        // 正方体约束施加到长方体：所有半轴相等
        return [
          [-h, -h, -h], [ h, -h, -h], [ h, -h,  h], [-h, -h,  h],
          [-h,  h, -h], [ h,  h, -h], [ h,  h,  h], [-h,  h,  h],
        ]
      }
      // cube 类型直接用模板
      return getTemplateVertices(type, edgeLen)
    }

    case 'cuboid': {
      const a = (modeParams.cuboidA ?? 2) / 2   // x 半长
      const b = (modeParams.cuboidB ?? 1.2) / 2 // z 半宽
      const c = (modeParams.cuboidC ?? 2) / 2   // y 半高
      if (type === 'cube' || type === 'cuboid') {
        return [
          [-a, -c, -b], [ a, -c, -b], [ a, -c,  b], [-a, -c,  b],
          [-a,  c, -b], [ a,  c, -b], [ a,  c,  b], [-a,  c,  b],
        ]
      }
      // 其他类型回退到默认模板
      return getTemplateVertices(type, modeParams.size ?? 2)
    }

    case 'free': {
      const edgeLengths = modeParams.freeEdgeLengths || {}
      // 使用当前顶点或模板顶点作为初始猜测
      let vertices = (currentVertices && currentVertices.length > 0)
        ? currentVertices.map(v => [...v])
        : getTemplateVertices(type, modeParams.size ?? 2)

      if (Object.keys(edgeLengths).length === 0) return vertices

      const edgeMap = getEdgeIndexMap(type)
      const edges = []
      for (const [id, targetLen] of Object.entries(edgeLengths)) {
        const idx = edgeMap[id]
        if (idx && targetLen > 0) {
          edges.push({ i: idx[0], j: idx[1], target: targetLen })
        }
      }

      if (edges.length === 0) return vertices

      return relaxVertices(vertices, edges, 80)
    }

    default:
      return getTemplateVertices(type, modeParams.size ?? 2)
  }
}

// ── 迭代松弛求解器 ────────────────────────────────────
/**
 * Spring relaxation: 反复调整顶点位置使每条边的长度逼近目标值
 *
 * @param {number[][]} vertices - 初始顶点坐标（会被原地修改并返回副本）
 * @param {{i:number, j:number, target:number}[]} edges - 边约束列表
 * @param {number} iterations - 迭代次数（默认 80）
 * @returns {number[][]} 调整后的顶点坐标
 */
export function relaxVertices(vertices, edges, iterations = 80) {
  const V = vertices.map(v => [...v])  // 深拷贝

  for (let iter = 0; iter < iterations; iter++) {
    let maxError = 0

    for (const { i, j, target } of edges) {
      const dx = V[j][0] - V[i][0]
      const dy = V[j][1] - V[i][1]
      const dz = V[j][2] - V[i][2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < 0.0001) continue

      const error = Math.abs(dist - target)
      if (error > maxError) maxError = error

      // 阻尼因子：逐步减小，帮助收敛
      const damping = 0.4 + 0.1 * Math.min(1, (iterations - iter) / iterations)
      const correction = (target - dist) * damping

      const ux = dx / dist
      const uy = dy / dist
      const uz = dz / dist

      V[i][0] -= correction * ux * 0.5
      V[i][1] -= correction * uy * 0.5
      V[i][2] -= correction * uz * 0.5
      V[j][0] += correction * ux * 0.5
      V[j][1] += correction * uy * 0.5
      V[j][2] += correction * uz * 0.5
    }

    // 收敛检查
    if (maxError < 0.001) break
  }

  // ── 固定刚体自由度 ──
  // 顶点0固定在原点
  const offset = [...V[0]]
  for (let i = 0; i < V.length; i++) {
    V[i][0] -= offset[0]
    V[i][1] -= offset[1]
    V[i][2] -= offset[2]
  }

  return V
}

// ── 根据边长构建新的顶点模板 ──────────────────────────
/**
 * 用于正方体/长方体模式：直接从主参数构建顶点
 * （不依赖 getTemplateVertices 的固定尺寸）
 */
export function buildVerticesFromDims(type, dims) {
  const { a, b, c } = dims  // a=半长(x), b=半宽(z), c=半高(y)
  if (type === 'cube' || type === 'cuboid') {
    return [
      [-a, -c, -b], [ a, -c, -b], [ a, -c,  b], [-a, -c,  b],
      [-a,  c, -b], [ a,  c, -b], [ a,  c,  b], [-a,  c,  b],
    ]
  }
  return getTemplateVertices(type, Math.max(a, b, c) * 2)
}
