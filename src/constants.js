// ═══════════════════════════════════════════════════════
//  示例题库 + 定价方案 — MathViz SaaS
// ═══════════════════════════════════════════════════════

export const EXAMPLES = [
  {
    id: 'ex-1',
    title: '正方体异面直线夹角',
    icon: '📐',
    category: '立体几何',
    text: '正方体ABCD-EFGH棱长为2，求异面直线AB与B\'D的夹角。',
    color: '#4A90E2',
  },
  {
    id: 'ex-2',
    title: '三棱锥体积计算',
    icon: '🔺',
    category: '立体几何',
    text: '正三棱锥P-ABC，底面边长3，高为4，求三棱锥的体积。',
    color: '#43A047',
  },
  {
    id: 'ex-3',
    title: '球体内接正方体',
    icon: '🔵',
    category: '立体几何',
    text: '球体半径为3，求其内接正方体的棱长。',
    color: '#E53935',
  },
  {
    id: 'ex-4',
    title: '长方体对角线长度',
    icon: '🧱',
    category: '立体几何',
    text: '长方体长3宽4高12，求体对角线的长度。',
    color: '#FB8C00',
  },
  {
    id: 'ex-5',
    title: '圆柱截面面积',
    icon: '🔷',
    category: '立体几何',
    text: '圆柱底面半径2，高4，过上下底面中心作截面，求截面面积。',
    color: '#8E24AA',
  },
  {
    id: 'ex-6',
    title: '四棱台体积公式',
    icon: '🏛️',
    category: '立体几何',
    text: '正四棱台上底面边长2，下底面边长4，高3，求体积。',
    color: '#00ACC1',
  },
]

export const PRICING_PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    period: '/月',
    description: '入门体验数学可视化',
    icon: '🎓',
    color: 'var(--color-free)',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
    features: [
      '每日 3 次生成',
      '基础 3D 可视化',
      '前 2 步解题展示',
      '本地模板讲解',
      '1 个示例体验',
    ],
    cta: '免费开始',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: '/月',
    description: '无限生成 · AI深度讲解',
    icon: '⭐',
    color: 'var(--color-pro)',
    gradient: 'var(--color-pro-gradient)',
    features: [
      '无限次生成',
      '完整 AI 解题步骤',
      '高清图片导出',
      '历史记录保存',
      '优先更新',
      '年付省 17%（¥190/年）',
    ],
    cta: '升级 Pro',
    popular: true,
    stripePriceId: 'pro_monthly',
    stripeYearlyId: 'pro_yearly',
  },
  {
    id: 'teacher',
    name: '教师版',
    price: 39,
    period: '/月',
    description: '全套教学工具 · PPT导出',
    icon: '💼',
    color: 'var(--color-teacher)',
    gradient: 'var(--color-teacher-gradient)',
    features: [
      'Pro 全部功能',
      '一键 PPT 导出',
      '课堂演示模式',
      '批量题目生成',
      '课程保存管理',
      '投屏优化',
      '年付省 17%（¥390/年）',
    ],
    cta: '升级教师版',
    popular: false,
    stripePriceId: 'teacher_monthly',
    stripeYearlyId: 'teacher_yearly',
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
