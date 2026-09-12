/**
 * @module proofGenerator
 * @description 证明生成器 - 组合事实提取和规则匹配，生成完整证明步骤
 * @author Geometry 3D Learning
 */

import { extractFacts, extractImportantPlanes, extractVertices } from './factExtractor.js'
import { matchRules } from './ruleMatcher.js'
import { tryV2Proof } from './v2/adapter.js'

// 中性几何体名：不带「正」等题目未确认的形状断言
const NEUTRAL_NAMES = {
  cube: '正方体',
  cuboid: '长方体',
  prism: '棱柱',
  pyramid: '四棱锥',
  tetrahedron: '三棱锥',
  octahedron: '正八面体',
  cylinder: '圆柱',
  cone: '圆锥',
  sphere: '球',
  squareFrustum: '棱台',
  circularFrustum: '圆台',
}

/** 把内部关系格式（如 "PD perpendicular plane ABCD"）转成中文 */
function prettyRelation(rel) {
  const r = String(rel)
  const mid = r.match(/^(\S+)\s+midpoint\s+(\S+)$/i)
  if (mid) return `${mid[1]} 是 ${mid[2]} 的中点`
  return r
    .replace(/\s+perpendicular\s+plane\s+/i, ' ⊥ 平面 ')
    .replace(/\s+perpendicular\s+/i, ' ⊥ ')
    .replace(/\s+parallel\s+plane\s+/i, ' ∥ 平面 ')
    .replace(/\s+parallel\s+/i, ' ∥ ')
    .replace(/\s+intersection\s+/i, ' 与 ')
    .replace(/\s+on\s+/i, ' 在 ')
}

/** 证明/求解目标转中文：{type:'perpendicular', subjects:['PA','BD']} → "证明 PA ⊥ BD" */
function goalToText(goal) {
  if (!goal || !Array.isArray(goal.subjects) || goal.subjects.length < 2) return ''
  const [a, b] = goal.subjects
  if (goal.type === 'ratio') return `求 ${a}/${b} 的值`
  // 3个及以上字母视为平面（PA⊥平面ABC），2个字母是线段（PA⊥BD）
  const letterCount = String(b).replace(/[^A-Za-z]/g, '').length
  const target = letterCount >= 3 ? `平面 ${b}` : b
  if (goal.type === 'perpendicular') return `证明 ${a} ⊥ ${target}`
  if (goal.type === 'parallel') return `证明 ${a} ∥ ${target}`
  return ''
}

/**
 * 证明步骤
 * @typedef {Object} ProofStep
 * @property {number} step - 步骤序号
 * @property {string} title - 步骤标题
 * @property {string} content - 步骤内容（自然语言描述）
 * @property {string} type - 步骤类型: observation, construction, calculation, conclusion, inference
 * @property {string} [formula] - 涉及的公式
 * @property {string} [rule] - 使用的推理规则名称
 */

/**
 * 生成证明步骤 — V2 规则引擎优先，失败时回退 V1 模板路径
 * @param {Object} ctx - 上下文对象，包含 semantic, relations, planes, vertices 等
 * @returns {ProofStep[]} 证明步骤列表
 */
export function generateProof(ctx) {
  // ── V2 主流程 ──
  const v2Steps = tryV2Proof(ctx)
  if (v2Steps && v2Steps.length > 0) {
    return v2Steps
  }

  // ── V1 回退（模板观察步骤 + 规则匹配） ──
  const steps = []
  let stepCounter = 1

  const allFacts = [
    ...extractFacts(ctx),
    ...extractImportantPlanes(ctx),
    ...extractVertices(ctx),
  ]

  // 首步只陈述从题目真实提取到的信息，不编造「正四棱锥/尺寸」等未给条件
  const goalList =
    Array.isArray(ctx.goals) && ctx.goals.length > 0
      ? ctx.goals
      : ctx.goal
        ? [ctx.goal]
        : []
  const goalTexts = goalList.map(goalToText).filter(Boolean)
  const shapeName = NEUTRAL_NAMES[ctx.type] || ctx.typeName || ''
  const labelStr = (ctx.semantic?.points || ctx.vertices || []).join('、')

  const firstStepLines = []
  if (shapeName) {
    firstStepLines.push(`几何体：${shapeName}${labelStr ? `（顶点：${labelStr}）` : ''}`)
  }
  if (goalTexts.length > 0) {
    firstStepLines.push(`题目要求：${goalTexts.join('；')}。`)
  }
  steps.push({
    step: stepCounter++,
    title: '已知条件分析',
    content:
      firstStepLines.length > 0
        ? firstStepLines.join('\n')
        : '请先明确题目中的几何体与已知条件，再逐项分析。',
    type: 'observation',
  })

  if (allFacts.length > 0 || ctx.relations?.length > 0) {
    // 只展示有效关系（垂直/平行/中点等），点线面的「存在」枚举是噪音
    const displayFacts = [
      ...allFacts
        .filter((f) =>
          /perpendicular|parallel|midpoint|\bon\b|intersection/i.test(f.description)
        )
        .map((f) => prettyRelation(f.description)),
      ...(ctx.relations || []).map(prettyRelation),
    ].filter((desc, i, arr) => arr.indexOf(desc) === i)
    if (displayFacts.length > 0) {
      steps.push({
        step: stepCounter++,
        title: '提取几何事实',
        content: displayFacts.join('；'),
        type: 'observation',
      })
    }
  }

  const inferenceSteps = matchRules(allFacts)

  // 「直线在平面内」「三点确定平面」是中间推导依据，单独展示是噪音
  const TRIVIAL_RULES = new Set(['直线在平面内', '三点确定平面'])
  const meaningfulInferences = inferenceSteps.filter(
    (inference) => !TRIVIAL_RULES.has(inference.ruleName)
  )

  if (meaningfulInferences.length > 0) {
    meaningfulInferences.forEach((inference) => {
      steps.push({
        step: stepCounter++,
        title: `应用规则: ${inference.ruleName}`,
        content: inference.explanation,
        type: 'inference',
        rule: inference.ruleName,
      })
    })
  }

  steps.push({
    step: stepCounter++,
    title: '结论',
    content: '根据以上分析，可以得出相应结论。',
    type: 'conclusion',
  })

  return steps
}

/**
 * 判断是否可以生成证明
 * @param {Object} ctx - 上下文对象
 * @returns {boolean} 是否可以生成证明
 */
export function canGenerateProof(ctx) {
  return (
    ctx.type &&
    (ctx.semantic?.points?.length > 0 ||
      ctx.relations?.length > 0 ||
      ctx.planes?.length > 0)
  )
}

/**
 * 生成简化证明（仅关键步骤）
 * @param {Object} ctx - 上下文对象
 * @returns {ProofStep[]} 简化证明步骤列表
 */
export function generateSimplifiedProof(ctx) {
  const fullProof = generateProof(ctx)
  return fullProof.filter((step) => step.type !== 'observation')
}