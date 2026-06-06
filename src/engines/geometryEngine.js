import * as THREE from 'three'

// 获取几何体的顶点坐标、棱边、标签（所有几何体统一由此提供）
export function getVertexAndEdgeInfo(type, params) {
  const { size = 2 } = params
  const s = size / 2

  const maps = {
    cube: () => {
      const v = [
        [-s,-s,-s],[ s,-s,-s],[ s, s,-s],[-s, s,-s],
        [-s,-s, s],[ s,-s, s],[ s, s, s],[-s, s, s]
      ]
      const e = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
      return { vertices: v, edges: e, labels: ['A','B','C','D','E','F','G','H'] }
    },
    prism: () => {
      const h = s * 1.5
      const v = [
        [-s,-h,-s],[ s,-h,-s],[ 0,-h, s],
        [-s, h,-s],[ s, h,-s],[ 0, h, s]
      ]
      const e = [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]]
      return { vertices: v, edges: e, labels: ['A','B','C','D','E','F'] }
    },
    pyramid: () => {
      const r = s * 1.2
      const v = [
        [-r,-s,-r],[ r,-s,-r],[ r,-s, r],[-r,-s, r],
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
      return { vertices: v, edges: [], labels: ['B','T','E','W','S','N','e','w','s','n'] }
    },
    cone: () => {
      const v = [
        [0,-s,0],[0,s,0],
        [ s,-s,0],[-s,-s,0],[0,-s, s],[0,-s,-s]
      ]
      return { vertices: v, edges: [], labels: ['O','P','E','W','S','N'] }
    }
  }

  return maps[type]?.() || { vertices: [], edges: [], labels: [] }
}

// 创建 Three.js 几何体，顶点坐标与 getVertexAndEdgeInfo 严格一致
export function createGeometry(type, params) {
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
      const h = s * 1.5
      const verts = [
        -s,-h,-s,  s,-h,-s,  0,-h, s,
        -s, h,-s,  s, h,-s,  0, h, s
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
      const r = s * 1.2
      const verts = [
        -r,-s,-r,  r,-s,-r,  r,-s, r, -r,-s, r,
         0, s, 0
      ]
      const indices = [
        0,1,4, 1,2,4, 2,3,4, 3,0,4,
        1,0,3, 1,3,2
      ]
      return createFromArrays(verts, indices)
    }
    case 'sphere':
      return new THREE.SphereGeometry(s, 12, 8)
    case 'cylinder':
      return new THREE.CylinderGeometry(s, s, size, 12)
    case 'cone':
      return new THREE.ConeGeometry(s, size, 12)
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

// 判断是否为棱柱形几何体（可以单独画棱边）
export function isPolyhedral(type) {
  return ['cube', 'prism', 'pyramid'].includes(type)
}

export function calculateVolume(type, params) {
  const { size = 2 } = params
  const formulas = {
    cube:     () => Math.pow(size, 3),
    sphere:   () => (4/3) * Math.PI * Math.pow(size/2, 3),
    cylinder: () => Math.PI * Math.pow(size/2, 2) * size,
    cone:     () => (1/3) * Math.PI * Math.pow(size/2, 2) * size,
    pyramid:  () => (1/3) * Math.pow(size, 2) * size,
    prism:    () => Math.pow(size, 2) * (size * 1.5)
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
    pyramid:  () => Math.pow(size, 2) + 2 * size * Math.sqrt(Math.pow(size, 2) + Math.pow(size, 2)),
    prism:    () => 2 * Math.pow(size, 2) + 4 * size * (size * 1.5)
  }
  return formulas[type]?.() || 0
}