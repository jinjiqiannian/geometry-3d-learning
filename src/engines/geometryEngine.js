import * as THREE from 'three'

// 为各几何体提供精确的顶点和边信息
export function getVertexAndEdgeInfo(type, params) {
  const { size = 2 } = params
  const s = size / 2

  const vertexMaps = {
    cube: () => {
      const verts = [
        [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
        [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]
      ]
      const edges = [
        [0,1],[1,2],[2,3],[3,0],
        [4,5],[5,6],[6,7],[7,4],
        [0,4],[1,5],[2,6],[3,7]
      ]
      return { vertices: verts, edges, labels: ['A','B','C','D','E','F','G','H'] }
    },
    prism: () => {
      const verts = [
        [-s, -size*0.75, -s], [s, -size*0.75, -s], [0, -size*0.75, s],
        [-s, size*0.75, -s], [s, size*0.75, -s], [0, size*0.75, s]
      ]
      const edges = [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]]
      return { vertices: verts, edges, labels: ['A','B','C','D','E','F'] }
    },
    pyramid: () => {
      const r = s
      const verts = [
        [-r, -s, -r], [r, -s, -r], [r, -s, r], [-r, -s, r],
        [0, s, 0]
      ]
      const edges = [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]]
      return { vertices: verts, edges, labels: ['A','B','C','D','P'] }
    }
  }

  return vertexMaps[type]?.() || { vertices: [], edges: [], labels: [] }
}

export function createGeometry(type, params) {
  const { size = 2 } = params

  switch(type) {
    case 'cube':
      return new THREE.BoxGeometry(size, size, size)
    
    case 'sphere':
      return new THREE.SphereGeometry(size / 2, 32, 32)
    
    case 'cylinder':
      return new THREE.CylinderGeometry(size / 2, size / 2, size, 32)
    
    case 'cone':
      return new THREE.ConeGeometry(size / 2, size, 32)
    
    case 'pyramid':
      return new THREE.TetrahedronGeometry(size * 1.2)
    
    case 'prism':
      return new THREE.BoxGeometry(size, size * 1.5, size)
    
    default:
      return new THREE.BoxGeometry(size, size, size)
  }
}

export function calculateVolume(type, params) {
  const { size = 2 } = params
  
  const formulas = {
    cube: () => Math.pow(size, 3),
    sphere: () => (4/3) * Math.PI * Math.pow(size/2, 3),
    cylinder: () => Math.PI * Math.pow(size/2, 2) * size,
    cone: () => (1/3) * Math.PI * Math.pow(size/2, 2) * size,
    pyramid: () => (1/3) * Math.pow(size, 2) * size,
    prism: () => Math.pow(size, 2) * (size * 1.5)
  }

  return formulas[type]?.() || 0
}

export function calculateSurfaceArea(type, params) {
  const { size = 2 } = params
  
  const formulas = {
    cube: () => 6 * Math.pow(size, 2),
    sphere: () => 4 * Math.PI * Math.pow(size/2, 2),
    cylinder: () => 2 * Math.PI * (size/2) * (size + size/2),
    cone: () => Math.PI * (size/2) * (size/2 + Math.sqrt(Math.pow(size/2, 2) + Math.pow(size, 2))),
    pyramid: () => Math.pow(size, 2) + 2 * size * Math.sqrt(Math.pow(size, 2) + Math.pow(size, 2)),
    prism: () => 2 * Math.pow(size, 2) + 4 * size * (size * 1.5)
  }

  return formulas[type]?.() || 0
}
