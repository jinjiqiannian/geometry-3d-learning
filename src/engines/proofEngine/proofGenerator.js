/**
 * @module proofGenerator
 * @description 证明生成器 - 组合事实提取和规则匹配，生成完整证明步骤
 * @author Geometry 3D Learning
 */

import { extractFacts, extractImportantPlanes, extractVertices } from './factExtractor.js'
import { matchRules } from './ruleMatcher.js'
import { tryV2Proof } from './v2/adapter.js'

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

  steps.push({
    step: stepCounter++,
    title: '已知条件分析',
    content: `题目给出的几何体是${ctx.typeName || ctx.type}，尺寸为${ctx.size}。`,
    type: 'observation',
  })

  if (allFacts.length > 0) {
    steps.push({
      step: stepCounter++,
      title: '提取几何事实',
      content: allFacts.map((f) => f.description).join('；'),
      type: 'observation',
    })
  }

  const inferenceSteps = matchRules(allFacts)

  if (inferenceSteps.length > 0) {
    inferenceSteps.forEach((inference) => {
      steps.push({
        step: stepCounter++,
        title: `应用规则: ${inference.ruleName}`,
        content: inference.explanation,
        type: 'inference',
        rule: inference.ruleName,
      })
    })
  }

  if (ctx.relations?.length > 0) {
    steps.push({
      step: stepCounter++,
      title: '关键关系分析',
      content: `题目中的几何关系：${ctx.relations.join('；')}`,
      type: 'observation',
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