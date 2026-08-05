import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HighlightEngine } from '../highlightEngine'

describe('HighlightEngine draw animation', () => {
  let engine

  beforeEach(() => {
    engine = new HighlightEngine()
    vi.spyOn(performance, 'now').mockReturnValue(0)
  })

  it('starts line highlight with drawProgress near 0', () => {
    engine.highlightLines(['AB'])
    const state = engine.getLineState('AB')
    expect(state.highlighted).toBe(true)
    expect(state.drawProgress).toBeGreaterThanOrEqual(0)
    expect(state.drawProgress).toBeLessThan(0.2)
  })

  it('grows drawProgress toward 1 over time', () => {
    engine.highlightLines(['AB'])
    performance.now.mockReturnValue(350)
    const mid = engine.getLineState('AB')
    expect(mid.drawProgress).toBeGreaterThan(0.3)
    expect(mid.drawProgress).toBeLessThan(1)

    performance.now.mockReturnValue(800)
    engine.update()
    const done = engine.getLineState('AB')
    expect(done.highlighted).toBe(true)
    expect(done.drawProgress).toBe(1)
  })

  it('keeps drawProgress=1 when not animating', () => {
    const idle = engine.getLineState('CD')
    expect(idle.drawProgress).toBe(1)
    expect(idle.highlighted).toBe(false)
  })
})
