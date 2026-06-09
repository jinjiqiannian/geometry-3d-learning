// ═══════════════════════════════════════════════════════
//  Constants — MathViz · Clean data, no emoji
// ═══════════════════════════════════════════════════════

export const EXAMPLES = [
  {
    id: 'ex-1',
    title: 'Cube skew line angle',
    category: 'Solid geometry',
    text: '正方体ABCD-EFGH棱长为2，求异面直线AB与B\'D的夹角。',
  },
  {
    id: 'ex-2',
    title: 'Pyramid volume',
    category: 'Solid geometry',
    text: '正三棱锥P-ABC，底面边长3，高为4，求三棱锥的体积。',
  },
  {
    id: 'ex-3',
    title: 'Sphere inscribed cube',
    category: 'Solid geometry',
    text: '球体半径为3，求其内接正方体的棱长。',
  },
  {
    id: 'ex-4',
    title: 'Cuboid diagonal',
    category: 'Solid geometry',
    text: '长方体长3宽4高12，求体对角线的长度。',
  },
  {
    id: 'ex-5',
    title: 'Cylinder cross section',
    category: 'Solid geometry',
    text: '圆柱底面半径2，高4，过上下底面中心作截面，求截面面积。',
  },
  {
    id: 'ex-6',
    title: 'Frustum volume',
    category: 'Solid geometry',
    text: '正四棱台上底面边长2，下底面边长4，高3，求体积。',
  },
]

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/mo',
    description: 'Start exploring math visualization',
    features: [
      '50 generations / day',
      'Full 3D visualization',
      'Step-by-step solutions',
      'Local template engine',
    ],
    cta: 'Get started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: '/mo',
    description: 'Unlimited access · Cloud sync',
    features: [
      'Unlimited generations',
      'Cloud sync & history',
      'Priority AI access',
      'HD image export',
      'Save ¥48 with yearly (¥190/yr)',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    stripePriceId: 'pro_monthly',
    stripeYearlyId: 'pro_yearly',
  },
  {
    id: 'teacher',
    name: 'Teacher',
    price: 39,
    period: '/mo',
    description: 'Full classroom toolkit',
    features: [
      'Everything in Pro',
      'One-click PPT export',
      'Classroom presentation mode',
      'Batch generation',
      'Course collections',
      'Projector-optimized',
      'Save ¥78 with yearly (¥390/yr)',
    ],
    cta: 'Upgrade to Teacher',
    popular: false,
    stripePriceId: 'teacher_monthly',
    stripeYearlyId: 'teacher_yearly',
  },
]

export const GEOMETRY_NAMES = {
  cube: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  pyramid: 'Pyramid',
  prism: 'Prism',
  squareFrustum: 'Square Frustum',
  circularFrustum: 'Circular Frustum',
  cuboid: 'Cuboid',
}

export const GEOMETRIES = [
  { id: 'cube', name: 'Cube' },
  { id: 'sphere', name: 'Sphere' },
  { id: 'cylinder', name: 'Cylinder' },
  { id: 'cone', name: 'Cone' },
  { id: 'pyramid', name: 'Pyramid' },
  { id: 'prism', name: 'Prism' },
  { id: 'squareFrustum', name: 'Square Frustum' },
  { id: 'circularFrustum', name: 'Circular Frustum' },
  { id: 'cuboid', name: 'Cuboid' },
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
