import { describe, it, expect } from 'vitest'
import { parseProblemToSemantic } from '../geometryValidator'
import { buildSceneIRSequenceFromSemantic } from '../sceneIRBuilder'
import { createGeometryFromSceneIR } from '../geometryEngine'

/**
 * 线上曾经出现：
 *   THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN.
 *   The "position" attribute is likely to have NaN values.
 *
 * 成因只可能是 createGeometryFromSceneIR 里两条路之一：
 *   1. sceneIR.points.map(p => p.position) —— 某点缺 position / 值非有限
 *   2. sceneIR.faces.flat() 作为索引 —— 索引越界会读到 undefined
 * 两者进入 Float32BufferAttribute 都是 NaN，且不会抛错，只在 Three.js
 * 内部报一条 warning。所以必须用测试把这条不变量钉住。
 */

const CASES = [
  ['正方体', '如图，正方体 ABCD-A₁B₁C₁D₁ 的棱长为 2，求体对角线 AC₁ 的长度。'],
  ['长方体', '已知长方体 ABCD-A₁B₁C₁D₁ 的长为 4，宽为 3，高为 2，求体对角线长度。'],
  ['正四棱锥', '已知正四棱锥 S-ABCD 的底面边长为 4，侧棱长为 2√3，求该棱锥的体积与侧面积。'],
  ['三棱柱', '已知三棱柱 ABC-A₁B₁C₁ 的底面为正三角形，边长为 2，侧棱长为 3，求其体积。'],
  ['圆柱', '已知圆柱的底面半径为 2，高为 5，求圆柱的体积与侧面积。'],
  ['圆锥', '已知圆锥的底面半径为 3，高为 4，求圆锥的体积与侧面积。'],
  ['球', '已知球的半径为 3，求球的体积与表面积。'],
  ['正四棱台', '已知正四棱台的上底面边长为 2，下底面边长为 4，高为 3，求其体积。'],
  ['正四面体', '已知正四面体的棱长为 2，求其体积与表面积。'],
]

/** 体检一份 SceneIR：返回所有异常描述，空数组代表健康 */
function auditSceneIR(ir) {
  const bad = []
  const pts = ir?.points || []

  pts.forEach((p, i) => {
    if (!p) return bad.push(`points[${i}] 是空值`)
    if (!Array.isArray(p.position))
      return bad.push(
        `points[${i}] (id=${p.id}) 的 position 不是数组：${JSON.stringify(p.position)}`,
      )
    if (p.position.length !== 3)
      return bad.push(`points[${i}] position 长度为 ${p.position.length}，应为 3`)
    if (!p.position.every(Number.isFinite))
      return bad.push(
        `points[${i}] (id=${p.id}) position 含非有限值：${JSON.stringify(p.position)}`,
      )
  })

  ;(ir?.faces || []).forEach((f, i) => {
    const out = (f || []).filter(
      (x) => !Number.isInteger(x) || x < 0 || x >= pts.length,
    )
    if (out.length)
      bad.push(
        `faces[${i}] 索引越界 ${JSON.stringify(out)}（points 只有 ${pts.length} 个）`,
      )
  })

  return bad
}

/** 体检造出来的几何体 */
function auditGeometry(ir) {
  const bad = []
  let geo
  try {
    geo = createGeometryFromSceneIR(ir)
  } catch (e) {
    return [`createGeometryFromSceneIR 抛错：${e.message}`]
  }

  const pos = geo.getAttribute?.('position')
  if (pos) {
    let nan = 0
    for (let i = 0; i < pos.array.length; i++)
      if (!Number.isFinite(pos.array[i])) nan++
    if (nan) bad.push(`几何体 position 有 ${nan} 个 NaN（共 ${pos.array.length} 个分量）`)
  }

  const idx = geo.getIndex?.()
  if (idx && pos) {
    let oob = 0
    for (let i = 0; i < idx.count; i++) if (idx.getX(i) >= pos.count) oob++
    if (oob) bad.push(`几何体索引有 ${oob} 个越界（position.count=${pos.count}）`)
  }
  return bad
}

describe('SceneIR 的几何性质（不只是「没有 NaN」）', () => {
  // 曾经的 bug：锥顶判定用 degree > maxDegree 严格比较，侧棱没被抽取时
  // 底面四点度数相同 → 第一个点 A 被当成锥顶 → A 抢走顶点坐标、真正的锥顶 S
  // 落到 [0,0,0]、底面只剩 3 个点。整份几何体「数值全部合法」，只查 NaN
  // 和索引越界是抓不住的，必须断言形状本身。
  it('正四棱锥：底面须为正方形，锥顶须到底面四顶点等距', () => {
    const sem = parseProblemToSemantic(
      '正四棱锥 S-ABCD 的底面边长为 4，侧棱长为 2√3，求体积与侧面积。',
    )
    const ir = buildSceneIRSequenceFromSemantic(sem, [])[0]
    const pos = Object.fromEntries(ir.points.map((p) => [p.id, p.position]))

    for (const k of ['A', 'B', 'C', 'D', 'S']) {
      expect(pos[k], `点 ${k} 没有坐标`).toBeTruthy()
      expect(
        pos[k].every(Number.isFinite),
        `点 ${k} 坐标非有限：${JSON.stringify(pos[k])}`,
      ).toBe(true)
    }

    const d = (a, b) =>
      Math.hypot(...pos[a].map((v, i) => v - pos[b][i]))

    const sides = [d('A', 'B'), d('B', 'C'), d('C', 'D'), d('D', 'A')]
    const diags = [d('A', 'C'), d('B', 'D')]

    sides.forEach((s, i) =>
      expect(s, `底边 ${i} 长 ${s}，与其余底边不等`).toBeCloseTo(sides[0], 6),
    )
    diags.forEach((g, i) =>
      expect(g, `对角线 ${i} 长 ${g}，不等于边长×√2`).toBeCloseTo(
        sides[0] * Math.SQRT2,
        6,
      ),
    )

    const laterals = ['A', 'B', 'C', 'D'].map((b) => d('S', b))
    laterals.forEach((l, i) =>
      expect(l, `锥顶到 ${'ABCD'[i]} 的距离 ${l}，与其余侧棱不等`).toBeCloseTo(
        laterals[0],
        6,
      ),
    )
  })
})

describe('SceneIR → 几何体：不得产生 NaN', () => {
  // 真实运行时走的是带 steps 的路径：buildSceneIRSequenceFromSemantic(semantic, steps)
  // 会调 applySceneStateToIR 逐步改写 IR。线上 AI 返回的 steps 形状如下 ——
  // 注意没有 sceneState 字段，所以这条路径必须单独覆盖。
  const AI_STEPS = [
    { step: 1, title: '识别几何体', content: '…', type: 'observation', part: 0 },
    { step: 2, title: '求对角线', content: '…', type: 'calculation', part: 0 },
    { step: 3, title: '得出结论', content: '…', type: 'conclusion', part: 0 },
  ]

  for (const [name, text] of CASES) {
    it(`${name}：带 steps（无 sceneState，同线上 AI 输出）也不产生 NaN`, () => {
      const semantic = parseProblemToSemantic(text)
      const seq = buildSceneIRSequenceFromSemantic(semantic, AI_STEPS)

      const problems = []
      seq.forEach((ir, i) => {
        for (const b of auditSceneIR(ir)) problems.push(`IR[${i}] ${b}`)
        for (const b of auditGeometry(ir)) problems.push(`IR[${i}] ${b}`)
      })

      expect(problems, `\n  ${problems.join('\n  ')}\n`).toEqual([])
    })
  }

  for (const [name, text] of CASES) {
    it(`${name} 全程无 NaN、无越界`, () => {
      const semantic = parseProblemToSemantic(text)
      const seq = buildSceneIRSequenceFromSemantic(semantic, [])

      const problems = []
      seq.forEach((ir, i) => {
        for (const b of auditSceneIR(ir)) problems.push(`IR[${i}] ${b}`)
        for (const b of auditGeometry(ir)) problems.push(`IR[${i}] ${b}`)
      })

      expect(problems, `\n  ${problems.join('\n  ')}\n`).toEqual([])
    })
  }
})
