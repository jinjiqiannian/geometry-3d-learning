/**
 * 真实规则注册契约测试
 */
import { describe, it, expect } from 'vitest'
import { createRuleRegistry } from '../ruleRegistry.js'
import { registerAllRules, ALL_V2_RULES } from '../rules/index.js'

const REQUIRED_IDS = [
  'diagonal_bisect',
  'triangle_midsegment',
  'parallel_transitive',
  'line_parallel_plane_property',
  'proportional_segments',
  'ratio_arithmetic',
  'collinear_propagation',
  'plane_membership',
  'plane_intersection_line',
  'rhombus_diagonals_perpendicular',
  'line_perp_plane_property',
  'line_perp_plane_criterion',
  'line_parallel_plane_criterion',
]

describe('ruleRegistry.real', () => {
  it('registerRule 拒绝缺少 condition/match 的规则', () => {
    const rr = createRuleRegistry()
    expect(() =>
      rr.registerRule({
        id: 'bad',
        name: 'bad',
        tier: 'axiom',
        apply: () => ({}),
      })
    ).toThrow(/condition|match/)
  })

  it('registerRule 完整保留 condition / apply / salience / priority', () => {
    const rr = createRuleRegistry()
    const condition = () => false
    const apply = () => ({ facts: [] })
    rr.registerRule({
      id: 'keep_fields',
      name: 'keep',
      tier: 'theorem',
      priority: 7,
      salience: 9,
      condition,
      apply,
    })
    const stored = rr.getRule('keep_fields')
    expect(stored.condition).toBe(condition)
    expect(stored.apply).toBe(apply)
    expect(stored.priority).toBe(7)
    expect(stored.salience).toBe(9)
  })

  it('registerAllRules 注册全部必需规则且均可执行', () => {
    const rr = createRuleRegistry()
    registerAllRules(rr)

    for (const id of REQUIRED_IDS) {
      const rule = rr.getRule(id)
      expect(rule, `missing ${id}`).toBeTruthy()
      expect(typeof rule.condition === 'function' || typeof rule.match === 'function').toBe(true)
      expect(typeof rule.apply).toBe('function')
      // 空事实下 condition 不应抛错
      const result = rule.condition
        ? rule.condition({ facts: [] })
        : rule.match([], {})
      expect(result === false || result == null || Array.isArray(result) || typeof result === 'object').toBe(true)
    }

    expect(ALL_V2_RULES.length).toBeGreaterThanOrEqual(REQUIRED_IDS.length)
    expect(rr.size()).toBeGreaterThanOrEqual(REQUIRED_IDS.length)
  })
})
