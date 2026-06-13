// ═══════════════════════════════════════════════════════
//  DifficultyEngine — 基于历史的自适应难度推荐
// ═══════════════════════════════════════════════════════

export const DIFFICULTY_LEVELS = {
  easy: ['cube', 'cuboid'],
  medium: ['cylinder', 'cone', 'sphere'],
  hard: ['pyramid', 'prism', 'squareFrustum', 'circularFrustum'],
}

const RECOMMEND_POOL = {
  cube: { type: 'cube', title: '正方体对角线', text: '正方体棱长为2，求体对角线AG的长度。' },
  cuboid: { type: 'cuboid', title: '长方体体对角线', text: '长方体长3、宽4、高12，求体对角线长。' },
  sphere: { type: 'sphere', title: '球体体积与表面积', text: '已知球体半径为3，求它的体积和表面积。' },
  cylinder: { type: 'cylinder', title: '圆柱截面面积', text: '圆柱底面半径为2，高为4，求轴截面面积。' },
  cone: { type: 'cone', title: '圆锥体积与母线', text: '圆锥底面半径为3，高为4，求体积和母线长度。' },
  pyramid: { type: 'pyramid', title: '正四棱锥体积', text: '正四棱锥底面边长4，高6，求体积。' },
  prism: { type: 'prism', title: '三棱柱体积', text: '三棱柱底面为正三角形，边长2，棱柱高5，求体积。' },
  squareFrustum: { type: 'squareFrustum', title: '四棱台体积', text: '四棱台上底面边长2，下底面边长4，高3，求体积。' },
  circularFrustum: { type: 'circularFrustum', title: '圆台体积', text: '圆台上底半径3，下底半径5，高4，求体积。' },
}

/**
 * 分析用户历史记录
 * @param {Array} history — localStorage 中的历史数组
 * @returns {Object} 统计数据
 */
export function analyzeHistory(history) {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return {
      totalProblems: 0,
      typedCount: {},
      unused: Object.keys(RECOMMEND_POOL),
      level: 'beginner',
    }
  }

  const typedCount = {}
  for (const item of history) {
    const t = item.type || 'unknown'
    typedCount[t] = (typedCount[t] || 0) + 1
  }

  const total = history.length
  const unused = Object.keys(RECOMMEND_POOL).filter(t => !typedCount[t])

  let level = 'beginner'
  if (total >= 10) level = 'advanced'
  else if (total >= 3) level = 'intermediate'

  return { totalProblems: total, typedCount, unused, level }
}

/**
 * 根据历史推荐题目
 * @param {Array} history — 历史数组
 * @returns {{ recommendations: Array, reason: string }}
 */
export function recommendProblems(history) {
  const stats = analyzeHistory(history)

  // 新手：默认推荐
  if (stats.totalProblems === 0) {
    return {
      recommendations: [
        { ...RECOMMEND_POOL.cube, reason: '入门推荐', difficulty: 'easy' },
        { ...RECOMMEND_POOL.cylinder, reason: '热门题型', difficulty: 'medium' },
        { ...RECOMMEND_POOL.pyramid, reason: '进阶挑战', difficulty: 'hard' },
      ],
      reason: '从基础开始，逐步进阶',
    }
  }

  const recommendations = []

  // 优先：用户未做过的类型
  for (const t of stats.unused) {
    if (recommendations.length >= 3) break
    const rec = RECOMMEND_POOL[t]
    if (rec) {
      const diff = DIFFICULTY_LEVELS.easy.includes(t) ? 'easy'
        : DIFFICULTY_LEVELS.medium.includes(t) ? 'medium' : 'hard'
      recommendations.push({ ...rec, reason: '未探索的题型', difficulty: diff })
    }
  }

  // 补充：根据等级推荐
  if (recommendations.length < 3) {
    const preferred = stats.level === 'advanced'
      ? [...DIFFICULTY_LEVELS.hard, ...DIFFICULTY_LEVELS.medium]
      : stats.level === 'intermediate'
        ? [...DIFFICULTY_LEVELS.medium, ...DIFFICULTY_LEVELS.hard]
        : [...DIFFICULTY_LEVELS.easy, ...DIFFICULTY_LEVELS.medium]

    for (const t of preferred) {
      if (recommendations.length >= 3) break
      if (recommendations.find(r => r.type === t)) continue
      const rec = RECOMMEND_POOL[t]
      if (rec) {
        const diff = DIFFICULTY_LEVELS.easy.includes(t) ? 'easy'
          : DIFFICULTY_LEVELS.medium.includes(t) ? 'medium' : 'hard'
        recommendations.push({ ...rec, reason: '推荐练习', difficulty: diff })
      }
    }
  }

  return {
    recommendations: recommendations.slice(0, 3),
    reason: stats.totalProblems >= 10
      ? '你已经掌握很多题型了，挑战更难的！'
      : stats.totalProblems >= 3
        ? '继续探索更多几何体类型'
        : '从基础题型开始',
  }
}
