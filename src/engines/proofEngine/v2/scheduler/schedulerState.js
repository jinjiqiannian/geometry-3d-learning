/**
 * @module schedulerState
 * @description Scheduler 状态定义 - 管理调度器运行时状态
 * @author Geometry 3D Learning
 */

import { RULE_TIERS } from '../schemas.js'
import { SCHEDULER_STATUS } from './scheduler.js'
const TERMINAL_STATUSES = new Set([
  SCHEDULER_STATUS.GOAL_REACHED,
  SCHEDULER_STATUS.FIXED_POINT,
  SCHEDULER_STATUS.MAX_ROUNDS,
  SCHEDULER_STATUS.DEGENERATE_LOOP,
  SCHEDULER_STATUS.ALL_RULES_EXHAUSTED,
  SCHEDULER_STATUS.FAILED,
])

/**
 * 调度器状态枚举
 */


/**
 * 终止状态集合
 */
const TERMINAL_STATUSES = new Set([
  SCHEDULER_STATUS.GOAL_REACHED,
  SCHEDULER_STATUS.FIXED_POINT,
  SCHEDULER_STATUS.MAX_ROUNDS,
  SCHEDULER_STATUS.FAILED,
])

/**
 * 默认 Tier 顺序（0 → 6）
 * 索引对应：
 *   0: axiom        公理
 *   1: definition   定义
 *   2: theorem      定理
 *   3: corollary    推论
 *   4: lemma        引理
 *   5: heuristic    启发式
 *   6: meta         元规则（用户自定义扩展层）
 */
export const DEFAULT_TIER_ORDER = [
  RULE_TIERS.AXIOM,
  RULE_TIERS.DEFINITION,
  RULE_TIERS.THEOREM,
  RULE_TIERS.COROLLARY,
  RULE_TIERS.LEMMA,
  RULE_TIERS.HEURISTIC,
  'meta',
]

/**
 * 创建调度器状态
 * @param {Object} [options] - 初始化选项
 * @param {Object[]} [options.facts] - 初始事实列表
 * @param {Object[]} [options.activeRules] - 当前激活规则列表
 * @param {number} [options.currentTier] - 当前 Tier 索引
 * @param {number} [options.macroRound] - 当前 Macro Round
 * @param {string} [options.status] - 调度器状态
 * @returns {Object} 调度器状态对象
 */
export function createSchedulerState(options = {}) {
  return {
    facts: options.facts || [],
    activeRules: options.activeRules || [],
    currentTier: options.currentTier ?? 0,
    macroRound: options.macroRound ?? 0,
    status: options.status || SCHEDULER_STATUS.RUNNING,
    // 附加追踪字段
    factsAddedTotal: 0,
    factsAddedThisRound: 0,
    ruleInvocations: 0,
    history: [],
    error: null,
  }
}

/**
 * 更新调度器状态（不可变更新）
 * @param {Object} state - 当前状态
 * @param {Object} updates - 更新字段
 * @returns {Object} 新状态
 */
export function updateState(state, updates) {
  return { ...state, ...updates }
}

/**
 * 判断状态是否为终止状态
 * @param {string} status - 调度器状态
 * @returns {boolean} 是否终止
 */
export function isTerminal(status) {
  return TERMINAL_STATUSES.has(status)
}

/**
 * 记录历史快照
 * @param {Object} state - 当前状态
 * @param {Object} snapshot - 快照信息
 * @returns {Object} 更新后的状态
 */
export function recordHistory(state, snapshot) {
  const history = [...state.history, {
    macroRound: state.macroRound,
    currentTier: state.currentTier,
    timestamp: Date.now(),
    ...snapshot,
  }]
  return { ...state, history }
}

/**
 * 重置单轮计数器
 * @param {Object} state - 当前状态
 * @returns {Object} 重置后的状态
 */
export function resetRoundCounters(state) {
  return {
    ...state,
    factsAddedThisRound: 0,
  }
}

/**
 * 标记调度器失败
 * @param {Object} state - 当前状态
 * @param {string} reason - 失败原因
 * @returns {Object} 失败状态
 */
export function markFailed(state, reason) {
  return {
    ...state,
    status: SCHEDULER_STATUS.FAILED,
    error: reason,
  }
}

/**
 * 标记目标达成
 * @param {Object} state - 当前状态
 * @returns {Object} 目标达成状态
 */
export function markGoalReached(state) {
  return {
    ...state,
    status: SCHEDULER_STATUS.GOAL_REACHED,
  }
}

/**
 * 标记达到不动点（收敛）
 * @param {Object} state - 当前状态
 * @returns {Object} 不动点状态
 */
export function markFixedPoint(state) {
  return {
    ...state,
    status: SCHEDULER_STATUS.FIXED_POINT,
  }
}

/**
 * 标记达到最大轮数
 * @param {Object} state - 当前状态
 * @returns {Object} 最大轮数状态
 */
export function markMaxRounds(state) {
  return {
    ...state,
    status: SCHEDULER_STATUS.MAX_ROUNDS,
  }
}
