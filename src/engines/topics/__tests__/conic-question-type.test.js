import { describe, it, expect } from 'vitest'
import { solveTopicProblem } from '../explainIR.js'

/**
 * 回归：圆锥曲线的本地求解器原来只匹配「标准方程」这一件事，
 * 完全不看题目问的是什么 ——
 *   双曲线分支：任何含 x²/a²−y²/b²=1 的题都返回焦点
 *   椭圆分支：任何含 x²/a²+y²/b²=1 的题都返回离心率
 * 于是「求双曲线 x²/9−y²/16=1 的离心率」会得到 (±5,0)。
 * 学生拿到的是一个自信的、错误的答案。
 */
describe('圆锥曲线：问什么答什么', () => {
  it('双曲线求离心率 → e=c/a，不是焦点', () => {
    const ir = solveTopicProblem('conic', '求双曲线 x²/9 − y²/16 = 1 的离心率。')
    expect(ir.answer).toContain('5/3')
    expect(ir.answer).not.toContain('±')
    expect(ir.problemType).toBe('hyper_e')
  })

  it('双曲线求焦点 → (±c,0)', () => {
    const ir = solveTopicProblem('conic', '求双曲线 x²/9 − y²/16 = 1 的焦点坐标。')
    expect(ir.answer).toBe('(±5,0)')
    expect(ir.problemType).toBe('hyper_focus')
  })

  it('双曲线求渐近线 → y=±(b/a)x', () => {
    const ir = solveTopicProblem('conic', '求双曲线 x²/9 − y²/16 = 1 的渐近线方程。')
    expect(ir.answer).toBe('y=±(4/3)x')
    expect(ir.problemType).toBe('hyper_asym')
  })

  it('椭圆求离心率 → e=c/a', () => {
    const ir = solveTopicProblem('conic', '求椭圆 x²/25 + y²/16 = 1 的离心率。')
    expect(ir.answer).toContain('3/5')
    expect(ir.problemType).toBe('ellipse_e')
  })

  it('椭圆求焦点 → (±c,0)，不是离心率', () => {
    const ir = solveTopicProblem('conic', '求椭圆 x²/25 + y²/16 = 1 的焦点坐标。')
    expect(ir.answer).toBe('(±3,0)')
    expect(ir.problemType).toBe('ellipse_focus')
  })

  it('焦点在 y 轴时焦点写作 (0,±c)', () => {
    const ir = solveTopicProblem('conic', '求椭圆 x²/16 + y²/25 = 1 的焦点坐标。')
    expect(ir.answer).toBe('(0,±3)')
  })
})
