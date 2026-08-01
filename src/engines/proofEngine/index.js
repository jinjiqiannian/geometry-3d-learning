/**
 * @module proofEngine
 * @description 证明引擎入口模块 - 提供几何证明推理能力
 * @author Geometry 3D Learning
 */

import { generateProof, canGenerateProof } from './proofGenerator.js'
import { extractFacts } from './factExtractor.js'
import { matchRules, getAvailableRules } from './ruleMatcher.js'
import { buildCoordinateSystem, verifyRelation } from './coordMethod.js'

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
 * 主推理函数 - 根据上下文生成证明步骤
 * @param {Object} ctx - 上下文对象，包含 type, size, typeName, semantic, relations, planes, importantPlanes, vertices 等
 * @returns {ProofStep[] | null} 证明步骤列表，无法生成时返回 null
 */
export function reason(ctx) {
  if (!canGenerateProof(ctx)) {
    return null
  }

  return generateProof(ctx)
}

export {
  extractFacts,
  matchRules,
  getAvailableRules,
  buildCoordinateSystem,
  verifyRelation,
  generateProof,
  canGenerateProof,
}