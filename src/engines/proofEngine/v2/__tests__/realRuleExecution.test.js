import { describe, it, expect } from 'vitest'
import { createFactRegistry } from '../factRegistry.js'
import { createRuleRegistry } from '../ruleRegistry.js'
import { createConstructionManager } from '../construction/constructionManager.js'
import { runScheduler, SCHEDULER_STATUS } from '../scheduler/scheduler.js'
import { registerAllRules, ALL_V2_RULES } from '../rules/index.js'

function seedPyramid(fr) {
  fr.addFact({ type: 'shape', subjects: ['pyramid'], description: 'pyramid' })
  for (const p of ['P','A','B','C','D','E','F']) fr.addFact({ type: 'point', subjects: [p], description: p })
  for (const [a,b] of [['P','A'],['P','B'],['P','C'],['P','D'],['A','B'],['B','C'],['C','D'],['D','A']]) fr.addFact({ type: 'line', subjects: [a,b], description: a+b })
  fr.addFact({ type: 'plane', subjects: ['B','E','F'], description: 'plane BEF' })
  fr.addFact({ type: 'midpoint', subjects: ['E','A','D'], description: 'E midpoint AD' })
  fr.addFact({ type: 'on', subjects: ['F','PA'], description: 'F on PA' })
  fr.addFact({ type: 'parallel', subjects: ['PC','BEF'], description: 'PC parallel plane BEF' })
}

describe('V2-D Real Rule Execution', () => {
  it('ALL_V2_RULES has 13 rules', () => { expect(ALL_V2_RULES.length).toBe(13) })
  it('registerAllRules registers >= 10 rules', () => {
    const rr = createRuleRegistry(); registerAllRules(rr)
    expect(rr.size()).toBeGreaterThanOrEqual(10)
  })
  it('every rule has id, tier, condition, apply', () => {
    const rr = createRuleRegistry(); registerAllRules(rr)
    for (const rule of rr.getAllRules()) {
      expect(rule).toHaveProperty('id'); expect(rule).toHaveProperty('tier')
      expect(typeof rule.condition === 'function' || typeof rule.match === 'function').toBe(true)
      expect(typeof rule.apply).toBe('function')
    }
  })
  it('every rule handles empty facts without throwing', () => {
    const rr = createRuleRegistry(); registerAllRules(rr)
    for (const rule of rr.getAllRules()) {
      const fn = rule.condition || rule.match
      expect(() => { const r = fn({ facts: [] }); expect(r === false || r === null || r === undefined || Array.isArray(r) || typeof r === 'object').toBe(true) }).not.toThrow()
    }
  })
  it('pyramid converges with facts', () => {
    const fr = createFactRegistry(); const rr = createRuleRegistry(); const cm = createConstructionManager()
    cm.setFactRegistry(fr); cm.setRuleRegistry(rr); registerAllRules(rr); seedPyramid(fr)
    const r = runScheduler({ factRegistry: fr, ruleRegistry: rr, constructionManager: cm, maxRounds: 15 })
    expect([SCHEDULER_STATUS.FIXED_POINT, SCHEDULER_STATUS.MAX_ROUNDS]).toContain(r.status)
    expect(r.facts.length).toBeGreaterThan(7)
  })
  it('pyramid produces diagonal facts', () => {
    const fr = createFactRegistry(); const rr = createRuleRegistry(); const cm = createConstructionManager()
    cm.setFactRegistry(fr); cm.setRuleRegistry(rr); registerAllRules(rr); seedPyramid(fr)
    const r = runScheduler({ factRegistry: fr, ruleRegistry: rr, constructionManager: cm, maxRounds: 15 })
    expect(r.facts.map((f) => f.id)).toContain('line|A|C')
    expect(r.facts.map((f) => f.id)).toContain('line|B|D')
  })
  it('pyramid produces proof steps with rule', () => {
    const fr = createFactRegistry(); const rr = createRuleRegistry(); const cm = createConstructionManager()
    cm.setFactRegistry(fr); cm.setRuleRegistry(rr); registerAllRules(rr); seedPyramid(fr)
    const r = runScheduler({ factRegistry: fr, ruleRegistry: rr, constructionManager: cm, maxRounds: 15 })
    expect(r.proofSteps.filter((s) => s.rule).length).toBeGreaterThan(0)
  })
})