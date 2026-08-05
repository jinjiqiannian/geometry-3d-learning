/**
 * 批量跑测高考基础语料 → 现有求解器
 * 不改核心架构，只验证能力覆盖。
 */
import { describe, it, expect } from 'vitest'
import { GAOKAO_BASIC_CORPUS } from './gaokaoBasicCorpus.js'
import { generateLocalSteps } from '../explanationEngine.js'
import { parseProblemSync } from '../problemParser.js'
import { solveExamGeometry } from '../examGeometrySolver.js'
import { solveTopicProblem } from '../topics/explainIR.js'
import { solveLogicProblem } from '../logicIR/solve.js'

function matchExpect(haystack, expect) {
  const s = String(haystack || '')
  const needles = expect.answerIncludes || []
  // 任一组「关键片段」命中即可（允许等价写法）
  return needles.some((n) => s.includes(n))
}

function solveOne(item) {
  if (item.subject === 'combo') {
    const ir = solveLogicProblem(item.text)
    return { ok: !!ir, answer: ir?.answer, raw: ir }
  }
  if (item.subject === 'derivative' || item.subject === 'conic') {
    const ir = solveTopicProblem(item.subject, item.text)
    return { ok: !!ir, answer: ir?.answer, raw: ir }
  }
  // geometry：先 exam solver，再 local steps
  const exam = solveExamGeometry(item.text, { type: 'cube' })
  if (exam?.answer) return { ok: true, answer: exam.answer, raw: exam }

  let parsed = null
  try {
    parsed = parseProblemSync(item.text)
  } catch {
    parsed = { type: 'cube', size: 2 }
  }
  const steps = generateLocalSteps(item.text, parsed || { type: 'cube' })
  const last = steps?.[steps.length - 1]
  const answer =
    last?.finalAnswer?.value ||
    last?.finalAnswer?.expression ||
    last?.content ||
    ''
  return { ok: steps?.length > 0, answer, raw: steps }
}

describe('gaokao basic corpus — batch capability report', () => {
  const failures = []
  const passes = []

  for (const item of GAOKAO_BASIC_CORPUS) {
    it(`${item.id}: ${item.source}`, () => {
      const result = solveOne(item)
      const hit = result.ok && matchExpect(result.answer, item.expect)
      if (hit) {
        passes.push(item.id)
      } else {
        failures.push({
          id: item.id,
          text: item.text,
          got: result.answer,
          expect: item.expect.answerIncludes,
        })
      }
      expect(hit, `FAIL ${item.id} got=${JSON.stringify(result.answer)}`).toBe(true)
    })
  }

  it('prints coverage summary', () => {
    const total = GAOKAO_BASIC_CORPUS.length
    // eslint-disable-next-line no-console
    console.log(
      `\n[GAOKAO BASIC] pass=${passes.length}/${total} fail=${failures.length}`,
    )
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(failures, null, 2))
    }
    expect(true).toBe(true)
  })
})
