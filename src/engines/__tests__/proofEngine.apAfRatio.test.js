/**
 * ProofEngine Phase C 验收回归测试 —— AP/AF = 3
 *
 * 场景：四棱锥 P-ABCD
 *   条件1: E 是 AD 中点
 *   条件2: F 在 PA 上
 *   条件3: PC ∥ plane(BEF)
 * 正确结论：AP/AF = 3
 *   （平面BEF∩平面PAC = FG，FG∥PC；底面中 BE∩AC = G，
 *     △AGE∽△CGB → AG:GC = AE:CB = 1:2 → AG/AC = 1/3 → AF/AP = 1/3）
 * 禁止结论：AP/AF = 2（误用中位线定理的典型错误）
 *
 * describe 按阶段命名，测试失败时输出直接定位责任模块：
 *   B1 → FactExtractor（事实提取）
 *   B2 → RuleMatcher（V1 基础规则匹配）/ V2 规则库（ratio 推导规则）
 *   B3 → ProofGenerator（证明步骤组装 / 结论产出，V2 优先）
 *
 * V2-E P3 起：AP/AF=3 必须来自 ProofEngine V2 规则链
 * （ruleMatcher 的 parallel_line_proportional 硬编码规则已删除）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 间谍包装：拦截 reason 调用以验证链路 A，同时透传真实实现（不影响 B/C 的真实性）
vi.mock('../proofEngine/index.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, reason: vi.fn((ctx) => actual.reason(ctx)) }
})

import { generateLocalSteps } from '../explanationEngine'
import {
  reason,
  extractFacts,
  matchRules,
  generateProof,
} from '../proofEngine/index.js'
import { ALL_V2_RULES } from '../proofEngine/v2/rules/index.js'

// ── 测试夹具：镜像 WorkspacePage 三条路径的 parsedData 构造 ──
const semantic = {
  shape: 'pyramid',
  size: 6,
  points: ['P', 'A', 'B', 'C', 'D', 'E', 'F'],
  edges: [
    { from: 'P', to: 'A', label: 'PA' },
    { from: 'A', to: 'D', label: 'AD' },
    { from: 'P', to: 'C', label: 'PC' },
    { from: 'B', to: 'E', label: 'BE' },
    { from: 'E', to: 'F', label: 'EF' },
  ],
  planes: [{ label: 'BEF', points: ['B', 'E', 'F'] }],
  relations: ['E midpoint AD', 'F on PA', 'PC parallel plane BEF'],
  importantPlanes: ['BEF'],
}

const parsedData = {
  type: 'pyramid',
  size: 6,
  questionType: 'proof', // 固定非可计算题型，避免 Phase 1 (solveGeometry) 拦截
  labels: semantic.points,
  vertices: semantic.points,
  relations: semantic.relations,
  planes: semantic.planes,
  importantPlanes: semantic.importantPlanes,
  semantic,
}

const PROBLEM_TEXT =
  '四棱锥P-ABCD中，E是AD中点，F在PA上，PC∥平面BEF，求AP/AF的值'

// 镜像 explanationEngine.js:1430-1441 的 ctx 构造
function buildCtx(pd) {
  const labels = pd.labels || pd.vertices || []
  return {
    type: pd.type,
    size: pd.size,
    typeName: pd.type,
    labelStr: labels.join('、'),
    firstLabel: labels[0] || '',
    relations: pd.relations || [],
    planes: pd.planes || [],
    importantPlanes: pd.importantPlanes || [],
    semantic: pd.semantic || {},
    vertices: pd.vertices || [],
  }
}

// 聚合步骤全部文本，用于内容断言
function allText(steps) {
  return (steps || [])
    .map((s) => [s.title, s.content, s.formula, s.rule].filter(Boolean).join(' '))
    .join('\n')
}

beforeEach(() => {
  reason.mockClear()
})

// ────────────────────────────────────────────────────────────
// A. ProofEngine 是否被调用（集成链路 parsedData → ctx → reason）
// ────────────────────────────────────────────────────────────
describe('A. ProofEngine 调用链 (generateLocalSteps → proofEngine.reason)', () => {
  it('generateLocalSteps 应调用 proofEngine.reason，且 ctx 完整携带 relations/semantic', () => {
    const steps = generateLocalSteps(PROBLEM_TEXT, parsedData)

    expect(reason).toHaveBeenCalledTimes(1)

    const ctxArg = reason.mock.calls[0][0]
    expect(ctxArg.relations).toEqual(
      expect.arrayContaining(['E midpoint AD', 'F on PA', 'PC parallel plane BEF'])
    )
    expect(ctxArg.semantic?.points).toEqual(expect.arrayContaining(['E', 'F']))
    expect(ctxArg.importantPlanes).toContain('BEF')

    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────
// B1. FactExtractor —— 三条前提事实必须可提取
// ────────────────────────────────────────────────────────────
describe('B1. FactExtractor — 事实提取', () => {
  it('提取 midpoint 事实：E 是 AD 中点', () => {
    const facts = extractFacts(buildCtx(parsedData))
    expect(facts).toContainEqual(
      expect.objectContaining({
        type: 'midpoint',
        subjects: expect.arrayContaining(['E', 'A', 'D']),
      })
    )
  })

  it('提取 on 事实：F 在 PA 上', () => {
    const facts = extractFacts(buildCtx(parsedData))
    expect(facts).toContainEqual(
      expect.objectContaining({
        type: 'on',
        subjects: expect.arrayContaining(['F', 'PA']),
      })
    )
  })

  it('提取 parallel 事实：PC ∥ 平面BEF', () => {
    const facts = extractFacts(buildCtx(parsedData))
    expect(facts).toContainEqual(
      expect.objectContaining({
        type: 'parallel',
        subjects: expect.arrayContaining(['PC', 'BEF']),
      })
    )
  })
})

// ────────────────────────────────────────────────────────────
// B2. RuleMatcher —— 前提规则命中 + ratio 推导规则存在
// ────────────────────────────────────────────────────────────
describe('B2. RuleMatcher — 规则匹配', () => {
  it('命中 midpoint 规则 (midpoint_divides_segment)', () => {
    const inferences = matchRules(extractFacts(buildCtx(parsedData)))
    expect(inferences.some((s) => s.ruleId === 'midpoint_divides_segment')).toBe(true)
  })

  it('命中 parallel plane 规则 (parallel_line_plane)', () => {
    const inferences = matchRules(extractFacts(buildCtx(parsedData)))
    expect(inferences.some((s) => s.ruleId === 'parallel_line_plane')).toBe(true)
  })

  it('ratio 推导规则由 V2 规则库提供（平行线分线段成比例 / 相似三角形）', () => {
    // P3：ruleMatcher 不再包含硬编码 ratio 规则，比例推导全部来自 V2
    const v1RatioRules = matchRules(extractFacts(buildCtx(parsedData))).filter(
      (s) => s.ruleId === 'parallel_line_proportional'
    )
    expect(v1RatioRules.length).toBe(0)

    const v2RatioRules = ALL_V2_RULES.filter((r) => r.conclusion === 'ratio')
    expect(v2RatioRules.map((r) => r.id)).toEqual(
      expect.arrayContaining(['proportional_segments', 'triangle_similarity_aa'])
    )
  })
})

// ────────────────────────────────────────────────────────────
// B3. ProofGenerator —— ProofStep 内容覆盖三类关键步骤
// ────────────────────────────────────────────────────────────
describe('B3. ProofGenerator — 证明步骤组装', () => {
  it('reason(ctx) 返回非空 ProofStep[]', () => {
    const out = reason(buildCtx(parsedData))
    expect(out).not.toBeNull()
    expect(out.length).toBeGreaterThan(0)
  })

  it('ProofStep 包含 midpoint 相关步骤', () => {
    const text = allText(generateProof(buildCtx(parsedData)))
    expect(text).toMatch(/中点|midpoint/)
  })

  it('ProofStep 包含 parallel plane 相关步骤', () => {
    const text = allText(generateProof(buildCtx(parsedData)))
    expect(text).toMatch(/平行|parallel/)
  })

  it('ProofStep 包含 ratio 推导步骤', () => {
    const steps = generateProof(buildCtx(parsedData))
    const ratioSteps = steps.filter((s) =>
      /比例|ratio|相似|分线段|成比例|AP.{0,4}AF/.test(allText([s]))
    )
    expect(ratioSteps.length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────
// C. 最终结果 —— 必须 AP/AF = 3，禁止 AP/AF = 2
// ────────────────────────────────────────────────────────────
describe('C. 最终结果 — AP/AF 比值（必须来自 V2 规则链）', () => {
  it('必须包含 AP/AF = 3', () => {
    const text = allText(reason(buildCtx(parsedData)))
    expect(text).toMatch(/AP\s*\/\s*AF\s*=\s*3(?!\d)/)
  })

  it('禁止出现 AP/AF = 2', () => {
    const text = allText(reason(buildCtx(parsedData)))
    expect(text).not.toMatch(/AP\s*\/\s*AF\s*=\s*2(?!\d)/)
  })

  it('AP/AF = 3 由 V2 规则链推出（非硬编码路径）', () => {
    const steps = reason(buildCtx(parsedData))
    const ruleIds = steps.map((s) => s.rule).filter(Boolean)
    expect(ruleIds).toContain('proportional_segments')
    expect(ruleIds).toContain('line_parallel_plane_property')
    expect(ruleIds).not.toContain('parallel_line_proportional')
  })
})
