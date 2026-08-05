import { describe, it, expect } from 'vitest'
import { solveLogicProblem } from '../solve.js'
import { solveTopicProblem } from '../../topics/explainIR.js'
import { solveExamGeometry } from '../../examGeometrySolver.js'

describe('gaokao basic coverage — expand existing solvers only', () => {
  it('概率：不放回先红后白', () => {
    const ir = solveLogicProblem('袋中有4红3白，不放回抽2次，求先红后白的概率')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('2/7') // 4/7 * 3/6 = 12/42 = 2/7
  })

  it('概率：放回两次都红', () => {
    const ir = solveLogicProblem('袋中有3红2白，有放回抽2次，求两次都是红的概率')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('9/25')
  })

  it('分类加法：两班各选1人', () => {
    const ir = solveLogicProblem('甲班30人乙班20人，从两班中选1名代表，有多少种选法')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('50')
  })

  it('导数：极值 x³−3x', () => {
    const ir = solveTopicProblem('derivative', '求函数 f(x)=x³−3x 的极值')
    expect(ir).toBeTruthy()
    expect(ir.answer).toMatch(/极大.*2/)
    expect(ir.answer).toMatch(/极小.*−2|极小.*-2/)
  })

  it('椭圆：求焦点', () => {
    const ir = solveTopicProblem('conic', '椭圆 x²/25+y²/16=1 的焦点坐标')
    expect(ir).toBeTruthy()
    expect(ir.answer).toMatch(/±3/)
  })

  it('立体几何：直线写法仍可算线面角', () => {
    const r = solveExamGeometry(
      '正方体中，求直线A₁C与平面ABCD所成角的正切值',
      { type: 'cube', size: 1, questionType: 'line_plane_angle' },
    )
    expect(r).toBeTruthy()
    expect(r.answer).toMatch(/tanθ/)
  })
})
