import { describe, it, expect } from 'vitest'
import { solveLogicProblem } from '../solve.js'
import { validateLogicIR } from '../schema.js'

describe('solveLogicProblem', () => {
  it('solves 正副组长 multiply', () => {
    const ir = solveLogicProblem('从6人选正、副组长各1人，有多少种选法？')
    expect(ir).toBeTruthy()
    expect(validateLogicIR(ir).ok).toBe(true)
    expect(ir.answer).toBe('30')
    expect(ir.problemType).toBe('multiply_add')
  })

  it('solves combination 代表', () => {
    const ir = solveLogicProblem('从8人选3人当代表，有多少种选法？')
    expect(ir).toBeTruthy()
    expect(ir.problemType).toBe('perm_comb')
    expect(ir.answer).toBe('56')
  })

  it('solves classical probability 红白不放回', () => {
    const ir = solveLogicProblem(
      '袋中有4红3白，不放回连抽2次，都是红球的概率是多少？',
    )
    expect(ir).toBeTruthy()
    expect(ir.problemType).toBe('classical_prob')
    expect(ir.answer).toBe('2/7')
  })

  it('solves 衣服裤子 multiply', () => {
    const ir = solveLogicProblem('有3种上衣、4种裤子，各选一件搭配，有多少种？')
    expect(ir).toBeTruthy()
    expect(ir.answer).toBe('12')
  })

  it('returns null for unrelated text', () => {
    expect(solveLogicProblem('求正方体体积')).toBeNull()
  })
})
