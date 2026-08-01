/**
 * ProofEngine V2-C1 集成测试
 * 验证：FactRegistry → RuleRegistry → Scheduler → ProofStep 闭环
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createFactRegistry } from '../factRegistry.js'
import { createRuleRegistry } from '../ruleRegistry.js'
import { createConstructionManager } from '../construction/constructionManager.js'
import { runScheduler, SCHEDULER_STATUS } from '../scheduler/scheduler.js'
import { FACT_TYPES, RULE_TIERS, STEP_TYPES } from '../schemas.js'

describe('V2-C1 Integration: FactRegistry → RuleRegistry → Scheduler → ProofStep', () => {
  let factRegistry
  let ruleRegistry
  let constructionManager

  beforeEach(() => {
    factRegistry = createFactRegistry()
    ruleRegistry = createRuleRegistry()
    constructionManager = createConstructionManager()
    constructionManager.setFactRegistry(factRegistry)
    constructionManager.setRuleRegistry(ruleRegistry)
  })

  /**
   * 辅助：创建几何事实
   */
  const createFact = (type, subjects, description = '') => ({
    type,
    subjects,
    description,
    sources: [],
  })

  /**
   * 辅助：创建简单规则
   */
  const createRule = (id, name, tier, matchFn, applyFn, priority = 1) => ({
    id,
    name,
    description: name,
    tier,
    premises: [],
    conclusion: 'predicate',
    priority,
    match: matchFn,
    apply: applyFn,
  })

  describe('A. 基础闭环：简单链式推理', () => {
    it('FactRegistry 存储初始事实', () => {
      const fact = createFact('point', ['A'], '点 A 存在')
      factRegistry.addFact(fact)
      expect(factRegistry.size()).toBe(1)
      expect(factRegistry.hasFact('point|A')).toBe(true)
    })

    it('RuleRegistry 注册规则', () => {
      const rule = createRule(
        'test_rule',
        '测试规则',
        RULE_TIERS.AXIOM,
        () => [],
        () => ({ facts: [] })
      )
      ruleRegistry.registerRule(rule)
      expect(ruleRegistry.size()).toBe(1)
      expect(ruleRegistry.getRule('test_rule')).toBeDefined()
    })

    it('Scheduler 执行规则并生成 ProofStep', () => {
      // 初始事实：A
      factRegistry.addFact(createFact('predicate', ['A'], 'A 成立'))

      // 规则：A → B
      ruleRegistry.registerRule(createRule(
        'a_to_b',
        'A → B',
        RULE_TIERS.AXIOM,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('A')),
        (matchResult) => ({
          facts: [createFact('predicate', ['B'], 'B 成立')],
          description: '由 A 推出 B',
        })
      ))

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager,
      })

      // 验证状态：a_to_b 的 match 无守卫、每轮恒中且重复产出 B，
      // 属于规则空转 → DEGENERATE_LOOP（干净收敛才是 FIXED_POINT）
      expect(result.status).toBe(SCHEDULER_STATUS.DEGENERATE_LOOP)

      // 验证事实增长
      expect(result.facts.length).toBeGreaterThan(1)
      const factB = result.facts.find((f) => f.type === 'predicate' && f.subjects.includes('B'))
      expect(factB).toBeDefined()

      // 验证生成 ProofStep
      expect(result.proofSteps.length).toBeGreaterThan(0)
      const step = result.proofSteps[0]
      expect(step.step).toBeDefined()
      expect(step.title).toBe('A → B')
      expect(step.content).toBe('由 A 推出 B')
      expect(step.rule).toBe('a_to_b')
    })
  })

  describe('B. 完整闭环：A → B → C', () => {
    it('链式推理生成完整证明步骤', () => {
      // 初始事实
      factRegistry.addFact(createFact('predicate', ['A'], 'A 成立'))

      // 规则 1：A → B
      ruleRegistry.registerRule(createRule(
        'a_to_b',
        'A → B',
        RULE_TIERS.AXIOM,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('A')),
        () => ({
          facts: [createFact('predicate', ['B'], 'B 成立')],
          description: '由 A 推出 B',
        })
      ))

      // 规则 2：B → C
      ruleRegistry.registerRule(createRule(
        'b_to_c',
        'B → C',
        RULE_TIERS.DEFINITION,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('B')),
        () => ({
          facts: [createFact('predicate', ['C'], 'C 成立')],
          description: '由 B 推出 C',
        })
      ))

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager,
      })

      // 最终应包含 A、B、C
      expect(result.facts.some((f) => f.subjects.includes('A'))).toBe(true)
      expect(result.facts.some((f) => f.subjects.includes('B'))).toBe(true)
      expect(result.facts.some((f) => f.subjects.includes('C'))).toBe(true)

      // 应生成证明步骤
      expect(result.proofSteps.length).toBeGreaterThanOrEqual(2)

      // 步骤内容应正确
      const stepContents = result.proofSteps.map((s) => s.content)
      expect(stepContents.some((c) => c.includes('由 A 推出 B'))).toBe(true)
      expect(stepContents.some((c) => c.includes('由 B 推出 C'))).toBe(true)
    })
  })

  describe('C. Goal 目标检查', () => {
    it('达到目标时返回 GOAL_REACHED', () => {
      factRegistry.addFact(createFact('predicate', ['A'], 'A 成立'))

      ruleRegistry.registerRule(createRule(
        'a_to_b',
        'A → B',
        RULE_TIERS.AXIOM,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('A')),
        () => ({
          facts: [createFact('predicate', ['B'], 'B 成立')],
          description: '由 A 推出 B',
        })
      ))

      // 目标：事实 B
      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager,
        goal: 'predicate|B',
      })

      expect(result.status).toBe(SCHEDULER_STATUS.GOAL_REACHED)
    })

    it('目标为函数时正确检查', () => {
      factRegistry.addFact(createFact('predicate', ['A'], 'A 成立'))

      ruleRegistry.registerRule(createRule(
        'a_to_b',
        'A → B',
        RULE_TIERS.AXIOM,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('A')),
        () => ({
          facts: [createFact('predicate', ['B'], 'B 成立')],
        })
      ))

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager,
        goal: (registry) => registry.getAllFacts().some((f) => f.subjects.includes('B')),
      })

      expect(result.status).toBe(SCHEDULER_STATUS.GOAL_REACHED)
    })
  })

  describe('D. 去重与收敛', () => {
    it('重复事实自动去重', () => {
      factRegistry.addFact(createFact('predicate', ['A']))
      factRegistry.addFact(createFact('predicate', ['A']))
      expect(factRegistry.size()).toBe(1)
    })

    it('循环规则不会无限增长', () => {
      factRegistry.addFact(createFact('predicate', ['A']))

      // A → B
      ruleRegistry.registerRule(createRule(
        'a_to_b',
        'A → B',
        RULE_TIERS.AXIOM,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('A')),
        () => ({ facts: [createFact('predicate', ['B'])] })
      ))

      // B → A
      ruleRegistry.registerRule(createRule(
        'b_to_a',
        'B → A',
        RULE_TIERS.DEFINITION,
        (facts) => facts.filter((f) => f.type === 'predicate' && f.subjects.includes('B')),
        () => ({ facts: [createFact('predicate', ['A'])] })
      ))

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager,
        maxRounds: 10,
      })

      // 不会达到 MAX_ROUNDS，应该很快收敛
      expect(result.status).not.toBe(SCHEDULER_STATUS.MAX_ROUNDS)
      expect(result.rounds).toBeLessThan(3)
      expect(result.facts.length).toBe(2) // A 和 B
    })
  })

  describe('E. ProofStep 结构验证', () => {
    it('ProofStep 包含完整字段', () => {
      factRegistry.addFact(createFact('predicate', ['A']))

      ruleRegistry.registerRule(createRule(
        'a_to_b',
        '测试规则',
        RULE_TIERS.AXIOM,
        (facts) => facts.filter((f) => f.subjects.includes('A')),
        () => ({
          facts: [createFact('predicate', ['B'])],
          proofSteps: [{
            step: 1,
            title: '推理步骤',
            content: '这是一个证明步骤',
            formula: 'A → B',
            type: STEP_TYPES.INFERENCE,
            rule: 'a_to_b',
            premiseIds: ['predicate|A'],
            conclusionId: 'predicate|B',
            highlightEdges: ['AB'],
            showLabels: ['A', 'B'],
          }],
        })
      ))

      const result = runScheduler({
        factRegistry,
        ruleRegistry,
        constructionManager,
      })

      const step = result.proofSteps[0]
      expect(step.step).toBe(1)
      expect(step.title).toBe('推理步骤')
      expect(step.content).toBe('这是一个证明步骤')
      expect(step.formula).toBe('A → B')
      expect(step.type).toBe(STEP_TYPES.INFERENCE)
      expect(step.rule).toBe('a_to_b')
      expect(step.premiseIds).toEqual(['predicate|A'])
      expect(step.conclusionId).toBe('predicate|B')
      expect(step.highlightEdges).toEqual(['AB'])
      expect(step.showLabels).toEqual(['A', 'B'])
    })
  })
})
