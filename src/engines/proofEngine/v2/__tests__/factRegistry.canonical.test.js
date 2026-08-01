/**
 * FactRegistry canonical / values / alternateProofs 测试
 */
import { describe, it, expect } from 'vitest'
import { createFactRegistry } from '../factRegistry.js'

describe('factRegistry.canonical', () => {
  it('intersection 前两参数顺序无关', () => {
    const fr = createFactRegistry()
    const a = fr.addFact({ type: 'intersection', subjects: ['BEF', 'PAC', 'FG'] })
    const b = fr.addFact({ type: 'intersection', subjects: ['PAC', 'BEF', 'FG'] })
    expect(a.id).toBe(b.id)
    expect(fr.size()).toBe(1)
  })

  it('ratio 不同比值是不同 fact', () => {
    const fr = createFactRegistry()
    const r12 = fr.addFact({ type: 'ratio', subjects: ['AB', 'CD'], values: [1, 2] })
    const r23 = fr.addFact({ type: 'ratio', subjects: ['AB', 'CD'], values: [2, 3] })
    expect(r12.id).not.toBe(r23.id)
    expect(fr.size()).toBe(2)
  })

  it('相同 fact 不同来源合并 sources 并记录 alternateProofs', () => {
    const fr = createFactRegistry()
    const first = fr.addFact({
      type: 'parallel',
      subjects: ['AB', 'CD'],
      sources: ['rule_a'],
    })
    const second = fr.addFact({
      type: 'parallel',
      subjects: ['CD', 'AB'],
      sources: ['rule_b'],
    })
    expect(first.id).toBe(second.id)
    expect(fr.size()).toBe(1)
    expect(first.sources).toEqual(expect.arrayContaining(['rule_a', 'rule_b']))
    expect(Array.isArray(first.alternateProofs)).toBe(true)
    expect(first.alternateProofs.length).toBeGreaterThan(0)
  })

  it('intersection 线名端点顺序无关（EB∩CA ≡ BE∩AC）', () => {
    const fr = createFactRegistry()
    const a = fr.addFact({ type: 'intersection', subjects: ['BE', 'AC', 'G'] })
    const b = fr.addFact({ type: 'intersection', subjects: ['EB', 'CA', 'G'] })
    expect(a.id).toBe(b.id)
    expect(fr.size()).toBe(1)
  })

  it('ratio 两段交换且值同步交换是同一 fact（AP:AF=3:1 ≡ AF:AP=1:3）', () => {
    const fr = createFactRegistry()
    const a = fr.addFact({ type: 'ratio', subjects: ['AP', 'AF'], values: [3, 1] })
    const b = fr.addFact({ type: 'ratio', subjects: ['AF', 'AP'], values: [1, 3] })
    expect(a.id).toBe(b.id)
    expect(fr.size()).toBe(1)
    // 存储方向与值保持一致语义
    const idx = a.subjects.indexOf('AP')
    expect(a.values[idx] / a.values[1 - idx]).toBe(3)
  })

  it('ratio values 归一：整数比约分（2:6 ≡ 1:3）', () => {
    const fr = createFactRegistry()
    const a = fr.addFact({ type: 'ratio', subjects: ['AB', 'CD'], values: [2, 6] })
    const b = fr.addFact({ type: 'ratio', subjects: ['AB', 'CD'], values: [1, 3] })
    expect(a.id).toBe(b.id)
    expect(fr.size()).toBe(1)
    expect(a.values).toEqual([1, 3])
  })

  it('on 载体线段端点顺序无关（F on PA ≡ F on AP）', () => {
    const fr = createFactRegistry()
    const a = fr.addFact({ type: 'on', subjects: ['F', 'PA'] })
    const b = fr.addFact({ type: 'on', subjects: ['F', 'AP'] })
    expect(a.id).toBe(b.id)
    expect(fr.size()).toBe(1)
  })

  it('on_plane 平面名字符顺序无关（F∈PAC ≡ F∈CAP）', () => {
    const fr = createFactRegistry()
    const a = fr.addFact({ type: 'on_plane', subjects: ['F', 'PAC'] })
    const b = fr.addFact({ type: 'on_plane', subjects: ['F', 'CAP'] })
    expect(a.id).toBe(b.id)
    expect(fr.size()).toBe(1)
  })

  it('alternateProofs 时间戳为确定性逻辑时钟（非 Date.now）', () => {
    const fr = createFactRegistry()
    fr.addFact({ type: 'parallel', subjects: ['AB', 'CD'], sources: ['rule_a'] })
    const fact = fr.addFact({ type: 'parallel', subjects: ['CD', 'AB'], sources: ['rule_b'] })
    expect(fact.alternateProofs[0].at).toBe(1)
    fr.mergeAlternateProof(fact.id, ['rule_c'])
    expect(fact.alternateProofs[1].at).toBe(2)
  })

  it('on / on_plane / plane / similar 可规范化', () => {
    const fr = createFactRegistry()
    const on1 = fr.addFact({ type: 'on', subjects: ['F', 'PA'] })
    const on2 = fr.addFact({ type: 'on', subjects: ['F', 'PA'] })
    expect(on1.id).toBe(on2.id)

    const p1 = fr.addFact({ type: 'plane', subjects: ['P', 'A', 'C'] })
    const p2 = fr.addFact({ type: 'plane', subjects: ['C', 'P', 'A'] })
    expect(p1.id).toBe(p2.id)

    const op = fr.addFact({ type: 'on_plane', subjects: ['F', 'PAC'] })
    expect(op.id).toContain('on_plane')

    const s1 = fr.addFact({ type: 'similar', subjects: ['ABC', 'DEF'] })
    const s2 = fr.addFact({ type: 'similar', subjects: ['DEF', 'ABC'] })
    expect(s1.id).toBe(s2.id)
  })
})
