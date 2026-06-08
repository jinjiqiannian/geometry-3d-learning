// ═══════════════════════════════════════════════════════
//  模块定义 — 数学可视化学习平台
// ═══════════════════════════════════════════════════════

export const MODULES = [
  {
    id: 'geometry-3d',
    name: '立体几何',
    icon: '📐',
    description: '交互式 3D 几何体探索，支持正方体、棱柱、棱锥等 9 种几何体',
    path: '/geometry-3d',
    color: '#4A90E2',
    available: true,
  },
  {
    id: 'geometry-2d',
    name: '平面几何',
    icon: '📏',
    description: '三角形、四边形、圆的几何性质与定理可视化',
    path: '/geometry-2d',
    color: '#43A047',
    available: false,
  },
  {
    id: 'functions',
    name: '函数图像',
    icon: '📈',
    description: '一次函数、二次函数、三角函数的图像绘制与变换',
    path: '/functions',
    color: '#E53935',
    available: false,
  },
  {
    id: 'vectors',
    name: '空间向量',
    icon: '🧭',
    description: '空间向量的加法、数乘、点积与叉积可视化',
    path: '/vectors',
    color: '#FB8C00',
    available: false,
  },
  {
    id: 'analytic-geometry',
    name: '解析几何',
    icon: '📊',
    description: '直线、圆、圆锥曲线的方程与图形对应关系',
    path: '/analytic-geometry',
    color: '#8E24AA',
    available: false,
  },
  {
    id: 'statistics',
    name: '概率统计',
    icon: '🎲',
    description: '数据分布、概率模型与统计图表的交互展示',
    path: '/statistics',
    color: '#00ACC1',
    available: false,
  },
  {
    id: 'toolbox',
    name: '数学工具箱',
    icon: '🧰',
    description: '计算器、单位换算、公式手册等实用工具集合',
    path: '/toolbox',
    color: '#546E7A',
    available: false,
  },
]

// 几何体名称映射（中文）
export const GEOMETRY_NAMES = {
  cube: '正方体',
  sphere: '球体',
  cylinder: '圆柱',
  cone: '圆锥',
  pyramid: '棱锥',
  prism: '棱柱',
  squareFrustum: '四棱台',
  circularFrustum: '圆台',
  cuboid: '长方体',
}

// 几何体列表（含图标）
export const GEOMETRIES = [
  { id: 'cube', name: '正方体', icon: '🟦' },
  { id: 'sphere', name: '球体', icon: '🔵' },
  { id: 'cylinder', name: '圆柱', icon: '🔷' },
  { id: 'cone', name: '圆锥', icon: '🔺' },
  { id: 'pyramid', name: '棱锥', icon: '🔻' },
  { id: 'prism', name: '棱柱', icon: '📐' },
  { id: 'squareFrustum', name: '四棱台', icon: '🏛️' },
  { id: 'circularFrustum', name: '圆台', icon: '🪣' },
  { id: 'cuboid', name: '长方体', icon: '🧱' },
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
  },
  squareFrustum: {
    volume: 'V = h/3·(S₁+S₂+√(S₁S₂))',
    surface: 'S = S₁+S₂+2(a+b)√(h²+((a-b)/2)²)'
  },
  circularFrustum: {
    volume: 'V = πh/3·(R²+r²+Rr)',
    surface: 'S = π(R+r)l+π(R²+r²)'
  },
  cuboid: {
    volume: 'V = abc',
    surface: 'S = 2(ab+bc+ac)'
  },
}
