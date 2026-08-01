/**
 * @module proofEngine/v2
 * @description ProofEngine V2 入口模块
 * @author Geometry 3D Learning
 */

import { FactRegistry, createFactRegistry } from './factRegistry.js'
import { RuleRegistry, createRuleRegistry } from './ruleRegistry.js'
import {
  FACT_TYPES,
  CONSTRUCTION_TYPES,
  RULE_TIERS,
  STEP_TYPES,
} from './schemas.js'
import {
  runScheduler,
  TIERS,
  MAX_ROUNDS,
  SCHEDULER_STATUS,
  checkGoalReached,
  checkFixedPoint,
  checkMaxRounds,
  checkDegenerateLoop,
  checkAllRulesExhausted,
} from './scheduler/scheduler.js'
import {
  ConstructionManager,
  createConstructionManager,
} from './construction/constructionManager.js'
import {
  ObjectRegistry,
  CONSTRUCTION_STATUS,
  createObjectRegistry,
} from './construction/objectRegistry.js'
import {
  validateConstruction,
  registerValidator,
  getValidatorTypes,
} from './construction/validators.js'

export {
  FactRegistry,
  createFactRegistry,
  RuleRegistry,
  createRuleRegistry,
  FACT_TYPES,
  CONSTRUCTION_TYPES,
  RULE_TIERS,
  STEP_TYPES,
  runScheduler,
  TIERS,
  MAX_ROUNDS,
  SCHEDULER_STATUS,
  checkGoalReached,
  checkFixedPoint,
  checkMaxRounds,
  checkDegenerateLoop,
  checkAllRulesExhausted,
  ConstructionManager,
  createConstructionManager,
  ObjectRegistry,
  CONSTRUCTION_STATUS,
  createObjectRegistry,
  validateConstruction,
  registerValidator,
  getValidatorTypes,
}