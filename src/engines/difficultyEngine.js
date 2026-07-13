// ═══════════════════════════════════════════════════════
//  DifficultyEngine — 基于历史的自适应难度推荐
// ═══════════════════════════════════════════════════════

export const DIFFICULTY_LEVELS = {
  easy: ['cube', 'cuboid'],
  medium: ['cylinder', 'cone', 'sphere'],
  hard: ['pyramid', 'prism', 'squareFrustum', 'circularFrustum'],
}

export const SKILL_LEVELS = {
  beginner: { name: '基础认知', description: '认识几何体，掌握基本概念', color: '#52c41a' },
  intermediate: { name: '简单应用', description: '运用公式解决基础问题', color: '#4a90e2' },
  advanced: { name: '综合解题', description: '综合运用知识解决复杂问题', color: '#faad14' },
  expert: { name: '高手进阶', description: '挑战高难度题目', color: '#ff6b6b' },
}

export const TOPIC_CATEGORIES = {
  'vertices-edges': { name: '点线面认知', description: '认识几何体的基本构成', difficulty: 'beginner' },
  'length-distance': { name: '长度与距离', description: '计算线段长度和空间距离', difficulty: 'beginner' },
  'angle-calculation': { name: '角度计算', description: '计算空间角', difficulty: 'intermediate' },
  'area-surface': { name: '面积与表面积', description: '计算面积和表面积', difficulty: 'intermediate' },
  'volume': { name: '体积计算', description: '计算几何体体积', difficulty: 'intermediate' },
  'diagonal-space': { name: '空间对角线', description: '计算空间对角线', difficulty: 'advanced' },
  'section-cut': { name: '截面问题', description: '分析几何体截面', difficulty: 'advanced' },
  'comprehensive': { name: '综合应用', description: '综合运用几何知识', difficulty: 'expert' },
}

const PROBLEM_POOL = {
  cube: [
    { type: 'cube', title: '正方体棱长识别', text: '正方体有多少条棱？多少个顶点？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['正方体'] },
    { type: 'cube', title: '正方体面对角线', text: '正方体棱长为2，求面对角线AC的长度。', skill: 'beginner', topic: 'length-distance', knowledgePoints: ['正方体', '对角线'] },
    { type: 'cube', title: '正方体体对角线', text: '正方体棱长为2，求体对角线AG的长度。', skill: 'intermediate', topic: 'diagonal-space', knowledgePoints: ['正方体', '对角线'] },
    { type: 'cube', title: '正方体表面积', text: '正方体棱长为3，求它的表面积。', skill: 'intermediate', topic: 'area-surface', knowledgePoints: ['正方体', '表面积'] },
    { type: 'cube', title: '正方体体积', text: '正方体棱长为4，求它的体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['正方体', '体积'] },
  ],
  cuboid: [
    { type: 'cuboid', title: '长方体棱长识别', text: '长方体有多少条棱？可分为几组？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['长方体'] },
    { type: 'cuboid', title: '长方体棱长总和', text: '长方体长3、宽4、高5，求棱长总和。', skill: 'beginner', topic: 'length-distance', knowledgePoints: ['长方体'] },
    { type: 'cuboid', title: '长方体体对角线', text: '长方体长3、宽4、高12，求体对角线长。', skill: 'intermediate', topic: 'diagonal-space', knowledgePoints: ['长方体', '对角线'] },
    { type: 'cuboid', title: '长方体表面积', text: '长方体长4、宽3、高2，求表面积。', skill: 'intermediate', topic: 'area-surface', knowledgePoints: ['长方体', '表面积'] },
    { type: 'cuboid', title: '长方体体积', text: '长方体长5、宽4、高3，求体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['长方体', '体积'] },
  ],
  sphere: [
    { type: 'sphere', title: '球体基本特征', text: '球体有几个面？球心到表面各点距离有什么特点？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['球'] },
    { type: 'sphere', title: '球体表面积', text: '已知球体半径为3，求它的表面积。', skill: 'intermediate', topic: 'area-surface', knowledgePoints: ['球', '表面积'] },
    { type: 'sphere', title: '球体体积', text: '已知球体半径为4，求它的体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['球', '体积'] },
    { type: 'sphere', title: '球体直径与半径', text: '球体直径为10，求表面积和体积。', skill: 'advanced', topic: 'comprehensive', knowledgePoints: ['球'] },
  ],
  cylinder: [
    { type: 'cylinder', title: '圆柱基本特征', text: '圆柱有几个底面？侧面展开是什么形状？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['圆柱'] },
    { type: 'cylinder', title: '圆柱侧面积', text: '圆柱底面半径为2，高为4，求侧面积。', skill: 'intermediate', topic: 'area-surface', knowledgePoints: ['圆柱'] },
    { type: 'cylinder', title: '圆柱表面积', text: '圆柱底面半径为3，高为5，求表面积。', skill: 'intermediate', topic: 'area-surface', knowledgePoints: ['圆柱', '表面积'] },
    { type: 'cylinder', title: '圆柱体积', text: '圆柱底面半径为2，高为6，求体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['圆柱', '体积'] },
    { type: 'cylinder', title: '圆柱截面面积', text: '圆柱底面半径为2，高为4，求轴截面面积。', skill: 'advanced', topic: 'section-cut', knowledgePoints: ['圆柱'] },
  ],
  cone: [
    { type: 'cone', title: '圆锥基本特征', text: '圆锥有几个面？侧面展开是什么形状？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['圆锥'] },
    { type: 'cone', title: '圆锥体积', text: '圆锥底面半径为3，高为4，求体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['圆锥', '体积'] },
    { type: 'cone', title: '圆锥母线', text: '圆锥底面半径为3，高为4，求母线长度。', skill: 'intermediate', topic: 'length-distance', knowledgePoints: ['圆锥'] },
    { type: 'cone', title: '圆锥表面积', text: '圆锥底面半径为3，母线长5，求表面积。', skill: 'advanced', topic: 'area-surface', knowledgePoints: ['圆锥', '表面积'] },
  ],
  pyramid: [
    { type: 'pyramid', title: '四棱锥基本特征', text: '正四棱锥有几个面？几条棱？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['四棱锥'] },
    { type: 'pyramid', title: '四棱锥体积', text: '正四棱锥底面边长4，高6，求体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['四棱锥', '体积'] },
    { type: 'pyramid', title: '四棱锥表面积', text: '正四棱锥底面边长4，斜高为5，求表面积。', skill: 'advanced', topic: 'area-surface', knowledgePoints: ['四棱锥', '表面积'] },
  ],
  prism: [
    { type: 'prism', title: '三棱柱基本特征', text: '三棱柱有几个面？几条棱？', skill: 'beginner', topic: 'vertices-edges', knowledgePoints: ['三棱柱'] },
    { type: 'prism', title: '三棱柱体积', text: '三棱柱底面为正三角形，边长2，棱柱高5，求体积。', skill: 'intermediate', topic: 'volume', knowledgePoints: ['三棱柱', '体积'] },
    { type: 'prism', title: '三棱柱表面积', text: '三棱柱底面为正三角形，边长2，棱柱高5，求表面积。', skill: 'advanced', topic: 'area-surface', knowledgePoints: ['三棱柱', '表面积'] },
  ],
  squareFrustum: [
    { type: 'squareFrustum', title: '四棱台体积', text: '四棱台上底面边长2，下底面边长4，高3，求体积。', skill: 'advanced', topic: 'volume', knowledgePoints: ['四棱台', '体积'] },
  ],
  circularFrustum: [
    { type: 'circularFrustum', title: '圆台体积', text: '圆台上底半径3，下底半径5，高4，求体积。', skill: 'advanced', topic: 'volume', knowledgePoints: ['圆台', '体积'] },
  ],
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

/**
 * 根据技能等级获取题目
 * @param {string} skillLevel — beginner/intermediate/advanced/expert
 * @param {number} count — 返回题目数量
 * @returns {Array} 题目列表
 */
export function getProblemsBySkill(skillLevel, count = 5) {
  const allProblems = []
  Object.values(PROBLEM_POOL).forEach(geometryProblems => {
    allProblems.push(...geometryProblems)
  })

  const filtered = allProblems.filter(p => p.skill === skillLevel)
  
  const shuffled = [...filtered].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * 根据专题获取题目
 * @param {string} topic — 专题分类
 * @param {number} count — 返回题目数量
 * @returns {Array} 题目列表
 */
export function getProblemsByTopic(topic, count = 5) {
  const allProblems = []
  Object.values(PROBLEM_POOL).forEach(geometryProblems => {
    allProblems.push(...geometryProblems)
  })

  const filtered = allProblems.filter(p => p.topic === topic)
  
  const shuffled = [...filtered].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * 生成每日练习计划
 * @param {Array} history — 用户历史记录
 * @returns {Object} 练习计划
 */
export function generateDailyPractice(history) {
  const stats = analyzeHistory(history)
  const plan = {
    skillLevel: stats.level,
    problems: [],
    focusArea: '',
  }

  const skillLevel = stats.level === 'beginner' ? 'beginner'
    : stats.level === 'intermediate' ? 'intermediate'
    : 'advanced'

  const problems = getProblemsBySkill(skillLevel, 5)
  
  plan.problems = problems
  plan.focusArea = SKILL_LEVELS[skillLevel].name

  return plan
}

/**
 * 获取所有专题分类
 * @returns {Array} 专题列表
 */
export function getAllTopics() {
  return Object.entries(TOPIC_CATEGORIES).map(([key, value]) => ({
    key,
    ...value,
  }))
}

/**
 * 获取所有技能等级
 * @returns {Array} 技能等级列表
 */
export function getAllSkillLevels() {
  return Object.entries(SKILL_LEVELS).map(([key, value]) => ({
    key,
    ...value,
  }))
}

/**
 * 计算用户技能等级
 * @param {Array} history — 用户历史记录
 * @returns {Object} 技能等级信息
 */
export function calculateUserSkill(history) {
  const stats = analyzeHistory(history)
  
  let level = 'beginner'
  let progress = 0

  const total = stats.totalProblems
  
  if (total >= 20) {
    level = 'expert'
    progress = Math.min(100, (total - 20) / 10 * 100)
  } else if (total >= 10) {
    level = 'advanced'
    progress = (total - 10) / 10 * 100
  } else if (total >= 5) {
    level = 'intermediate'
    progress = (total - 5) / 5 * 100
  } else {
    level = 'beginner'
    progress = total / 5 * 100
  }

  return {
    level,
    progress,
    ...SKILL_LEVELS[level],
    totalProblems: total,
  }
}
