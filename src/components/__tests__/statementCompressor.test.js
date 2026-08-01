import { describe, it, expect } from 'vitest'
import {
  compressStatements,
  parseStatement,
  toTextbookMath,
} from '../statementCompressor'

describe('statementCompressor — 平面归属', () => {
  it('五个 X∈同一平面 压缩成教材句', () => {
    const texts = ['A∈平面ABCD', 'B∈平面ABCD', 'C∈平面ABCD', 'D∈平面ABCD', 'E∈平面ABCD']
    expect(compressStatements(texts)).toBe('A、B、C、D、E ∈ 平面 ABCD')
  })

  it('带 ∴ 与句号的引擎原文也能压缩', () => {
    const texts = ['∴ A ∈ 平面PAC。', '∴ O ∈ 平面PAC。', '∴ G ∈ 平面PAC。']
    expect(compressStatements(texts)).toBe('A、O、G ∈ 平面 PAC')
  })
})

describe('statementCompressor — 直线归属', () => {
  it('两个 X∈同一直线 压缩成一句', () => {
    expect(compressStatements(['F∈PA', 'G∈PA'])).toBe('F、G ∈ 直线 PA')
  })
})

describe('statementCompressor — 等式不链式合并', () => {
  it('等式保持原样', () => {
    expect(compressStatements(['AB=CD', 'CD=EF', 'EF=GH'])).toBe(
      'AB=CD\nCD=EF\nEF=GH',
    )
  })
})

describe('statementCompressor — 比例不得压缩', () => {
  it('比例保持原样，不合并成一句', () => {
    const texts = ['AF:AP = 1:3', 'AG:AC = 1:3']
    const out = compressStatements(texts)
    expect(out).toContain('AF∶AP=1∶3')
    expect(out).toContain('AG∶AC=1∶3')
    expect(out.split('\n')).toHaveLength(2)
  })
})

describe('statementCompressor — 未知文本', () => {
  it('未知文本保持原样（仅符号清洗）', () => {
    const texts = ['连接 AC 和 BD，对角线互相平分于 O']
    expect(compressStatements(texts)).toBe('连接 AC 和 BD，对角线互相平分于 O')
  })
})

describe('statementCompressor — 平行', () => {
  it('同平面平行可归纳', () => {
    expect(compressStatements(['PC∥平面BEF', 'AB∥平面BEF'])).toBe(
      'PC、AB ∥ 平面 BEF',
    )
  })
})

describe('toTextbookMath 符号规范', () => {
  it('中文关系词统一为 ∈∥⊥，并保留教材间距', () => {
    expect(toTextbookMath('A属于平面PAC')).toBe('A ∈ 平面 PAC')
    expect(toTextbookMath('PC平行于平面BEF')).toBe('PC ∥ 平面 BEF')
    expect(toTextbookMath('AB垂直于平面ABC')).toBe('AB ⊥ 平面 ABC')
    expect(toTextbookMath('角AGE等于角CGB')).toBe('∠AGE=∠CGB')
  })

  it('全等使用 ≅', () => {
    expect(toTextbookMath('三角形ABC全等于三角形DEF')).toBe('△ABC≅△DEF')
  })
})

describe('parseStatement', () => {
  it('区分平面归属与直线归属', () => {
    expect(parseStatement('A∈平面ABCD').type).toBe('plane_membership')
    expect(parseStatement('F∈PA').type).toBe('line_membership')
    expect(parseStatement('AF:AP = 1:3').type).toBe('ratio')
    expect(parseStatement('∠AGE=∠CGB').type).toBe('angle')
  })
})
