/** @type {string[]} 固定 Tier 顺序（禁止随机） */


/**
 * @module proofEngine/v2/scheduler
 * @description ProofEngine V2-B Scheduler 骨架 —— 仅负责规则调度 / Fact 增长 / Construction 触发 / 停止判断
 */

/** @type {string[]} 固定 Tier 顺序（禁止随机） */
export const TIERS = [
  'axiom',
  'definition',
  'theorem',
  'corollary',
  'lemma',
  'heuristic',
  'meta',
]

export const MAX_ROUNDS = 15

export const SCHEDULER_STATUS = {
  RUNNING: 'RUNNING',
  GOAL_REACHED: 'GOAL_REACHED',
  FIXED_POINT: 'FIXED_POINT',
  MAX_ROUNDS: 'MAX_ROUNDS',
  DEGENERATE_LOOP: 'DEGENERATE_LOOP',
  ALL_RULES_EXHAUSTED: 'ALL_RULES_EXHAUSTED',
  FAILED: 'FAILED',
}

function normalizeFact(fact) {
  if (!fact || typeof fact !== 'object') return fact
  const subjects = fact.subjects || fact.args || []
  const type = fact.type || fact.predicate
  return { ...fact, type, subjects, predicate: fact.predicate || fact.type, args: fact.args || fact.subjects || subjects }
}

function getSortedRulesForTier(ruleRegistry, tier) {
  let rules = []
  if (typeof ruleRegistry.getRulesByTier === 'function') { rules = ruleRegistry.getRulesByTier(tier) || [] }
  if ((!rules || rules.length === 0) && typeof ruleRegistry.getAllRules === 'function') { rules = (ruleRegistry.getAllRules() || []).filter((r) => r.tier === tier) }
  return [...rules].sort((a, b) => { const sa = a.salience ?? a.priority ?? 0; const sb = b.salience ?? b.priority ?? 0; return sb - sa })
}

function evaluateCondition(rule, ctx) {
  const facts = typeof ctx.factRegistry.getAllFacts === 'function' ? ctx.factRegistry.getAllFacts() : []
  if (typeof rule.condition === 'function') { return rule.condition({ ...ctx, facts }) }
  if (typeof rule.match === 'function') { return rule.match(facts, ctx) }
  return false
}

function isConditionMet(result) {
  if (result === false || result == null) return false
  if (Array.isArray(result)) return result.length > 0
  return Boolean(result)
}

function applyRule(rule, conditionResult, ctx) {
  if (typeof rule.apply !== 'function') { return { facts: [], constructions: [], proofSteps: [] } }
  const payload = Array.isArray(conditionResult) || (conditionResult && typeof conditionResult === 'object') ? conditionResult : ctx
  const out = rule.apply(payload, ctx) || {}
  return { facts: out.facts || [], constructions: out.constructions || (out.construction ? [out.construction] : []), proofSteps: out.proofSteps || (out.step ? [out.step] : []), description: out.description }
}

function addFacts(factRegistry, facts, ruleId) {
  let added = 0
  for (const raw of facts) {
    const fact = normalizeFact(raw)
    if (ruleId) {
      if (!fact.sources || fact.sources.length === 0) { fact.sources = [ruleId] }
      else if (!fact.sources.includes(ruleId)) { fact.sources = [...fact.sources, ruleId] }
    }
    const sizeBefore = typeof factRegistry.size === 'function' ? factRegistry.size() : -1
    if (typeof factRegistry.addFact === 'function') { factRegistry.addFact(fact) }
    const sizeAfter = typeof factRegistry.size === 'function' ? factRegistry.size() : sizeBefore + 1
    if (sizeBefore >= 0 && sizeAfter > sizeBefore) { added++ }
    else if (sizeBefore < 0) { added++ }
  }
  return added
}

function triggerConstructions(constructionManager, constructions) {
  if (!constructionManager || !constructions.length) return
  for (const c of constructions) { if (typeof constructionManager.proposeConstruction === 'function') { constructionManager.proposeConstruction(c) } }
}

function snapshotConstructions(constructionManager) {
  if (!constructionManager) return []
  if (typeof constructionManager.getAllObjects === 'function') { return constructionManager.getAllObjects() }
  return []
}

function snapshotFacts(factRegistry) {
  if (typeof factRegistry.getAllFacts === 'function') { return factRegistry.getAllFacts() }
  return []
}

function factCount(factRegistry) {
  if (typeof factRegistry.size === 'function') return factRegistry.size()
  return snapshotFacts(factRegistry).length
}

function ruleCount(ruleRegistry) {
  if (typeof ruleRegistry.size === 'function') return ruleRegistry.size()
  if (typeof ruleRegistry.getAllRules === 'function') return ruleRegistry.getAllRules().length
  return 0
}

function normalizeProofStep(step, index) {
  return { step: step.step ?? index + 1, title: step.title ?? '', content: step.content ?? step.description ?? '', formula: step.formula ?? '', ...step }
}

export function checkGoalReached(ctx) {
  const { goal, factRegistry } = ctx
  if (goal == null) return false
  if (typeof goal === 'function') { return Boolean(goal(factRegistry, ctx)) }
  if (typeof goal === 'object' && goal.id) {
    if (typeof factRegistry.hasFact === 'function') { return factRegistry.hasFact(goal.id) }
    return snapshotFacts(factRegistry).some((f) => f.id === goal.id)
  }
  if (typeof goal === 'string') { return snapshotFacts(factRegistry).some((f) => f.id === goal || f.predicate === goal || f.type === goal) }
  return false
}

export function checkFixedPoint(ctx) { return ctx.factsAddedThisRound === 0 }

export function checkMaxRounds(ctx) { const max = ctx.maxRounds ?? MAX_ROUNDS; return ctx.rounds >= max }

export function checkDegenerateLoop(ctx) {
  const history = ctx.fingerprintHistory || []
  if (history.length < 2) return false
  // 退化循环 = 本轮有规则触发（空转）但事实集合不再变化；
  // rulesFiredThisRound 未提供时视为不约束（向后兼容直接调用）
  const fired = ctx.rulesFiredThisRound ?? 1
  if (fired === 0) return false
  const a = history[history.length - 1]; const b = history[history.length - 2]
  return a === b && ctx.factsAddedThisRound === 0
}

export function checkAllRulesExhausted(ctx) { return ruleCount(ctx.ruleRegistry) === 0 }

function factFingerprint(factRegistry) {
  const facts = snapshotFacts(factRegistry)
  return facts.map((f) => f.id || `${f.type || f.predicate}|${(f.args || f.subjects || []).join(',')}`).sort().join(';')
}

export function runScheduler(context = {}) {
  const { factRegistry, ruleRegistry, constructionManager = null, goal = null, maxRounds = MAX_ROUNDS } = context
  const proofSteps = []
  let rounds = 0
  const fingerprintHistory = []

  const stopCtxBase = () => ({ factRegistry, ruleRegistry, constructionManager, goal, maxRounds, rounds, factsAddedThisRound: 0, fingerprintHistory })

  if (!ruleRegistry || checkAllRulesExhausted(stopCtxBase())) {
    if (checkGoalReached(stopCtxBase())) {
      return { status: SCHEDULER_STATUS.GOAL_REACHED, proofSteps, rounds: 0, facts: factRegistry ? snapshotFacts(factRegistry) : [], constructions: snapshotConstructions(constructionManager) }
    }
    return { status: SCHEDULER_STATUS.FIXED_POINT, proofSteps, rounds: 0, facts: factRegistry ? snapshotFacts(factRegistry) : [], constructions: snapshotConstructions(constructionManager) }
  }

  if (!factRegistry) { return { status: SCHEDULER_STATUS.FIXED_POINT, proofSteps, rounds: 0, facts: [], constructions: snapshotConstructions(constructionManager) } }

  if (checkGoalReached(stopCtxBase())) { return { status: SCHEDULER_STATUS.GOAL_REACHED, proofSteps, rounds: 0, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) } }

  while (rounds < maxRounds) {
    let rulesFiredThisRound = 0
    const factsBefore = factCount(factRegistry)

    for (const tier of TIERS) {
      const rules = getSortedRulesForTier(ruleRegistry, tier)
      for (const rule of rules) {
        let conditionResult
        try { conditionResult = evaluateCondition(rule, { factRegistry, ruleRegistry, constructionManager, goal }) }
        catch { continue }
        if (!isConditionMet(conditionResult)) continue
        rulesFiredThisRound++

        let applied
        try { applied = applyRule(rule, conditionResult, { factRegistry, ruleRegistry, constructionManager, goal }) }
        catch { continue }

        const added = addFacts(factRegistry, applied.facts, rule.id)
        triggerConstructions(constructionManager, applied.constructions)

        for (const step of applied.proofSteps) { proofSteps.push(normalizeProofStep(step, proofSteps.length)) }

        if (!applied.proofSteps.length && (added > 0 || applied.description)) {
          proofSteps.push(normalizeProofStep({ step: proofSteps.length + 1, title: rule.name || rule.id || `tier-${tier}`, content: applied.description || '', formula: '', rule: rule.id }, proofSteps.length))
        }

        if (checkGoalReached({ ...stopCtxBase(), rounds })) { return { status: SCHEDULER_STATUS.GOAL_REACHED, proofSteps, rounds: rounds + 1, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) } }
      }
    }

    rounds++
    fingerprintHistory.push(factFingerprint(factRegistry))

    // 以注册表大小增量为准，涵盖 Construction 层直接写入 factRegistry 的事实，
    // 防止构造产生事实后被误判为 FIXED_POINT
    const factsAfter = factCount(factRegistry)
    const factsAddedThisRound = factsAfter - factsBefore

    const roundCtx = { ...stopCtxBase(), rounds, factsAddedThisRound, rulesFiredThisRound, factsBefore, factsAfter, fingerprintHistory }

    if (checkGoalReached(roundCtx)) { return { status: SCHEDULER_STATUS.GOAL_REACHED, proofSteps, rounds, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) } }
    if (checkDegenerateLoop(roundCtx)) { return { status: SCHEDULER_STATUS.DEGENERATE_LOOP, proofSteps, rounds, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) } }
    if (checkFixedPoint(roundCtx)) { return { status: SCHEDULER_STATUS.FIXED_POINT, proofSteps, rounds, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) } }
    if (checkMaxRounds(roundCtx)) { return { status: SCHEDULER_STATUS.MAX_ROUNDS, proofSteps, rounds, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) } }
  }

  return { status: SCHEDULER_STATUS.MAX_ROUNDS, proofSteps, rounds, facts: snapshotFacts(factRegistry), constructions: snapshotConstructions(constructionManager) }
}