import { describe, it, expect } from 'vitest'
import { validateAndCompleteSemantic } from '../geometryValidator'

describe('generateAnimationSteps pedagogy', () => {
  it('splits cube construction into vertices then edges', () => {
    const semantic = validateAndCompleteSemantic({
      shape: 'cube',
      points: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
      edges: [
        { label: 'AB' },
        { label: 'BC' },
        { label: 'CD' },
        { label: 'DA' },
      ],
      relations: [],
      importantLines: ['AC', 'A1C'],
    })

    const steps = semantic.animationSteps
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(steps[0].title).toMatch(/顶点/)
    expect(steps[0].addElements.points?.length).toBeGreaterThan(0)
    expect(steps[1].title).toMatch(/连出|几何体/)
    expect(steps[1].addElements.edges?.length).toBeGreaterThan(0)
  })

  it('adds midpoint construction as its own teaching step', () => {
    const semantic = validateAndCompleteSemantic({
      shape: 'cube',
      points: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1', 'M'],
      edges: [{ label: 'AB' }, { label: 'BC' }],
      relations: ['M midpoint AB'],
      importantLines: [],
    })

    const midStep = semantic.animationSteps.find((s) => /中点/.test(s.title))
    expect(midStep).toBeTruthy()
    expect(midStep.addElements.highlightPoints).toContain('M')
  })

  it('highlights important lines one by one', () => {
    const semantic = validateAndCompleteSemantic({
      shape: 'cube',
      points: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
      edges: [{ label: 'AB' }],
      relations: [],
      importantLines: ['AB', 'AC'],
    })

    const focusSteps = semantic.animationSteps.filter((s) => /关注线段/.test(s.title))
    expect(focusSteps.length).toBe(2)
    expect(focusSteps[0].addElements.highlightEdges).toEqual(['AB'])
    expect(focusSteps[1].addElements.highlightEdges).toEqual(['AB', 'AC'])
  })
})
