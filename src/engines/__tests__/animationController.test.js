import { describe, it, expect } from 'vitest'
import { sampleAnimationIR, ANIMATION_EASE } from '../animationController'

const IR = {
  scene: 'cuboid',
  params: { w: 4, h: 3, d: 2 },
  duration: 4,
  tracks: [
    { slot: 'w', keys: [{ t: 0, v: 2 }, { t: 2, v: 4, ease: 'easeInOut' }] },
  ],
  overlays: [
    { kind: 'label', text: 'V = abc', anchor: 'face', from: 0.5, to: 3 },
  ],
}

describe('sampleAnimationIR', () => {
  it('is pure: identical result for identical input, and does not mutate ir', () => {
    const snapshot = JSON.stringify(IR)

    expect(sampleAnimationIR(IR, 1)).toEqual(sampleAnimationIR(IR, 1))
    expect(JSON.stringify(IR)).toBe(snapshot)
  })

  it('interpolates linearly between keys by default', () => {
    const ir = {
      params: {},
      duration: 4,
      tracks: [{ slot: 'x', keys: [{ t: 0, v: 0 }, { t: 2, v: 10 }] }],
    }

    expect(sampleAnimationIR(ir, 1).params.x).toBe(5)
  })

  it('applies the ease declared on the ending key', () => {
    const ir = {
      params: {},
      duration: 4,
      tracks: [
        { slot: 'x', keys: [{ t: 0, v: 0 }, { t: 2, v: 10, ease: 'easeInOut' }] },
      ],
    }

    expect(sampleAnimationIR(ir, 1).params.x).toBe(5)
    expect(sampleAnimationIR(ir, 0.5).params.x).toBeCloseTo(0.625, 10)
  })

  it('ignores an ease declared on the starting key', () => {
    const ir = {
      params: {},
      duration: 4,
      tracks: [
        { slot: 'x', keys: [{ t: 0, v: 0, ease: 'easeInOut' }, { t: 2, v: 10 }] },
      ],
    }

    expect(sampleAnimationIR(ir, 0.5).params.x).toBe(2.5)
  })

  it('falls back to linear for unknown ease names', () => {
    const ir = {
      params: {},
      duration: 2,
      tracks: [
        { slot: 'x', keys: [{ t: 0, v: 0 }, { t: 2, v: 10, ease: 'nope' }] },
      ],
    }

    expect(sampleAnimationIR(ir, 1).params.x).toBe(5)
  })

  it('clamps time to the key range and to the duration', () => {
    const ir = {
      params: {},
      duration: 4,
      tracks: [{ slot: 'x', keys: [{ t: 1, v: 7 }, { t: 3, v: 9 }] }],
    }

    expect(sampleAnimationIR(ir, 0).params.x).toBe(7)
    expect(sampleAnimationIR(ir, -5).params.x).toBe(7)
    expect(sampleAnimationIR(ir, 99).params.x).toBe(9)
  })

  it('normalizes NaN time to 0', () => {
    expect(sampleAnimationIR(IR, NaN).params.w).toBe(2)
  })

  it('keeps params that no track drives', () => {
    expect(sampleAnimationIR(IR, 2).params.h).toBe(3)
  })

  it('selects overlays by their time window', () => {
    expect(sampleAnimationIR(IR, 0).overlays).toHaveLength(0)
    expect(sampleAnimationIR(IR, 1).overlays).toHaveLength(1)
    expect(sampleAnimationIR(IR, 4).overlays).toHaveLength(0)
  })

  it('treats an overlay without from/to as always visible', () => {
    const ir = { params: {}, duration: 2, overlays: [{ kind: 'label', text: 'x' }] }

    expect(sampleAnimationIR(ir, 0).overlays).toHaveLength(1)
    expect(sampleAnimationIR(ir, 2).overlays).toHaveLength(1)
  })

  it('handles equal adjacent key times without dividing by zero', () => {
    const ir = {
      params: {},
      duration: 2,
      tracks: [{ slot: 'x', keys: [{ t: 1, v: 1 }, { t: 1, v: 5 }] }],
    }

    expect(sampleAnimationIR(ir, 1).params.x).toBe(1)
    expect(sampleAnimationIR(ir, 1.5).params.x).toBe(5)
  })

  it('handles single-key and empty tracks', () => {
    const single = {
      params: {},
      duration: 2,
      tracks: [{ slot: 'x', keys: [{ t: 0, v: 3 }] }],
    }
    expect(sampleAnimationIR(single, 1).params.x).toBe(3)

    const empty = {
      params: { x: 8 },
      duration: 2,
      tracks: [{ slot: 'x', keys: [] }],
    }
    expect(sampleAnimationIR(empty, 1).params.x).toBe(8)
  })

  it('handles zero duration', () => {
    const ir = {
      params: {},
      duration: 0,
      tracks: [{ slot: 'x', keys: [{ t: 0, v: 0 }, { t: 1, v: 9 }] }],
    }

    expect(sampleAnimationIR(ir, 1).params.x).toBe(0)
  })

  it('returns an empty result for non-object input', () => {
    expect(sampleAnimationIR(null, 1)).toEqual({ params: {}, overlays: [] })
    expect(sampleAnimationIR(undefined, 1)).toEqual({ params: {}, overlays: [] })
  })

  it('exposes the ease table used for whitelisting', () => {
    expect(Object.keys(ANIMATION_EASE).sort()).toEqual([
      'easeIn',
      'easeInOut',
      'easeOut',
      'linear',
    ])
  })
})
