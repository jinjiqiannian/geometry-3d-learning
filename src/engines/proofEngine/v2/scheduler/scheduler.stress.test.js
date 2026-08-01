/**
 * Scheduler 压力测试（生产验收 PHASE 3）
 *
 * Case 1: 规则链 A → B → C → goal，确认 GOAL_REACHED
 * Case 2: 规则无限生成新事实，确认 MAX_ROUNDS
 * Case 3: 两个规则循环产生相同事实，确认 DEGENERATE_LOOP
 * Case 4: Construction 产生事实时，Scheduler 不会提前 FIXED_POINT
 *
 * Case 1/3/4 使用真实 FactRegistry + 真实 RuleRegistry（condition() 契约），
 * 同时回归验证 registerRule 不丢失 condition 字段。
 */
import { describe, it, expect } from 'vitest'
import { createFactRegistry } from '../factRegistry.js'
import { createRuleRegistry } from '../ruleRegistry.js'
import { createConstructionManager } from '../construction/constructionManager.js'
import { runScheduler, SCHEDULER_STATUS, MAX_ROUNDS } from './scheduler.js'

const pred = (label, description = '') => ({
  type: 'predicate',
  subjects: [label],
  description: description || `${label} 成立`,
})

const hasPred = (facts, label) =>
  facts.some((f) => f.type === 'predicate' && (f.subjects || []).includes(label))

/** condition() 风格规则（V2 真实规则契约） */
const conditionRule = (id, tier, from, to) => ({
  id,
  name: id,
  description: `${from} → ${to}`,
  tier,
  premises: [],
  conclusion: 'predicate',
  priority: 1,
  condition({ facts }) {
    if (!hasPred(facts, from)) return false
    if (hasPred(facts, to)) return false // already 守卫，防止空转
    return { from, to }
  },
  apply(match) {
    return {
      facts: [pred(match.to)],
      proofSteps: [{
        title: `${match.from} → ${match.to}`,
        content: `由 ${match.from} 推出 ${match.to}`,
        formula: '',
        type: 'inference',
        rule: id,
      }],
    }
  },
})

describe('Scheduler stress (PHASE 3)', () => {
  it('Case 1: 规则链 A → B → C → goal 达成 GOAL_REACHED', () => {
    const factRegistry = createFactRegistry()
    const ruleRegistry = createRuleRegistry()
    factRegistry.addFact(pred('A'))

    ruleRegistry.registerRule(conditionRule('a_to_b', 'axiom', 'A', 'B'))
    ruleRegistry.registerRule(conditionRule('b_to_c', 'theorem', 'B', 'C'))
    ruleRegistry.registerRule(conditionRule('c_to_goal', 'corollary', 'C', 'GOAL'))

    const result = runScheduler({
      factRegistry,
      ruleRegistry,
      goal: 'predicate|GOAL',
    })

    expect(result.status).toBe(SCHEDULER_STATUS.GOAL_REACHED)
    expect(hasPred(result.facts, 'GOAL')).toBe(true)
    // 每一步 ProofStep 都绑定了 rule id
    expect(result.proofSteps.length).toBeGreaterThanOrEqual(3)
    for (const s of result.proofSteps) {
      expect(typeof s.rule).toBe('string')
      expect(s.rule.length).toBeGreaterThan(0)
    }
  })

  it('Case 2: 规则无限生成新事实 → MAX_ROUNDS', () => {
    const factRegistry = createFactRegistry()
    const ruleRegistry = createRuleRegistry()
    factRegistry.addFact(pred('SEED'))
    let counter = 0

    ruleRegistry.registerRule({
      id: 'infinite_gen',
      name: 'infinite_gen',
      description: '每轮生成一个全新事实',
      tier: 'heuristic',
      premises: [],
      conclusion: 'predicate',
      priority: 1,
      condition: () => true,
      apply: () => {
        counter += 1
        return { facts: [pred(`N${counter}`)] }
      },
    })

    const result = runScheduler({ factRegistry, ruleRegistry, maxRounds: MAX_ROUNDS })

    expect(result.status).toBe(SCHEDULER_STATUS.MAX_ROUNDS)
    expect(result.rounds).toBe(MAX_ROUNDS)
    expect(result.facts.length).toBeGreaterThan(MAX_ROUNDS)
  })

  it('Case 3: 两个规则循环产生相同事实 → DEGENERATE_LOOP', () => {
    const factRegistry = createFactRegistry()
    const ruleRegistry = createRuleRegistry()
    factRegistry.addFact(pred('A'))

    // 两条规则条件恒真、互相“产出”同一个事实 B（内容寻址去重后不增长）
    ruleRegistry.registerRule({
      id: 'loop_x',
      name: 'loop_x',
      description: 'A → B（无守卫）',
      tier: 'axiom',
      premises: [],
      conclusion: 'predicate',
      priority: 1,
      condition: ({ facts }) => hasPred(facts, 'A'),
      apply: () => ({ facts: [pred('B')] }),
    })
    ruleRegistry.registerRule({
      id: 'loop_y',
      name: 'loop_y',
      description: 'B → B（无守卫）',
      tier: 'theorem',
      premises: [],
      conclusion: 'predicate',
      priority: 1,
      condition: ({ facts }) => hasPred(facts, 'B'),
      apply: () => ({ facts: [pred('B')] }),
    })

    const result = runScheduler({ factRegistry, ruleRegistry, maxRounds: 10 })

    expect(result.status).toBe(SCHEDULER_STATUS.DEGENERATE_LOOP)
    // 事实集合稳定在 A + B，未无限增长
    expect(result.facts.length).toBe(2)
    expect(result.rounds).toBeLessThan(10)
  })

  it('Case 4: Construction 产生事实时不会提前 FIXED_POINT', () => {
    const factRegistry = createFactRegistry()
    const ruleRegistry = createRuleRegistry()
    const constructionManager = createConstructionManager()
    constructionManager.setFactRegistry(factRegistry)
    constructionManager.setRuleRegistry(ruleRegistry)

    factRegistry.addFact(pred('A'))

    // use_g 位于更早的 tier（axiom），每轮先于 construct_g（theorem）求值：
    // 第 1 轮 G 尚不存在 → use_g 不触发；construct_g 触发但 rule.facts 为空，
    // 事实只能由 Construction 验证层写入 factRegistry。
    // 若 Scheduler 只统计规则返回的 facts，第 1 轮会误判 FIXED_POINT，goal 永远达不到。
    ruleRegistry.registerRule({
      id: 'use_g',
      name: 'use_g',
      description: '点 G 存在 → GOAL',
      tier: 'axiom',
      premises: [],
      conclusion: 'predicate',
      priority: 1,
      condition: ({ facts }) =>
        facts.some((f) => f.type === 'point' && (f.subjects || []).includes('G'))
          ? { ok: true }
          : false,
      apply: () => ({ facts: [pred('GOAL')] }),
    })
    ruleRegistry.registerRule({
      id: 'construct_g',
      name: 'construct_g',
      description: '构造点 G（事实由 Construction 层生成）',
      tier: 'theorem',
      premises: [],
      conclusion: 'point',
      priority: 1,
      condition: ({ facts }) =>
        facts.some((f) => f.type === 'point' && (f.subjects || []).includes('G'))
          ? false
          : { construct: true },
      apply: () => ({
        facts: [], // 规则本身不产出事实
        constructions: [{ type: 'point', label: 'G', creatorRule: 'construct_g' }],
      }),
    })

    const result = runScheduler({
      factRegistry,
      ruleRegistry,
      constructionManager,
      goal: 'predicate|GOAL',
      maxRounds: 10,
    })

    expect(result.status).toBe(SCHEDULER_STATUS.GOAL_REACHED)
    // Construction 生成的事实确实进入了 factRegistry
    expect(factRegistry.hasFact('point|G')).toBe(true)
    // goal 在第 2 轮达成，证明第 1 轮没有被误判为 FIXED_POINT
    expect(result.rounds).toBeGreaterThanOrEqual(2)
    // 构造对象被登记且激活
    expect(result.constructions.length).toBeGreaterThanOrEqual(1)
  })
})
