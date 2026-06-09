// ═══════════════════════════════════════════════════════
//  Constants — MathViz · Clean data, no emoji
// ═══════════════════════════════════════════════════════

export const EXAMPLES = [
  {
    id: 'ex-1',
    title: '正方体异面直线夹角',
    category: '立体几何',
    text: '正方体ABCD-EFGH棱长为2，求异面直线AB与B\'D的夹角。',
  },
  {
    id: 'ex-2',
    title: '棱锥体积计算',
    category: '立体几何',
    text: '正三棱锥P-ABC，底面边长3，高为4，求三棱锥的体积。',
  },
  {
    id: 'ex-3',
    title: '球体内接正方体',
    category: '立体几何',
    text: '球体半径为3，求其内接正方体的棱长。',
  },
  {
    id: 'ex-4',
    title: '长方体对角线',
    category: '立体几何',
    text: '长方体长3宽4高12，求体对角线的长度。',
  },
  {
    id: 'ex-5',
    title: '圆柱截面面积',
    category: '立体几何',
    text: '圆柱底面半径2，高4，过上下底面中心作截面，求截面面积。',
  },
  {
    id: 'ex-6',
    title: '棱台体积',
    category: '立体几何',
    text: '正四棱台上底面边长2，下底面边长4，高3，求体积。',
  },
]

export const PRICING_PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    period: '/月',
    description: '开始探索数学可视化世界',
    features: [
      '每日 50 次生成',
      '完整 3D 可视化',
      '分步解题讲解',
      '本地模板引擎',
    ],
    cta: '开始使用',
    popular: false,
  },
  {
    id: 'pro',
    name: '专业版',
    price: 19,
    period: '/月',
    description: '无限使用 · 云端同步',
    features: [
      '无限次生成',
      '云端同步与历史',
      '优先 AI 访问',
      '高清图片导出',
      '年付省 ¥48（¥190/年）',
    ],
    cta: '升级专业版',
    popular: true,
    stripePriceId: 'pro_monthly',
    stripeYearlyId: 'pro_yearly',
  },
  {
    id: 'teacher',
    name: '教师版',
    price: 39,
    period: '/月',
    description: '全套课堂教学工具',
    features: [
      '专业版全部功能',
      '一键导出 PPT',
      '课堂演示模式',
      '批量生成题目',
      '课程收藏管理',
      '投影仪优化展示',
      '年付省 ¥78（¥390/年）',
    ],
    cta: '升级教师版',
    popular: false,
    stripePriceId: 'teacher_monthly',
    stripeYearlyId: 'teacher_yearly',
  },
]

export const GEOMETRY_NAMES = {
  cube: '正方体',
  sphere: '球体',
  cylinder: '圆柱体',
  cone: '圆锥体',
  pyramid: '棱锥',
  prism: '棱柱',
  squareFrustum: '四棱台',
  circularFrustum: '圆台',
  cuboid: '长方体',
}

export const GEOMETRIES = [
  { id: 'cube', name: '正方体' },
  { id: 'sphere', name: '球体' },
  { id: 'cylinder', name: '圆柱体' },
  { id: 'cone', name: '圆锥体' },
  { id: 'pyramid', name: '棱锥' },
  { id: 'prism', name: '棱柱' },
  { id: 'squareFrustum', name: '四棱台' },
  { id: 'circularFrustum', name: '圆台' },
  { id: 'cuboid', name: '长方体' },
]

export const FORMULAS = {
  cube: { volume: 'V = a³', surface: 'S = 6a²' },
  sphere: { volume: 'V = (4/3)πr³', surface: 'S = 4πr²' },
  cylinder: { volume: 'V = πr²h', surface: 'S = 2πr(r+h)' },
  cone: { volume: 'V = (1/3)πr²h', surface: 'S = πr(r+l)' },
  pyramid: { volume: 'V = (1/3)a²h', surface: 'S = a² + 2a√(h²+(a/2)²)' },
  prism: { volume: 'V = (1/2)a²h', surface: 'S = (3+√2)a²' },
  squareFrustum: { volume: 'V = h/3·(S₁+S₂+√(S₁S₂))', surface: 'S = S₁+S₂+2(a+b)√(h²+((a-b)/2)²)' },
  circularFrustum: { volume: 'V = πh/3·(R²+r²+Rr)', surface: 'S = π(R+r)l+π(R²+r²)' },
  cuboid: { volume: 'V = abc', surface: 'S = 2(ab+bc+ac)' },
}
