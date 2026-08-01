import * as THREE from 'three'
import { getScaledTemplate } from './sceneIRTemplate'

export function getVertexAndEdgeInfo(type, params, customVertices, customLabels) {
  const { size = 2 } = params

  if (customVertices && customVertices.length > 0 && isPolyhedral(type)) {
    const info = getVertexAndEdgeInfo(type, params)
    const labels = customLabels || info.labels
    return { vertices: customVertices, edges: info.edges, labels }
  }

  const tpl = getScaledTemplate(type, { size })
  if (!tpl) {
    return { vertices: [], edges: [], labels: [] }
  }

  const edges = tpl.lines
    .filter(line => line.category === '棱')
    .map(line => [line.from, line.to])

  const labels = customLabels || tpl.labels

  return { vertices: tpl.vertices, edges, labels }
}

export function createGeometry(type, params, customVertices) {
  if (customVertices && customVertices.length > 0 && isPolyhedral(type)) {
    return buildGeometryFromVertices(customVertices, type)
  }

  const { size = 2 } = params
  const s = size / 2

  switch (type) {
    case 'cube': {
      const h = s
      const verts = [
        -h,-h,-h,  h,-h,-h,  h, h,-h, -h, h,-h,
        -h,-h, h,  h,-h, h,  h, h, h, -h, h, h
      ]
      const indices = [
        0,1,2, 0,2,3, 4,6,5, 4,7,6,
        0,4,5, 0,5,1, 1,5,6, 1,6,2,
        2,6,7, 2,7,3, 3,7,4, 3,4,0
      ]
      return createFromArrays(verts, indices)
    }
    case 'prism': {
      const verts = [
        -s,-s,-s,  s,-s,-s, -s,-s, s,
        -s, s,-s,  s, s,-s, -s, s, s
      ]
      const indices = [
        0,1,2, 3,5,4,
        0,3,4, 0,4,1,
        1,4,5, 1,5,2,
        2,5,3, 2,3,0
      ]
      return createFromArrays(verts, indices)
    }
    case 'pyramid': {
      const verts = [
        -s,-s,-s,  s,-s,-s,  s,-s, s, -s,-s, s,
         0, s, 0
      ]
      const indices = [
        0,1,4, 1,2,4, 2,3,4, 3,0,4,
        1,0,3, 1,3,2
      ]
      return createFromArrays(verts, indices)
    }
    case 'tetrahedron': {
      const L = size / Math.sqrt(2)
      const h = L / 2
      const verts = [
        -h,-h,-h,  h, h,-h,  h,-h, h, -h, h, h,
      ]
      const indices = [
        0,1,2, 0,3,1, 0,2,3, 1,3,2,
      ]
      return createFromArrays(verts, indices)
    }
    case 'octahedron': {
      const a = size / Math.sqrt(2)
      const verts = [
        0,a,0,  a,0,0,  0,0,a,  -a,0,0,  0,0,-a,  0,-a,0,
      ]
      const indices = [
        0,1,2, 0,2,3, 0,3,4, 0,4,1,
        5,1,2, 5,2,3, 5,3,4, 5,4,1,
      ]
      return createFromArrays(verts, indices)
    }
    case 'sphere':
      return new THREE.SphereGeometry(s, 64, 32)
    case 'cylinder':
      return new THREE.CylinderGeometry(s, s, size, 64)
    case 'cone':
      return new THREE.ConeGeometry(s, size, 64)
    case 'squareFrustum': {
      // 底面边长=size，顶面边长=size/2，高=size
      const h = s
      const topS = s / 2
      const verts = [
        -s, -h, -s,   s, -h, -s,   s, -h,  s,  -s, -h,  s,  // 底面 ABCD (0-3)
        -topS, h, -topS,  topS, h, -topS,  topS, h, topS,  -topS, h, topS,  // 顶面 EFGH (4-7)
      ]
      // 6个面：底面+顶面+4个梯形侧面(每个分成2个三角形)
      const indices = [
        // 底面 (注意法线朝外：逆时针从下方看)
        0,2,1, 0,3,2,
        // 顶面
        4,5,6, 4,6,7,
        // 前面 z+ (C,D,H,G) 2-3-7-6
        2,3,7, 2,7,6,
        // 后面 z- (A,B,F,E) 0-1-5-4
        0,5,1, 0,4,5,
        // 右面 x+ (B,C,G,F) 1-2-6-5
        1,6,2, 1,5,6,
        // 左面 x- (A,D,H,E) 0-3-7-4
        0,7,3, 0,4,7,
      ]
      return createFromArrays(verts, indices)
    }
    case 'circularFrustum':
      // Three.js 原生圆台：半径下大上小
      return new THREE.CylinderGeometry(s / 2, s, size, 64)
    case 'cuboid':
      // 长(size) × 宽(0.6*size) × 高(size)
      return new THREE.BoxGeometry(size, size, size * 0.6)
    default:
      return new THREE.BoxGeometry(size, size, size)
  }
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

export function createGeometryFromSceneIR(sceneIR) {
  if (!sceneIR || !sceneIR.points || sceneIR.points.length === 0) {
    return new THREE.BoxGeometry(2, 2, 2)
  }

  const vertices = sceneIR.points.map(p => p.position)
  const flatVerts = vertices.flat()

  if (sceneIR.faces && sceneIR.faces.length > 0) {
    const indices = sceneIR.faces.flat()
    return createFromArrays(flatVerts, indices)
  }

  const type = sceneIR.type || 'cube'
  const indices = getFaceIndices(type)

  if (indices.length > 0) {
    return createFromArrays(flatVerts, indices)
  }

  const size = sceneIR.size || 2
  const s = size / 2
  
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(s, 64, 32)
    case 'cylinder':
      return new THREE.CylinderGeometry(s / 2, s / 2, size, 64)
    case 'cone':
      return new THREE.ConeGeometry(s, size, 64)
    case 'circularFrustum':
      return new THREE.CylinderGeometry(s / 2, s, size, 64)
    case 'cuboid':
      return new THREE.BoxGeometry(size, size, size * 0.6)
    default:
      return new THREE.BoxGeometry(size, size, size)
  }
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