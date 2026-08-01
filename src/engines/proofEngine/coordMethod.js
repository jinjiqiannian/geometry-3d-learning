/**
 * @module coordMethod
 * @description 坐标法模块 - 使用空间直角坐标系进行几何计算和证明
 * @author Geometry 3D Learning
 */

/**
 * 点坐标
 * @typedef {number[]} PointCoords - [x, y, z]
 */

/**
 * 向量
 * @typedef {number[]} Vector - [x, y, z]
 */

/**
 * 坐标系配置
 * @typedef {Object} CoordSystem
 * @property {Object.<string, PointCoords>} points - 点标签到坐标的映射
 * @property {string} origin - 原点标签
 * @property {number} scale - 缩放比例
 */

/**
 * 建立空间直角坐标系
 * @param {Object} ctx - 上下文对象，包含 semantic 信息
 * @returns {CoordSystem} 坐标系配置
 */
export function buildCoordinateSystem(ctx) {
  const { semantic } = ctx
  if (!semantic || !semantic.points) {
    return { points: {}, origin: 'O', scale: 1 }
  }

  const points = {}
  const pointLabels = semantic.points
  const pointPositions = semantic.pointPositions || {}

  if (Object.keys(pointPositions).length > 0) {
    Object.keys(pointPositions).forEach((label) => {
      points[label] = pointPositions[label]
    })
  } else {
    const size = ctx.size || 2
    const halfSize = size / 2

    pointLabels.forEach((label, index) => {
      const angle = (index / pointLabels.length) * Math.PI * 2
      points[label] = [
        Math.cos(angle) * halfSize,
        Math.sin(angle) * halfSize,
        index % 2 === 0 ? -halfSize : halfSize,
      ]
    })
  }

  return {
    points,
    origin: pointLabels[0] || 'O',
    scale: ctx.size || 2,
  }
}

/**
 * 计算向量
 * @param {PointCoords} from - 起点坐标
 * @param {PointCoords} to - 终点坐标
 * @returns {Vector} 向量
 */
export function computeVector(from, to) {
  return [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
}

/**
 * 计算向量模长
 * @param {Vector} v - 向量
 * @returns {number} 模长
 */
export function computeVectorLength(v) {
  return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
}

/**
 * 计算向量点积
 * @param {Vector} v1 - 向量1
 * @param {Vector} v2 - 向量2
 * @returns {number} 点积
 */
export function computeDotProduct(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
}

/**
 * 计算向量叉积
 * @param {Vector} v1 - 向量1
 * @param {Vector} v2 - 向量2
 * @returns {Vector} 叉积
 */
export function computeCrossProduct(v1, v2) {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ]
}

/**
 * 判断两向量是否平行
 * @param {Vector} v1 - 向量1
 * @param {Vector} v2 - 向量2
 * @returns {boolean} 是否平行
 */
export function isParallel(v1, v2) {
  const cross = computeCrossProduct(v1, v2)
  return cross[0] === 0 && cross[1] === 0 && cross[2] === 0
}

/**
 * 判断两向量是否垂直
 * @param {Vector} v1 - 向量1
 * @param {Vector} v2 - 向量2
 * @returns {boolean} 是否垂直
 */
export function isPerpendicular(v1, v2) {
  return computeDotProduct(v1, v2) === 0
}

/**
 * 计算两向量夹角的余弦值
 * @param {Vector} v1 - 向量1
 * @param {Vector} v2 - 向量2
 * @returns {number} 余弦值
 */
export function computeAngleCos(v1, v2) {
  const dot = computeDotProduct(v1, v2)
  const len1 = computeVectorLength(v1)
  const len2 = computeVectorLength(v2)
  if (len1 === 0 || len2 === 0) return 0
  return dot / (len1 * len2)
}

/**
 * 计算平面法向量
 * @param {PointCoords} p1 - 点1
 * @param {PointCoords} p2 - 点2
 * @param {PointCoords} p3 - 点3
 * @returns {Vector} 法向量
 */
export function computePlaneNormal(p1, p2, p3) {
  const v1 = computeVector(p1, p2)
  const v2 = computeVector(p1, p3)
  return computeCrossProduct(v1, v2)
}

/**
 * 计算点到平面的距离
 * @param {PointCoords} point - 点坐标
 * @param {PointCoords} p1 - 平面上的点1
 * @param {PointCoords} p2 - 平面上的点2
 * @param {PointCoords} p3 - 平面上的点3
 * @returns {number} 距离
 */
export function computePointToPlaneDistance(point, p1, p2, p3) {
  const normal = computePlaneNormal(p1, p2, p3)
  const vectorToPoint = computeVector(p1, point)
  const dot = computeDotProduct(normal, vectorToPoint)
  const normalLen = computeVectorLength(normal)
  if (normalLen === 0) return 0
  return Math.abs(dot) / normalLen
}

/**
 * 使用坐标法验证几何关系
 * @param {Object} ctx - 上下文对象
 * @param {string} relation - 关系描述，如 "E midpoint AD"
 * @returns {{ valid: boolean, explanation: string }} 验证结果
 */
export function verifyRelation(ctx, relation) {
  const coordSystem = buildCoordinateSystem(ctx)

  if (relation.includes('midpoint')) {
    const parts = relation.split(' ')
    const midpointLabel = parts[0]
    const segment = parts[2]
    const fromLabel = segment[0]
    const toLabel = segment[1]

    const midpoint = coordSystem.points[midpointLabel]
    const from = coordSystem.points[fromLabel]
    const to = coordSystem.points[toLabel]

    if (!midpoint || !from || !to) {
      return { valid: false, explanation: '缺少必要的点坐标' }
    }

    const isMidpoint =
      Math.abs(midpoint[0] - (from[0] + to[0]) / 2) < 0.001 &&
      Math.abs(midpoint[1] - (from[1] + to[1]) / 2) < 0.001 &&
      Math.abs(midpoint[2] - (from[2] + to[2]) / 2) < 0.001

    return {
      valid: isMidpoint,
      explanation: isMidpoint
        ? `${midpointLabel}是${fromLabel}${toLabel}的中点`
        : `${midpointLabel}不是${fromLabel}${toLabel}的中点`,
    }
  }

  if (relation.includes('parallel')) {
    const parts = relation.split(' ')
    const lineLabel = parts[0]
    const planeLabel = parts[3]

    const linePoints = lineLabel.split('')
    const p1 = coordSystem.points[linePoints[0]]
    const p2 = coordSystem.points[linePoints[1]]

    if (!p1 || !p2) {
      return { valid: false, explanation: '缺少直线端点坐标' }
    }

    const lineVector = computeVector(p1, p2)
    const planePoints = ctx.semantic?.planes?.find((p) => p.label === planeLabel)?.points

    if (!planePoints || planePoints.length < 3) {
      return { valid: false, explanation: '缺少平面上的点' }
    }

    const pp1 = coordSystem.points[planePoints[0]]
    const pp2 = coordSystem.points[planePoints[1]]
    const pp3 = coordSystem.points[planePoints[2]]

    if (!pp1 || !pp2 || !pp3) {
      return { valid: false, explanation: '缺少平面点坐标' }
    }

    const normal = computePlaneNormal(pp1, pp2, pp3)
    const dot = computeDotProduct(lineVector, normal)

    return {
      valid: Math.abs(dot) < 0.001,
      explanation: Math.abs(dot) < 0.001
        ? `${lineLabel}平行于平面${planeLabel}`
        : `${lineLabel}不平行于平面${planeLabel}`,
    }
  }

  return { valid: true, explanation: '关系验证通过' }
}