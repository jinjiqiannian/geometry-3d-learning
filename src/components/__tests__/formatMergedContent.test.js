import { describe, it, expect } from 'vitest'
import { formatMergedContent } from '../formatMergedContent'

describe('formatMergedContent — 同谓词归纳', () => {
  it('模式1：同平面归属合并为教材表达式', () => {
    const input = ['A∈平面ABCD', 'B∈平面ABCD', 'C∈平面ABCD']
    expect(formatMergedContent(input)).toBe('A、B、C ∈ 平面 ABCD')
  })

  it('模式1：五个点同平面', () => {
    const input = [
      'A∈平面ABCD',
      'B∈平面ABCD',
      'C∈平面ABCD',
      'D∈平面ABCD',
      'E∈平面ABCD',
    ]
    expect(formatMergedContent(input)).toBe('A、B、C、D、E ∈ 平面 ABCD')
  })

  it('模式1：超量点折叠为同类结论提示', () => {
    const pts = 'ABCDEFGHIJKLMNOP'.split('')
    const input = pts.map((p) => `${p}∈平面ABCD`)
    const out = formatMergedContent(input)
    expect(out).toContain('A、B、C、D、E、F、G ∈ 平面 ABCD')
    expect(out).toContain('还有 9 项同类结论')
  })

  it('自然语言位置与得到：前缀被清洗', () => {
    expect(formatMergedContent(['得到：A在线段PA上', '得到：B在线段PA上'])).toBe(
      'A、B ∈ 直线 PA',
    )
  })

  it('模式2：同直线归属', () => {
    expect(formatMergedContent(['F∈PA', 'G∈PA'])).toBe('F、G ∈ 直线 PA')
  })

  it('模式3：同平面平行可合并', () => {
    expect(formatMergedContent(['PC∥平面BEF', 'AB∥平面BEF'])).toBe(
      'PC、AB ∥ 平面 BEF',
    )
  })

  it('模式4：等式保持原样，不处理', () => {
    expect(formatMergedContent(['AB=CD', 'CD=EF', 'EF=GH'])).toBe(
      'AB=CD\nCD=EF\nEF=GH',
    )
  })

  it('模式5：复杂证明句保持原样', () => {
    const complex = [
      '∵ AB∥CD，CD∥EF，∴ AB∥EF',
      '由中位线定理得 MN∥BC',
    ]
    const out = formatMergedContent(complex)
    expect(out).toContain('AB∥CD')
    expect(out).toContain('由中位线定理得 MN∥BC')
    expect(out).not.toMatch(/这些点均属于/)
    expect(out).not.toMatch(/均平行/)
  })

  it('其它类型证明步骤不得变化（单条叙事）', () => {
    const text = '连接 AC 和 BD，对角线互相平分于 O'
    expect(formatMergedContent([text])).toBe(text)
  })

  it('不允许生成自然语言总结', () => {
    const out = formatMergedContent(['A∈平面ABCD', 'B∈平面ABCD'])
    expect(out).toBe('A、B ∈ 平面 ABCD')
    expect(out).not.toMatch(/属于|均|这些/)
  })

  it('规则→结论：直线在平面内 压成一句并去重', () => {
    const input = [
      '若直线上两点在平面内，则直线在平面内 → 直线 A-B ∈ 平面 A',
      '若直线上两点在平面内，则直线在平面内 → 直线 A-B ∈ 平面 A',
      '若直线上两点在平面内，则直线在平面内 → 直线 B-C ∈ 平面 A',
      '若直线上两点在平面内，则直线在平面内 → 直线 B-C ∈ 平面 B',
      '若直线上两点在平面内，则直线在平面内 → 直线 C-D ∈ 平面 A',
    ]
    expect(formatMergedContent(input)).toBe('AB、BC、CD ∈ 平面 A；BC ∈ 平面 B')
  })

  it('规则→结论：引擎中文写法 直线AB在平面X内', () => {
    const input = [
      '若直线上两点在平面内，则直线在平面内 → 直线AB在平面ABCD内',
      '若直线上两点在平面内，则直线在平面内 → 直线BC在平面ABCD内',
      '若直线上两点在平面内，则直线在平面内 → 直线PC在平面PBC内',
    ]
    expect(formatMergedContent(input)).toBe('AB、BC ∈ 平面 ABCD；PC ∈ 平面 PBC')
  })

  it('多平面点归属：按平面分组压缩', () => {
    const input = [
      'A∈平面ABCD',
      'B∈平面ABCD',
      'C∈平面ABCD',
      'D∈平面ABCD',
      'O∈平面ABCD',
      'A∈平面ABP',
      'B∈平面ABP',
      'P∈平面ABP',
      'E∈平面CDP',
      'E∈平面DAP',
    ]
    expect(formatMergedContent(input)).toBe(
      'A、B、C、D、O ∈ 平面 ABCD；A、B、P ∈ 平面 ABP；E ∈ 平面 CDP；E ∈ 平面 DAP',
    )
  })
})
