/**
 * @module factExtractor
 * @description 从 ctx 中提取几何事实（点、线、面、关系）
 * @author Geometry 3D Learning
 */

/**
 * 几何事实类型
 * @typedef {Object} GeometryFact
 * @property {string} type - 事实类型: point, line, plane, relation, midpoint, parallel, perpendicular, etc.
 * @property {string[]} subjects - 涉及的几何对象标签
 * @property {number[]} [values] - 数值参数（如距离、角度）
 * @property {string} [description] - 自然语言描述
 */

/**
 * 从 ctx.semantic 中提取所有几何事实
 * @param {Object} ctx - 上下文对象，包含 semantic, relations, planes, vertices 等
 * @returns {GeometryFact[]} 提取的几何事实列表
 */
export function extractFacts(ctx) {
  const facts = []

  if (!ctx.semantic) return facts

  const { shape, points, edges, planes, relations, roleMap } = ctx.semantic

  facts.push({
    type: 'shape',
    subjects: [shape],
    description: `几何体类型: ${shape}`,
  })

  if (points?.length > 0) {
    points.forEach((label) => {
      facts.push({
        type: 'point',
        subjects: [label],
        description: `点 ${label} 存在`,
      })
    })
  }

  if (edges?.length > 0) {
    edges.forEach((edge) => {
      facts.push({
        type: 'line',
        subjects: [edge.from, edge.to],
        description: `线段 ${edge.label} (${edge.from}-${edge.to}) 存在`,
      })
    })
  }

  if (planes?.length > 0) {
    planes.forEach((plane) => {
      facts.push({
        type: 'plane',
        subjects: plane.points,
        description: `平面 ${plane.label} (经过${plane.points.join(', ')})`,
      })
    })
  }

  if (relations?.length > 0) {
    relations.forEach((relation) => {
      const parsed = parseRelation(relation)
      facts.push({
        type: parsed.type,
        subjects: parsed.subjects,
        description: relation,
      })
    })
  }

  return facts
}

/**
 * 解析关系字符串，提取类型和主体
 * @param {string} relation - 关系字符串，如 "E midpoint AD"
 * @returns {{ type: string, subjects: string[] }} 解析结果
 */
function parseRelation(relation) {
  if (relation.includes('midpoint')) {
    const parts = relation.split(' ')
    const point = parts[0]
    const segment = parts[2].split('')
    return { type: 'midpoint', subjects: [point, ...segment] }
  }

  if (relation.includes('parallel')) {
    const parts = relation.split(' ')
    const target = parts[0]
    const plane = parts[3]
    return { type: 'parallel', subjects: [target, plane] }
  }

  if (relation.includes('perpendicular')) {
    const parts = relation.split(' ')
    return { type: 'perpendicular', subjects: [parts[0], parts[2]] }
  }

  if (relation.includes('on')) {
    const parts = relation.split(' ')
    return { type: 'on', subjects: [parts[0], parts[2]] }
  }

  return { type: 'relation', subjects: relation.split(' ') }
}

/**
 * 提取重要平面
 * @param {Object} ctx - 上下文对象
 * @returns {GeometryFact[]} 重要平面事实
 */
export function extractImportantPlanes(ctx) {
  const facts = []

  if (!ctx.importantPlanes) return facts

  ctx.importantPlanes.forEach((planeLabel) => {
    facts.push({
      type: 'important_plane',
      subjects: [planeLabel],
      description: `重要平面: ${planeLabel}`,
    })
  })

  return facts
}

/**
 * 提取顶点信息
 * @param {Object} ctx - 上下文对象
 * @returns {GeometryFact[]} 顶点事实
 */
export function extractVertices(ctx) {
  const facts = []

  if (!ctx.vertices) return facts

  ctx.vertices.forEach((vertex) => {
    facts.push({
      type: 'vertex',
      subjects: [vertex],
      description: `顶点 ${vertex}`,
    })
  })

  return facts
}