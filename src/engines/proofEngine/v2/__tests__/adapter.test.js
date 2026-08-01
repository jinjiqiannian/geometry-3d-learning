/**
 * V2-C1 Adapter Test
 */
import { describe, it, expect } from 'vitest'
import { tryV2Proof } from '../adapter.js'

const pyramidPD = {
  type: 'pyramid',
  size: 6,
  semantic: {
    shape: 'pyramid',
    points: ['P','A','B','C','D','E','F'],
    edges: [
      { from:'P',to:'A',label:'PA' },{ from:'P',to:'B',label:'PB' },
      { from:'P',to:'C',label:'PC' },{ from:'P',to:'D',label:'PD' },
      { from:'A',to:'B',label:'AB' },{ from:'B',to:'C',label:'BC' },
      { from:'C',to:'D',label:'CD' },{ from:'D',to:'A',label:'DA' },
    ],
    planes: [{ label:'BEF', points:['B','E','F'] }],
    relations: ['E midpoint AD','F on PA','PC parallel plane BEF'],
  },
}

const nonProofPD = {
  type: 'cube',
  size: 2,
  semantic: { shape: 'cube', points: ['A'], edges: [], planes: [], relations: [] },
}

describe('V2-C1 Adapter', () => {
  it('returns null for non-proof data', () => {
    expect(tryV2Proof(nonProofPD)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(tryV2Proof(null)).toBeNull()
  })

  it('does not throw for pyramid data', () => {
    const result = tryV2Proof(pyramidPD)
    // May return null (no GOAL_REACHED) or ProofStep[]
    expect(result === null || Array.isArray(result)).toBe(true)
  })

  it('if returns steps, each has required fields', () => {
    const result = tryV2Proof(pyramidPD)
    if (result) {
      for (const s of result) {
        expect(s).toHaveProperty('step')
        expect(s).toHaveProperty('title')
        expect(s).toHaveProperty('content')
      }
    }
  })
})