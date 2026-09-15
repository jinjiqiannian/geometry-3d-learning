import { describe, it, expect } from 'vitest'
import { validateSceneIR } from '../sceneIRValidator'
import { computeParallelepipedVertices } from '../parallelepipedSolver'

/**
 * 校验器是 AI 坐标流向渲染层之前的唯一闸门（见 .claude/skills/scene-ir-core/SKILL.md）。
 * 闸门漏一次，学生看到的是一张错的图 —— 而错图比没有图更糟。
 *
 * 所以这里的负例和正例同等重要：每一个校验点都至少有一条"故意做坏"的用例，
 * 并且**先确认它在没有该条校验时会通过**，否则测的只是别处在拦。
 *
 * 另：负例是照着真实故障写的，不是凭空构造。零长度棱那条就是
 * parallelepipedSolver 顶点 C 写错（B 与 C 重合）时的实际形态。
 */

// ── 夹具 ──

const P = (id, position) => ({ id, position })

/** 单位正方体，棱长 1 */
const CUBE = {
  points: [
    P('A', [0, 0, 0]), P('B', [1, 0, 0]), P('C', [1, 0, 1]), P('D', [0, 0, 1]),
    P("A'", [0, 1, 0]), P("B'", [1, 1, 0]), P("C'", [1, 1, 1]), P("D'", [0, 1, 1]),
  ],
  edges: [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
    ["A'", "B'"], ["B'", "C'"], ["C'", "D'"], ["D'", "A'"],
    ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"],
  ],
  faces: [
    [0, 1, 2, 3], [4, 5, 6, 7],
    [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
  ],
}

/** 长方体，三边之比 1 : 0.75 : 0.5 = 4 : 3 : 2（长沿 x、宽沿 z、高沿 y） */
const CUBOID = {
  points: [
    P('A', [0, 0, 0]), P('B', [1, 0, 0]), P('C', [1, 0, 0.75]), P('D', [0, 0, 0.75]),
    P("A'", [0, 0.5, 0]), P("B'", [1, 0.5, 0]), P("C'", [1, 0.5, 0.75]), P("D'", [0, 0.5, 0.75]),
  ],
  edges: [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
    ["A'", "B'"], ["B'", "C'"], ["C'", "D'"], ["D'", "A'"],
    ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"],
  ],
  faces: [
    [0, 1, 2, 3], [4, 5, 6, 7],
    [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
  ],
}

/**
 * 正四棱锥：底面边长 4、侧棱长 2√3。
 * 底面 A(0,0,0) B(4,0,0) C(4,0,4) D(0,0,4)，顶点 S(2,2,2) ——
 * |SA| = √(4+4+4) = √12 = 2√3，底面半对角线 2√2，锥高 √(12−8) = 2。
 */
const PYRAMID = {
  points: [
    P('A', [0, 0, 0]), P('B', [4, 0, 0]), P('C', [4, 0, 4]), P('D', [0, 0, 4]),
    P('S', [2, 2, 2]),
  ],
  edges: [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
    ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D'],
  ],
  faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
}

const PYRAMID_TEXT =
  '已知正四棱锥 S-ABCD 的底面边长为 4，侧棱长为 2√3，求该棱锥的体积与侧面积。'

/** 就地改一份夹具，避免用例之间互相污染 */
const tweak = (base, fn) => {
  const c = JSON.parse(JSON.stringify(base))
  fn(c)
  return c
}

const CUBE_TEXT = "正方体 ABCD-A'B'C'D' 的棱长为 2，求体对角线 AC' 的长度。"
const CUBOID_TEXT = "已知长方体 ABCD-A'B'C'D' 的长为 4，宽为 3，高为 2，求体对角线长度。"
const PARA_TEXT = `如图，在平行六面体 ABCD - A'B'C'D' 中，AB = 4，AD = 3，AA' = 5，
∠BAD = 90°，∠BAA' = ∠DAA' = 60°，求：
(1) AA' · AB; (2) AB' 的长; (3) AC' 的长。`

const PARA_IDS = ['A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"]
const PARA_EDGES = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
  ["A'", "B'"], ["B'", "C'"], ["C'", "D'"], ["D'", "A'"],
  ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"],
]

/** 平行六面体候选：顶点直接取真实求解器的输出 */
function paraScene(text = PARA_TEXT) {
  const v = computeParallelepipedVertices(text)
  if (!v) throw new Error('求解器没解出顶点，夹具失效')
  const idx = Object.fromEntries(PARA_IDS.map((id, i) => [id, i]))
  return {
    points: PARA_IDS.map((id, i) => P(id, v[i])),
    edges: PARA_EDGES.map(([a, b]) => [a, b]),
    faces: [
      PARA_IDS.slice(0, 4).map((id) => idx[id]),
      PARA_IDS.slice(4).map((id) => idx[id]),
      ['A', 'B', "B'", "A'"].map((id) => idx[id]),
      ['B', 'C', "C'", "B'"].map((id) => idx[id]),
      ['C', 'D', "D'", "C'"].map((id) => idx[id]),
      ['D', 'A', "A'", "D'"].map((id) => idx[id]),
    ],
  }
}

// ── 正例 ──

describe('正例：必须放行', () => {
  it('正方体「棱长为 2」—— 聚合写法，所有棱等长', () => {
    const r = validateSceneIR(CUBE, CUBE_TEXT)
    expect(r.reason).toBeNull()
    expect(r.verdict).toBe('pass')
  })

  it('长方体的长宽高 —— 三组平行棱之比须为 4:3:2', () => {
    const r = validateSceneIR(CUBOID, CUBOID_TEXT)
    expect(r.reason).toBeNull()
    expect(r.verdict).toBe('pass')
  })

  // 这条是尺度无关的回归网。求解器会把顶点整体缩放 k 收进相机视野，
  // 所以图里 |AB| 不是 4。若数值校验按字面比绝对值，这条会失败 ——
  // 而那意味着线上所有正确场景都会被拒。
  it('平行六面体（真实求解器输出，已整体缩放）—— 尺度无关，不能误杀', () => {
    const r = validateSceneIR(paraScene(), PARA_TEXT)
    expect(r.reason).toBeNull()
    expect(r.verdict).toBe('pass')

    // 顺带钉住前提：图里 |AB| 确实不等于题面的 4，否则这条测试是空的
    const v = computeParallelepipedVertices(PARA_TEXT)
    const ab = Math.hypot(...v[1].map((x, i) => x - v[0][i]))
    expect(ab).not.toBeCloseTo(4, 1)
  })

  // 这条同时是根号解析的回归网：若「2√3」还被截成 2，比值会变成 4:2 = 2，
  // 与图上的 √12/4 ≈ 1.732 对不上，当场失败。
  it('正四棱锥「底面边长为 4，侧棱长为 2√3」—— 底面棱/侧棱按面分得开', () => {
    const r = validateSceneIR(PYRAMID, PYRAMID_TEXT)
    expect(r.reason).toBeNull()
    expect(r.verdict).toBe('pass')

    // 钉住前提：题面给的是 2√3，不是 2
    const at = Object.fromEntries(PYRAMID.points.map((p) => [p.id, p.position]))
    const sa = Math.hypot(...at.S.map((x, i) => x - at.A[i]))
    expect(sa).toBeCloseTo(2 * Math.sqrt(3), 9)
  })

  it('棱的书写方向与题面相反也算数（题面写 AD，候选里是 DA）', () => {
    // 只用 AD 一条约束，且候选里那条棱是 ['D','A']
    const only = tweak(CUBE, (c) => {
      c.edges = [['D', 'A']]
    })
    const r = validateSceneIR(only, "AD = 2")
    expect(r.reason).toBeNull()
    expect(r.verdict).toBe('pass')
  })

  it('成立的声明（AA\' ⊥ 底面 ABCD）放行', () => {
    const withClaim = tweak(CUBE, (c) => {
      c.claims = [{ kind: 'perpendicular', a: ['A', "A'"], b: ['A', 'B', 'C', 'D'] }]
    })
    const r = validateSceneIR(withClaim, CUBE_TEXT)
    expect(r.reason).toBeNull()
    expect(r.verdict).toBe('pass')
  })

  it('验不了的声明降级放行，而不是整张图毙掉', () => {
    const withClaim = tweak(CUBE, (c) => {
      c.claims = [{ kind: 'coplanar', a: ['A', 'B'], b: ['C', 'D'] }]
    })
    const r = validateSceneIR(withClaim, CUBE_TEXT)
    expect(r.ok).toBe(true)
    expect(r.verdict).toBe('degrade')
    expect(r.degraded).toHaveLength(1)
  })
})

// ── 负例 ──

describe('负例 · 结构：不自洽的坐标与拓扑一律不画', () => {
  it('面索引越界', () => {
    const r = validateSceneIR(tweak(CUBE, (c) => void (c.faces[0] = [0, 1, 99])), CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'BAD_STRUCTURE' })
  })

  it('坐标含 NaN', () => {
    const r = validateSceneIR(tweak(CUBE, (c) => void (c.points[3].position = [0, NaN, 1])), CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'BAD_STRUCTURE' })
  })

  it('棱的端点不存在', () => {
    const r = validateSceneIR(tweak(CUBE, (c) => void c.edges.push(['A', 'Z'])), CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'BAD_STRUCTURE' })
  })

  it('顶点 id 重复', () => {
    const r = validateSceneIR(tweak(CUBE, (c) => void (c.points[5].id = 'A')), CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'BAD_STRUCTURE' })
  })

  it('一条棱都没给（否则数值校验会无据可查地空过）', () => {
    const r = validateSceneIR(tweak(CUBE, (c) => void (c.edges = [])), CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'BAD_STRUCTURE' })
  })
})

describe('负例 · 退化：数值全合法但形状是塌的', () => {
  // 这条就是 parallelepipedSolver 顶点 C 写错时的真实形态：
  // C 落回与 B 逐位相同，BC 长度为 0。当时 15 条测试全过。
  it('零长度棱（平行六面体 C 与 B 重合那次的形态）', () => {
    const broken = paraScene()
    const v = computeParallelepipedVertices(PARA_TEXT)
    broken.points = PARA_IDS.map((id, i) =>
      P(id, i === 2 ? [...v[1]] : v[i]), // C ← B
    )
    const r = validateSceneIR(broken, PARA_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'ZERO_LENGTH_EDGE' })
  })

  it('所有顶点共面（一张平面图，不是立体）', () => {
    const flat = {
      points: [P('A', [0, 0, 0]), P('B', [1, 0, 0]), P('C', [1, 0, 1]), P('D', [0, 0, 1])],
      edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
    }
    const r = validateSceneIR(flat, CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'DEGENERATE' })
  })

  it('面的顶点共线（零面积面）', () => {
    const bad = {
      points: [P('A', [0, 0, 0]), P('B', [1, 0, 0]), P('C', [2, 0, 0]), P('D', [0, 1, 0])],
      edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
      faces: [[0, 1, 2]],
    }
    const r = validateSceneIR(bad, CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'DEGENERATE' })
  })
})

describe('负例 · 数值：把图和题面绑死', () => {
  it('逐棱值对不上：题面 AB=4、AD=3，图上却画成等边', () => {
    const r = validateSceneIR(CUBE, "ABCD-A'B'C'D' 中 AB = 4，AD = 3")
    expect(r).toMatchObject({ ok: false, code: 'NUMBER_MISMATCH' })
  })

  it('题面说棱长为 2（正方体），图却画成长方体', () => {
    const r = validateSceneIR(CUBOID, CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'NUMBER_MISMATCH' })
  })

  it('长宽高之比对不上', () => {
    // 题面 4:3:2，夹具是 1:0.75:0.5（= 4:3:2），改成 4:3:4 就该拒
    const r = validateSceneIR(CUBOID, "长方体 ABCD-A'B'C'D' 的长为 4，宽为 3，高为 4")
    expect(r).toMatchObject({ ok: false, code: 'NUMBER_MISMATCH' })
  })

  it('棱锥的侧棱长对不上：题面 2√3，图上画成了 5', () => {
    // 把 S 抬高，侧棱变长 → 底面棱:侧棱 之比不再是 4:2√3
    const wrong = tweak(PYRAMID, (c) => void (c.points[4].position = [2, 5.2, 2]))
    const r = validateSceneIR(wrong, PYRAMID_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'NUMBER_MISMATCH' })
  })

  it('棱锥的底面棱长短不一', () => {
    const wrong = tweak(PYRAMID, (c) => void (c.points[2].position = [4, 0, 5]))
    const r = validateSceneIR(wrong, PYRAMID_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'NUMBER_MISMATCH' })
  })

  it('题面一条数值都没有 —— 缺证据即拒，不放行', () => {
    const r = validateSceneIR(CUBE, '证明：AB ∥ CD')
    expect(r).toMatchObject({ ok: false, code: 'NO_NUMERIC_EVIDENCE' })
  })
})

describe('负例 · 声明：模型说得出，就用点积验一遍', () => {
  it('声称 AB ⊥ 底面，实际 AB 就在底面里', () => {
    const withClaim = tweak(CUBE, (c) => {
      c.claims = [{ kind: 'perpendicular', a: ['A', 'B'], b: ['A', 'B', 'C', 'D'] }]
    })
    const r = validateSceneIR(withClaim, CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'CLAIM_FALSE' })
  })

  it('声称 AA\' ∥ 底面，实际垂直于底面', () => {
    const withClaim = tweak(CUBE, (c) => {
      c.claims = [{ kind: 'parallel', a: ['A', "A'"], b: ['A', 'B', 'C', 'D'] }]
    })
    const r = validateSceneIR(withClaim, CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'CLAIM_FALSE' })
  })

  it('声明引用了不存在的顶点', () => {
    const withClaim = tweak(CUBE, (c) => {
      c.claims = [{ kind: 'perpendicular', a: ['A', 'Z'], b: ['A', 'B', 'C', 'D'] }]
    })
    const r = validateSceneIR(withClaim, CUBE_TEXT)
    expect(r).toMatchObject({ ok: false, code: 'CLAIM_FALSE' })
  })
})

describe('入口防守：奇怪的输入不能把校验器本身弄崩', () => {
  for (const bad of [null, undefined, 42, 'scene', {}]) {
    it(`传 ${JSON.stringify(bad)} 返回 reject 而不是抛错`, () => {
      const r = validateSceneIR(bad, CUBE_TEXT)
      expect(r.ok).toBe(false)
      expect(r.verdict).toBe('reject')
    })
  }
})
