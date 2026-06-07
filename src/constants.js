// 几何体名称映射（中文）
export const GEOMETRY_NAMES = {
  cube: '正方体',
  sphere: '球体',
  cylinder: '圆柱',
  cone: '圆锥',
  pyramid: '棱锥',
  prism: '棱柱'
}

// 几何体列表（含图标）
export const GEOMETRIES = [
  { id: 'cube', name: '正方体', icon: '🟦' },
  { id: 'sphere', name: '球体', icon: '🔵' },
  { id: 'cylinder', name: '圆柱', icon: '🫙' },
  { id: 'cone', name: '圆锥', icon: '🔺' },
  { id: 'pyramid', name: '棱锥', icon: '🔻' },
  { id: 'prism', name: '棱柱', icon: '📐' },
]

// 公式展示（用于 UI）
export const FORMULAS = {
  cube: {
    volume: 'V = a³',
    surface: 'S = 6a²'
  },
  sphere: {
    volume: 'V = (4/3)πr³',
    surface: 'S = 4πr²'
  },
  cylinder: {
    volume: 'V = πr²h',
    surface: 'S = 2πr(r+h)'
  },
  cone: {
    volume: 'V = (1/3)πr²h',
    surface: 'S = πr(r+l)'
  },
  pyramid: {
    volume: 'V = (1/3)a²h',
    surface: 'S = a² + 2a√(h²+(a/2)²)'
  },
  prism: {
    volume: 'V = (1/2)a²h',
    surface: 'S = (3+√2)a²'
  }
}
