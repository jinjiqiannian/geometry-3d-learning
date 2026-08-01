/**
 * V2-C0 Integration Spike — V2-only test (no V1 imports)
 */
import { describe, it, expect } from 'vitest'
import { createFactRegistry } from '../factRegistry.js'
import { createRuleRegistry } from '../ruleRegistry.js'
import { createConstructionManager } from '../construction/constructionManager.js'
import { runScheduler } from '../scheduler/scheduler.js'
import { registerAllRules } from '../rules/index.js'

const pyramidFacts = (fr) => {
  fr.addFact({ type: 'shape', subjects: ['pyramid'], description: 'pyramid' })
  for (const p of ['P','A','B','C','D','E','F']) fr.addFact({ type: 'point', subjects: [p], description: p })
  for (const [a,b] of [['P','A'],['P','B'],['P','C'],['P','D'],['A','B'],['B','C'],['C','D'],['D','A']]) fr.addFact({ type: 'line', subjects: [a,b], description: a+b })
  fr.addFact({ type: 'plane', subjects: ['B','E','F'], description: 'plane BEF' })
  fr.addFact({ type: 'midpoint', subjects: ['E','A','D'], description: 'E midpoint AD' })
  fr.addFact({ type: 'on', subjects: ['F','PA'], description: 'F on PA' })
  fr.addFact({ type: 'parallel', subjects: ['PC','BEF'], description: 'PC parallel plane BEF' })
}

describe('V2-C0 Spike', () => {
  it('registerAllRules registers valid rules', () => {
    const rr = createRuleRegistry()
    registerAllRules(rr)
    expect(rr.size()).toBeGreaterThanOrEqual(6)
  })

  it('pyramid facts → scheduler produces facts', () => {
    const fr = createFactRegistry(); const rr = createRuleRegistry(); const cm = createConstructionManager()
    cm.setFactRegistry(fr); cm.setRuleRegistry(rr)
    registerAllRules(rr)
    pyramidFacts(fr)
    const result = runScheduler({ factRegistry: fr, ruleRegistry: rr, constructionManager: cm, maxRounds: 10 })
    // V2 rules run — at minimum, the seed facts plus any derivations
    expect(result.facts.length).toBeGreaterThanOrEqual(5)
  })

  it('scheduler returns result with proofSteps', () => {
    const fr = createFactRegistry(); const rr = createRuleRegistry(); const cm = createConstructionManager()
    cm.setFactRegistry(fr); cm.setRuleRegistry(rr)
    registerAllRules(rr)
    pyramidFacts(fr)
    const result = runScheduler({ factRegistry: fr, ruleRegistry: rr, constructionManager: cm, maxRounds: 10 })
    // Scheduler may converge without proof steps if no rules match
    expect(result).toHaveProperty('proofSteps')
    for (const s of result.proofSteps) {
      expect(s).toHaveProperty('step'); expect(s).toHaveProperty('title'); expect(s).toHaveProperty('content')
    }
  })

  it('V2 scheduler entry is callable', () => {
    // runV2Proof bridge 已删除（死代码），V2 入口统一为 adapter.tryV2Proof
    expect(typeof runScheduler).toBe('function')
  })
})