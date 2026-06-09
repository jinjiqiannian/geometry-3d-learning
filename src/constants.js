// ═══════════════════════════════════════════════════════
//  Constants — 几何维度 · Clean data, no emoji
// ═══════════════════════════════════════════════════════

export const EXAMPLES = [
  {
    id: 'ex1',
    title: '正方体异面直线夹角',
    category: '必修二',
    text: '正方体ABCD-EFGH棱长为2，求异面直线AB与B\'D的夹角。',
    geometryType: 'cube',
    params: { size: 2 },
  },
  {
    id: 'ex2',
    title: '正方体体对角线',
    category: '必修二',
    text: '正方体棱长为2，求体对角线AG的长度。',
    geometryType: 'cube',
    params: { size: 2 },
  },
  {
    id: 'ex3',
    title: '长方体体对角线',
    category: '必修二',
    text: '长方体长3、宽4、高12，求体对角线的长度。',
    geometryType: 'cuboid',
    params: { size: 12 },
  },
  {
    id: 'ex4',
    title: '正四棱锥体积',
    category: '必修二',
    text: '正四棱锥P-ABCD，底面正方形边长为4，高为6，求该棱锥的体积。',
    geometryType: 'pyramid',
    params: { size: 4 },
  },
  {
    id: 'ex5',
    title: '圆柱截面面积',
    category: '必修二',
    text: '圆柱底面半径为2，高为4，过上下底面圆心作轴截面，求截面面积。',
    geometryType: 'cylinder',
    params: { size: 2 },
  },
  {
    id: 'ex6',
    title: '球体体积与表面积',
    category: '必修二',
    text: '已知球体半径为3，求它的体积和表面积。',
    geometryType: 'sphere',
    params: { size: 3 },
  },
  {
    id: 'ex7',
    title: '四棱台体积',
    category: '拓展',
    text: '四棱台上底面边长2，下底面边长4，高为3，求该棱台的体积。',
    geometryType: 'squareFrustum',
    params: { size: 4 },
  },
  {
    id: 'ex8',
    title: '圆锥体积与母线',
    category: '必修二',
    text: '圆锥底面半径为3，高为4，求圆锥的体积和母线长度。',
    geometryType: 'cone',
    params: { size: 3 },
  },
]

export const PRICING_PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    period: '',
    description: '体验 3D 几何可视化',
    features: [
      '完整 3D 可视化',
      'AI 分步解题讲解',
      '支持所有几何题型',
      '每日 50 次',
    ],
    cta: '开始使用',
    popular: false,
  },
  {
    id: 'pro',
    name: '专业版',
    price: 19,
    period: '/月',
    description: '无限 AI 讲解 · 云端同步',
    features: [
      '不限次数 AI 深度讲解',
      '3D 场景逐步骤展示',
      '云端保存解题记录',
      '高清图片导出',
      '年付 ¥190（省 ¥38）',
    ],
    cta: '升级专业版',
    popular: true,
    stripePriceId: 'pro_monthly',
    stripeYearlyId: 'pro_yearly',
  },
  {
    id: 'teacher',
    name: '教师版',
    price: 29,
    period: '/月',
    description: '全套课堂教学工具',
    features: [
      '专业版全部功能',
      '一键导出 PPT 课件',
      '课堂演示模式',
      '批量生成题目',
      '自动生成讲稿',
      '投影仪优化展示',
      '年付 ¥290（省 ¥58）',
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
