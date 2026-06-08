import * as THREE from 'three'

// 为各几何体提供精确的顶点和边信息
// customVertices: 自由模式下由约束求解器提供的顶点（覆盖默认计算）
export function getVertexAndEdgeInfo(type, params, customVertices) {
  const { size = 2 } = params

  // 自由模式：使用自定义顶点，保留原有的边拓扑和标签
  if (customVertices && customVertices.length > 0 && isPolyhedral(type)) {
    const info = getVertexAndEdgeInfo(type, params)  // 获取标签和边
    return { vertices: customVertices, edges: info.edges, labels: info.labels }
  }

  const s = size / 2

  const maps = {
    cube: () => {
      // 底面→顶面，每面逆时针
      const v = [
        [-s,-s,-s],[ s,-s,-s],[ s,-s, s],[-s,-s, s],  // 底面 ABCD
        [-s, s,-s],[ s, s,-s],[ s, s, s],[-s, s, s],  // 顶面 EFGH
      ]
      const e = [
        [0,1],[1,2],[2,3],[3,0],  // 底面边
        [4,5],[5,6],[6,7],[7,4],  // 顶面边
        [0,4],[1,5],[2,6],[3,7],  // 侧棱 AE,BF,CG,DH
      ]
      return { vertices: v, edges: e, labels: ['A','B','C','D','E','F','G','H'] }
    },
    prism: () => {
      // 标准直角三棱柱：底面为等腰直角三角形(直角边=size)，高=size
      const v = [
        [-s,-s,-s],[ s,-s,-s],[-s,-s, s],
        [-s, s,-s],[ s, s,-s],[-s, s, s]
      ]
      const e = [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]]
      return { vertices: v, edges: e, labels: ['A','B','C','A\'','B\'','C\''] }
    },
    pyramid: () => {
      // 标准正四棱锥：底面边长=size，高=size
      const v = [
        [-s,-s,-s],[ s,-s,-s],[ s,-s, s],[-s,-s, s],
        [ 0, s, 0]
      ]
      const e = [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]]
      return { vertices: v, edges: e, labels: ['A','B','C','D','P'] }
    },
    sphere: () => {
      const v = [[0,-s,0],[0,s,0],[s,0,0],[-s,0,0],[0,0,s],[0,0,-s]]
      return { vertices: v, edges: [], labels: ['S','N','E','W','F','B'] }
    },
    cylinder: () => {
      const v = [
        [0,-s,0],[0,s,0],
        [ s,-s,0],[-s,-s,0],[0,-s, s],[0,-s,-s],
        [ s, s,0],[-s, s,0],[0, s, s],[0, s,-s]
      ]
      return { vertices: v, edges: [], labels: ['O','O\'','A','B','C','D','A\'','B\'','C\'','D\''] }
    },
    cone: () => {
      const v = [
        [0,-s,0],[0,s,0],
        [ s,-s,0],[-s,-s,0],[0,-s, s],[0,-s,-s]
      ]
      return { vertices: v, edges: [], labels: ['O','P','A','B','C','D'] }
    },
    squareFrustum: () => {
      // 底面正方形 (size) → 顶面正方形 (size/2)，高=size
      const h = s
      const topS = s / 2
      const v = [
        [-s, -h, -s], [ s, -h, -s], [ s, -h,  s], [-s, -h,  s],  // 底面 ABCD (0-3)
        [-topS, h, -topS], [ topS, h, -topS], [ topS, h,  topS], [-topS, h,  topS],  // 顶面 EFGH (4-7)
      ]
      const e = [
        [0,1],[1,2],[2,3],[3,0],  // 底面边
        [4,5],[5,6],[6,7],[7,4],  // 顶面边
        [0,4],[1,5],[2,6],[3,7],  // 侧棱 AE,BF,CG,DH
      ]
      return { vertices: v, edges: e, labels: ['A','B','C','D','E','F','G','H'] }
    },
    circularFrustum: () => {
      // 底面圆(半径=s) + 顶面圆(半径=s/2)，高=size
      const v = [
        [0,-s,0],[0,s,0],  // 底面圆心 O, 顶面圆心 O'
        [ s,-s,0],[-s,-s,0],[0,-s, s],[0,-s,-s],  // 底面标记 A-D
        [ s/2, s,0],[-s/2, s,0],[0, s, s/2],[0, s,-s/2],  // 顶面标记 A'-D'
      ]
      return { vertices: v, edges: [], labels: ['O','O\'','A','B','C','D','A\'','B\'','C\'','D\''] }
    },
    cuboid: () => {
      // 长方体：长(size)×宽(0.6size)×高(size)，底面→顶面，每面逆时针
      const a = s          // 半长 (x)
      const c = s          // 半高 (y)
      const b = s * 0.6    // 半宽 (z)
      const v = [
        [-a, -c, -b], [ a, -c, -b], [ a, -c,  b], [-a, -c,  b],  // 底面 ABCD (0-3)
        [-a,  c, -b], [ a,  c, -b], [ a,  c,  b], [-a,  c,  b],  // 顶面 EFGH (4-7)
      ]
      const e = [
        [0,1],[1,2],[2,3],[3,0],  // 底面边
        [4,5],[5,6],[6,7],[7,4],  // 顶面边
        [0,4],[1,5],[2,6],[3,7],  // 侧棱
      ]
      return { vertices: v, edges: e, labels: ['A','B','C','D','E','F','G','H'] }
    },
  }

  return maps[type]?.() || { vertices: [], edges: [], labels: [] }
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
      // 标准直角三棱柱：底面为等腰直角三角形(直角边=size)，高=size
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
      // 标准正四棱锥：底面边长=size，高=size
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
  return ['cube', 'prism', 'pyramid', 'squareFrustum', 'cuboid'].includes(type)
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
  }
  return formulas[type]?.() || 0
}