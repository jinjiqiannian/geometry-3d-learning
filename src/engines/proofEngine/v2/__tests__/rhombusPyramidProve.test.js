/**
 * 菱形四棱锥双求证：BD⊥平面PAC；PB∥平面AEC
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../scheduler/scheduler.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, runScheduler: vi.fn((ctx) => actual.runScheduler(ctx)) }
})

import { tryV2Proof } from '../adapter.js'
import { runScheduler, SCHEDULER_STATUS } from '../scheduler/scheduler.js'
import { parseProblemSync } from '../../../problemParser.js'
import { parseProblemToSemantic } from '../../../geometryValidator.js'
import { generateLocalSteps } from '../../../explanationEngine.js'

const PROBLEM_TEXT =
  '如图，在四棱锥P-ABCD中，底面ABCD是菱形，PA⊥平面ABCD，E为PD的中点。(1)求证：BD⊥平面PAC；(2)求证：PB∥平面AEC。'

function allText(steps) {
  return (steps || [])
    .map((s) => [s.title, s.content, s.formula, s.rule].filter(Boolean).join(' '))
    .join('\n')
}

beforeEach(() => {
  runScheduler.mockClear()
})

describe('菱形四棱锥双求证（parse → V2）', () => {
  it('parser：已知不含求证结论，并提取双 goal + 菱形', () => {
    const parsed = parseProblemSync(PROBLEM_TEXT)
    expect(parsed.type).toBe('pyramid')
    expect(parsed.baseShape).toBe('rhombus')
    expect(parsed.relations).toEqual(
      expect.arrayContaining([
        'E midpoint PD',
        'PA perpendicular plane ABCD',
      ])
    )
    expect(parsed.relations).not.toEqual(
      expect.arrayContaining([
        'BD perpendicular plane PAC',
        'PB parallel plane AEC',
      ])
    )
    expect(parsed.goals).toEqual(
      expect.arrayContaining([
        { type: 'perpendicular', subjects: ['BD', 'PAC'] },
        { type: 'parallel', subjects: ['PB', 'AEC'] },
      ])
    )
  })

  it('V2 达成 GOAL_REACHED，含线面垂直/平行判定，不以比例收尾', () => {
    // 与线上一致：semantic 构图 + goals
    const semantic = parseProblemToSemantic(PROBLEM_TEXT)
    const parsed = {
      type: semantic.shape,
      labels: semantic.points,
      vertices: semantic.points,
      relations: semantic.relations,
      planes: semantic.planes,
      semantic,
      goal: semantic.goal,
      goals: semantic.goals,
      baseShape: semantic.baseShape,
    }
    const steps = tryV2Proof(parsed)
    expect(steps).not.toBeNull()
    expect(runScheduler).toHaveBeenCalled()
    expect(runScheduler.mock.results[0].value.status).toBe(
      SCHEDULER_STATUS.GOAL_REACHED
    )

    const rules = steps.map((s) => s.rule).filter(Boolean)
    expect(rules).toContain('rhombus_diagonals_perpendicular')
    expect(rules).toContain('line_perp_plane_criterion')
    expect(rules).toContain('triangle_midsegment')
    expect(rules).toContain('line_parallel_plane_criterion')

    const text = allText(steps)
    expect(text).toMatch(/BD\s*⊥\s*平面\s*PAC|BD ⊥ 平面PAC/)
    expect(text).toMatch(/(?:PB|BP)\s*∥\s*平面\s*AEC|(?:PB|BP) ∥ 平面AEC/)
    expect(text).not.toMatch(/正方形\/平行四边形/)
    expect(steps.some((s) => s.title === '比例计算' && s === steps[steps.length - 1])).toBe(false)
    expect(steps.length).toBeLessThan(60)
  })

  it('线上降级路径 generateLocalSteps 也走正确证明', () => {
    const semantic = parseProblemToSemantic(PROBLEM_TEXT)
    const steps = generateLocalSteps(PROBLEM_TEXT, {
      type: semantic.shape,
      labels: semantic.points,
      vertices: semantic.points,
      relations: semantic.relations,
      planes: semantic.planes,
      semantic,
      goal: semantic.goal,
      goals: semantic.goals,
      baseShape: semantic.baseShape,
    })
    const text = allText(steps)
    expect(text).toMatch(/线面垂直判定|BD\s*⊥\s*平面\s*PAC/)
    expect(text).toMatch(/线面平行判定|(?:PB|BP)\s*∥\s*平面\s*AEC/)
    expect(text).not.toMatch(/正方形\/平行四边形/)
  })
})
