import { describe, it, expect } from 'vitest'
import {
  solveTopicProblem,
  validateExplainIR,
  TOPIC_EXAMPLES,
  EX_DERIV_POLY,
  EX_CONIC_ELLIPSE_E,
} from '../explainIR.js'

describe('explainIR topics', () => {
  it('examples validate', () => {
    expect(validateExplainIR(EX_DERIV_POLY).ok).toBe(true)
    expect(validateExplainIR(EX_CONIC_ELLIPSE_E).ok).toBe(true)
  })

  it('solves quadratic derivative', () => {
    const ir = solveTopicProblem('derivative', '求 f(x)=2x²+3x-1 的导数')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('4x+3')
  })

  it('solves ellipse eccentricity', () => {
    const ir = solveTopicProblem('conic', '椭圆 x²/25+y²/16=1 的离心率')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('3/5')
  })

  it('solves hyperbola foci', () => {
    const ir = solveTopicProblem('conic', '双曲线 x²/9−y²/16=1 的焦点')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('(±5,0)')
  })

  it('loads tangent example for classic cubic', () => {
    const ir = solveTopicProblem(
      'derivative',
      '求曲线 y=x³−3x 在 x=1 处的切线方程',
    )
    expect(ir.answer).toBe('y=−2')
  })

  it('returns null for wrong topic', () => {
    expect(solveTopicProblem('derivative', '椭圆离心率')).toBeNull()
  })

  it('has three examples per topic', () => {
    expect(Object.keys(TOPIC_EXAMPLES.derivative)).toHaveLength(3)
    expect(Object.keys(TOPIC_EXAMPLES.conic)).toHaveLength(3)
  })
})
