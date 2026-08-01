import { describe, it, expect } from 'vitest'
import { extractRelations } from '../problemParser.js'
import { parseProblemToSemantic } from '../geometryValidator.js'

describe('PA⊥底面 — 关系抽取与构图', () => {
  const text =
    '如图，四棱锥P-ABCD中，PA⊥底面ABCD, PA=AC=2, BC=1, AB=√3. (1)若AD∥PB, 证明: AD∥平面PBC;'

  it('extracts PA perpendicular plane ABCD from 底面 wording', () => {
    const rels = extractRelations(text)
    expect(rels.some((r) => r.includes('PA perpendicular plane'))).toBe(true)
    const hit = rels.find((r) => r.startsWith('PA perpendicular plane'))
    expect(hit).toMatch(/ABCD|ABC/)
  })

  it('places apex P above foot A (not centered)', () => {
    const semantic = parseProblemToSemantic(text)
    expect(semantic.shape).toBe('pyramid')
    expect(semantic.roleMap?.apex).toBe('P')
    const A = semantic.pointPositions?.A
    const P = semantic.pointPositions?.P
    expect(A).toBeTruthy()
    expect(P).toBeTruthy()
    // 垂足在 A：P 在水平面上的投影应接近 A（模板底面水平）
    const dx = Math.abs(P[0] - A[0])
    const dz = Math.abs(P[2] - A[2])
    expect(dx).toBeLessThan(0.15)
    expect(dz).toBeLessThan(0.15)
    // 且明显高于底面
    expect(P[1] - A[1]).toBeGreaterThan(1)
  })
})
