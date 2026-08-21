import { describe, it, expect } from 'vitest'
import { solveExamGeometry } from '../examGeometrySolver.js'
import { generateLocalSteps } from '../explanationEngine.js'
import { solveTopicProblem } from '../topics/explainIR.js'

describe('examGeometrySolver — 高考基础立体几何', () => {
  it('正方体 A1B 与底面线面角 sin = √2/2', () => {
    const text = '正方体ABCD-A₁B₁C₁D₁中，求A₁B与平面ABCD所成角的正弦值'
    const r = solveExamGeometry(text, { type: 'cube', size: 2, questionType: 'line_plane_angle' })
    expect(r).toBeTruthy()
    expect(r.answer).toMatch(/√2\/2|0\.707/)
    expect(r.steps.at(-1).finalAnswer.value).toMatch(/√2\/2/)
  })

  it('正方体 A1C 与底面线面角 sin = √3/3', () => {
    const text = '正方体棱长为2，求对角线A₁C与底面ABCD所成角的正弦值'
    const r = solveExamGeometry(text, { type: 'cube', size: 2, questionType: 'line_plane_angle' })
    expect(r).toBeTruthy()
    expect(r.answer).toMatch(/√3\/3/)
  })

  it('点 C1 到底面距离 = 棱长', () => {
    const text = '正方体棱长为3，求点C₁到平面ABCD的距离'
    const r = solveExamGeometry(text, { type: 'cube', size: 3, questionType: 'point_plane_distance' })
    expect(r).toBeTruthy()
    expect(r.answer).toMatch(/d = 3/)
  })

  it('generateLocalSteps 走实算而非假模板答案', () => {
    const text = '正方体棱长为1，求A₁B与平面ABCD所成角的正弦值'
    const steps = generateLocalSteps(text, {
      type: 'cube',
      size: 1,
      questionType: 'line_plane_angle',
    })
    const last = steps[steps.length - 1]
    expect(last.content).not.toMatch(/√3\/3/) // 旧模板写死的错误答案
    expect(last.finalAnswer?.value || last.content).toMatch(/√2\/2/)
  })
})

describe('explainIR — 高考基础导数/圆锥扩覆盖', () => {
  it('幂函数切线 y=x^3 在 x=2', () => {
    const ir = solveTopicProblem('derivative', '求曲线 y=x^3 在 x=2 处的切线方程')
    expect(ir).toBeTruthy()
    expect(ir.answer).toMatch(/12/)
    expect(ir.answer).toMatch(/8/)
  })

  it('抛物线 y²=8x 焦点', () => {
    const ir = solveTopicProblem('conic', '抛物线 y²=8x 的焦点坐标')
    expect(ir).toBeTruthy()
    expect(ir.answer).toMatch(/\(2,\s*0\)/)
  })
})
