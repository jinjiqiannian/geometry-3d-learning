/**
 * v2/rules/index.js — V2 规则统一入口
 */
import {
  diagonalBisect,
  planeEdges,
  ensureTrianglePlane,
  lineIntersection,
  triangleSimilarityAA,
  triangleMidsegment,
  collinearPropagation,
  planeMembership,
  planeIntersectionLine,
  parallelTransitive,
  rhombusDiagonalsPerpendicular,
  linePerpPlaneProperty,
  linePerpPlaneCriterion,
  lineParallelPlaneCriterion,
} from './geometryRules.js'
import {
  lineParallelPlaneProperty,
  proportionalSegments,
  ratioArithmetic,
} from './ratioRules.js'

export const ALL_V2_RULES = [
  diagonalBisect,
  planeEdges,
  ensureTrianglePlane,
  lineIntersection,
  triangleSimilarityAA,
  triangleMidsegment,
  collinearPropagation,
  planeMembership,
  planeIntersectionLine,
  parallelTransitive,
  rhombusDiagonalsPerpendicular,
  linePerpPlaneProperty,
  linePerpPlaneCriterion,
  lineParallelPlaneCriterion,
  lineParallelPlaneProperty,
  proportionalSegments,
  ratioArithmetic,
]

export {
  diagonalBisect,
  planeEdges,
  ensureTrianglePlane,
  lineIntersection,
  triangleSimilarityAA,
  triangleMidsegment,
  collinearPropagation,
  planeMembership,
  planeIntersectionLine,
  parallelTransitive,
  rhombusDiagonalsPerpendicular,
  linePerpPlaneProperty,
  linePerpPlaneCriterion,
  lineParallelPlaneCriterion,
  lineParallelPlaneProperty,
  proportionalSegments,
  ratioArithmetic,
}

export function registerAllRules(ruleRegistry) {
  if (!ruleRegistry || typeof ruleRegistry.registerRule !== 'function') {
    throw new Error('registerAllRules requires a valid RuleRegistry instance')
  }
  for (const rule of ALL_V2_RULES) {
    ruleRegistry.registerRule(rule)
  }
  return ruleRegistry
}
