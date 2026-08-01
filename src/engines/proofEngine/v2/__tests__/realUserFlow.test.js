/**
 * V2-E P0 真实用户流程测试
 *
 * 镜像 WorkspaceContext.parseAndGenerate 的链路：
 *   problemParser.parseProblemSync → tryV2Proof → ProofStep[]
 *
 * 场景：四棱锥 P-ABCD
 *   E midpoint AD / F on PA / PC parallel plane BEF
 * 必须验证：
 *   1. V2 被调用且不回退（tryV2Proof 返回非 null）
 *   2. scheduler 真实运行（runScheduler 被调用且 rounds > 0）
 *   3. 返回结构完整的 ProofStep[]
 *   4. 结论 AP/AF = 3（且禁止 AP/AF = 2）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 间谍包装 scheduler：验证 V2 调度真实运行，同时透传真实实现
vi.mock('../scheduler/scheduler.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, runScheduler: vi.fn((ctx) => actual.runScheduler(ctx)) }
})

import { tryV2Proof } from '../adapter.js'
import { runScheduler, SCHEDULER_STATUS } from '../scheduler/scheduler.js'
import { parseProblemSync } from '../../../problemParser.js'

const PROBLEM_TEXT =
  '四棱锥P-ABCD中，E是AD中点，F在PA上，PC∥平面BEF，求AP/AF的值'

function allText(steps) {
  return (steps || [])
    .map((s) => [s.title, s.content, s.formula, s.rule].filter(Boolean).join(' '))
    .join('\n')
}

beforeEach(() => {
  runScheduler.mockClear()
})

describe('V2-E P0 真实用户流程（parse → V2 → ProofStep）', () => {
  it('parser 提取全部三条前提关系与目标比例', () => {
    const parsedData = parseProblemSync(PROBLEM_TEXT)
    expect(parsedData.type).toBe('pyramid')
    expect(parsedData.relations).toEqual(
      expect.arrayContaining(['E midpoint AD', 'F on PA', 'PC parallel plane BEF'])
    )
    expect(parsedData.goal).toEqual({ type: 'ratio', subjects: ['AP', 'AF'] })
  })

  it('V2 被调用、scheduler 运行、返回 ProofStep[]', () => {
    const parsedData = parseProblemSync(PROBLEM_TEXT)
    const steps = tryV2Proof(parsedData)

    // V2 未回退
    expect(steps).not.toBeNull()
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThan(0)

    // scheduler 真实运行
    expect(runScheduler).toHaveBeenCalledTimes(1)
    const result = runScheduler.mock.results[0].value
    expect(result.rounds).toBeGreaterThan(0)
    expect(result.status).toBe(SCHEDULER_STATUS.GOAL_REACHED)

    // ProofStep 结构完整
    for (const s of steps) {
      expect(s).toHaveProperty('step')
      expect(s).toHaveProperty('title')
      expect(s).toHaveProperty('content')
      expect(s).toHaveProperty('type')
    }

    // 步骤来自 V2 规则链（非模板/硬编码路径）
    const ruleIds = steps.map((s) => s.rule).filter(Boolean)
    expect(ruleIds).toContain('proportional_segments')
    expect(ruleIds).toContain('line_parallel_plane_property')
  })

  it('结论必须为 AP/AF = 3，禁止 AP/AF = 2', () => {
    const parsedData = parseProblemSync(PROBLEM_TEXT)
    const steps = tryV2Proof(parsedData)
    const text = allText(steps)
    expect(text).toMatch(/AP\s*\/\s*AF\s*=\s*3(?!\d)/)
    expect(text).not.toMatch(/AP\s*\/\s*AF\s*=\s*2(?!\d)/)
  })
})
