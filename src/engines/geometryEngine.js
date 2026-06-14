import * as THREE from 'three'
import { getScaledTemplate } from './sceneIRTemplate'

// ★ 顶点坐标已统一到 sceneIRTemplate.js，此文件不再维护独立副本

// 为各几何体提供精确的顶点和边信息
// customVertices: 自由模式下由约束求解器提供的顶点（覆盖默认计算）
// customLabels: 题目解析后提供的自定义标签（覆盖默认标签）
export function getVertexAndEdgeInfo(type, params, customVertices, customLabels) {
  // 自由模式：使用自定义顶点，保留原有的边拓扑和标签
  if (customVertices && customVertices.length > 0 && isPolyhedral(type)) {
    const info = getVertexAndEdgeInfo(type, params)
    const labels = customLabels || info.labels
    return { vertices: customVertices, edges: info.edges, labels }
  }

  // ★ 顶点坐标统一从 sceneIRTemplate 获取
  const tpl = getScaledTemplate(type, params, customLabels)

  // 边拓扑（顶点索引对）— 用于 Three.js 网格构建
  const edgeTopology = {
    cube:       [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
    prism:      [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]],
    pyramid:    [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]],
    sphere:     [],
    cylinder:   [],
    cone:       [],
    squareFrustum: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
    circularFrustum: [],
    cuboid:     [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
    tetrahedron: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
    octahedron: [[0,1],[0,2],[0,3],[0,4],[5,1],[5,2],[5,3],[5,4],[1,2],[2,3],[3,4],[4,1]],
  }

  return {
    vertices: tpl.vertices,
    edges: edgeTopology[type] || [],
    labels: tpl.labels,
  }
}

// 创建 Three.js 几何体，顶点坐标与 getVertexAndEdgeInfo 严格一致
// customVertices: 自由模式下由约束求解器提供的顶点
export function createGeometry(type, params, customVertices) {
  // 自由模式：从自定义顶点构建几何体
  if (customVertices && customVertices.length > 0 && isPolyhedral(type)) {
    return buildGeometryFromVertices(customVertices, type)
  }

  const { size = 2 } = params
  const s = size / 2

  // 多面体：从 sceneIRTemplate 获取顶点坐标
  if (isPolyhedral(type)) {
    const tpl = getScaledTemplate(type, params)
    const flatVerts = tpl.vertices.flat()
    const indices = getFaceIndices(type)
    if (indices && indices.length > 0) {
      return createFromArrays(flatVerts, indices)
    }
  }
  return new THREE.BoxGeometry(size, size, size)
}

function createFromArrays(flatVerts, indices) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ── 从任意顶点数组构建三角面几何体 ────────────────────
// 保持各类型的面拓扑（三角形索引）不变，仅替换顶点坐标
function buildGeometryFromVertices(vertices, type) {
  const flatVerts = vertices.flat()  // [[x,y,z],...] → [x,y,z,...]
  const indices = getFaceIndices(type)
  return createFromArrays(flatVerts, indices)
}

/** 返回各多面体类型的三角面索引 */
function getFaceIndices(type) {
  switch (type) {
    case 'cube':
    case 'cuboid':
      return [
        0,1,2, 0,2,3, 4,6,5, 4,7,6,       // 底面 + 顶面
        0,4,5, 0,5,1, 1,5,6, 1,6,2,       // 侧面
        2,6,7, 2,7,3, 3,7,4, 3,4,0,
      ]
    case 'pyramid':
      return [
        0,1,4, 1,2,4, 2,3,4, 3,0,4,       // 侧面
        1,0,3, 1,3,2,                       // 底面
      ]
    case 'prism':
      return [
        0,1,2, 3,5,4,                       // 底面 + 顶面
        0,3,4, 0,4,1,                       // 侧面
        1,4,5, 1,5,2,
        2,5,3, 2,3,0,
      ]
    case 'squareFrustum':
      return [
        0,2,1, 0,3,2,                       // 底面
        4,5,6, 4,6,7,                       // 顶面
        2,3,7, 2,7,6,                       // 前面
        0,5,1, 0,4,5,                       // 后面
        1,6,2, 1,5,6,                       // 右面
        0,7,3, 0,4,7,                       // 左面
      ]
    default:
      return []
  }
}

// 判断是否为棱柱形几何体（可以单独画棱边）
export function isPolyhedral(type) {
  return ['cube', 'prism', 'pyramid', 'squareFrustum', 'cuboid', 'tetrahedron', 'octahedron'].includes(type)
}

export function calculateVolume(type, params) {
  const { size = 2 } = params
  const formulas = {
    cube:     () => Math.pow(size, 3),
    sphere:   () => (4/3) * Math.PI * Math.pow(size/2, 3),
    cylinder: () => Math.PI * Math.pow(size/2, 2) * size,
    cone:     () => (1/3) * Math.PI * Math.pow(size/2, 2) * size,
    pyramid:  () => (1/3) * Math.pow(size, 3),
    prism:    () => 0.5 * Math.pow(size, 3),
    squareFrustum: () => {
      const a = size, b = size / 2, h = size
      const S1 = a * a, S2 = b * b
      return (h / 3) * (S1 + S2 + Math.sqrt(S1 * S2))
    },
    circularFrustum: () => {
      const R = size / 2, r = size / 4, h = size
      return (Math.PI * h / 3) * (R * R + r * r + R * r)
    },
    cuboid: () => size * size * (size * 0.6),  // V = a·b·c
    tetrahedron: () => Math.pow(size, 3) * Math.SQRT2 / 12,  // V = a³√2/12
    octahedron: () => Math.pow(size, 3) * Math.SQRT2 / 3,     // V = a³√2/3
  }
  return formulas[type]?.() || 0
}

export function calculateSurfaceArea(type, params) {
  const { size = 2 } = params
  const formulas = {
    cube:     () => 6 * Math.pow(size, 2),
    sphere:   () => 4 * Math.PI * Math.pow(size/2, 2),
    cylinder: () => 2 * Math.PI * (size/2) * (size + size/2),
    cone:     () => Math.PI * (size/2) * (size/2 + Math.sqrt(Math.pow(size/2, 2) + Math.pow(size, 2))),
    pyramid:  () => Math.pow(size, 2) * (1 + Math.sqrt(5)),
    prism:    () => Math.pow(size, 2) * (3 + Math.sqrt(2)),
    squareFrustum: () => {
      const a = size, b = size / 2, h = size
      const S1 = a * a, S2 = b * b
      const lateral = 2 * (a + b) * Math.sqrt(h * h + Math.pow((a - b) / 2, 2))
      return S1 + S2 + lateral
    },
    circularFrustum: () => {
      const R = size / 2, r = size / 4, h = size
      const l = Math.sqrt(h * h + Math.pow(R - r, 2))
      return Math.PI * (R + r) * l + Math.PI * (R * R + r * r)
    },
    cuboid: () => {
      const a = size, b = size * 0.6, c = size
      return 2 * (a * b + b * c + a * c)  // S = 2(ab+bc+ac)
    },
    tetrahedron: () => Math.sqrt(3) * Math.pow(size, 2),  // S = √3·a²
    octahedron: () => 2 * Math.sqrt(3) * Math.pow(size, 2),  // S = 2√3·a²
  }
  return formulas[type]?.() || 0
}