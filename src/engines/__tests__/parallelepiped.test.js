import { describe, it, expect } from 'vitest'
import {
  parseParallelepipedGivens,
  computeParallelepipedVertices,
} from '../parallelepipedSolver'

const PROBLEM = `如图，在平行六面体 ABCD - A'B'C'D' 中，AB = 4，AD = 3，AA' = 5，
∠BAD = 90°，∠BAA' = ∠DAA' = 60°，求：
(1) AA' · AB; (2) AB' 的长; (3) AC' 的长。`

const sub = (a, b) => a.map((v, i) => v - b[i])
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const len = (a) => Math.hypot(...a)

describe('parseParallelepipedGivens', () => {
  it('取出五个量（含 ∠BAA\'=∠DAA\'=60° 这种连写）', () => {
    expect(parseParallelepipedGivens(PROBLEM)).toEqual({
      ab: 4,
      ad: 3,
      aa: 5,
      baseAngle: 90,
      angleB: 60,
      angleD: 60,
    })
  })

  it('认 |AB| 与全角撇号写法', () => {
    const alt = "平行六面体中 |AB|=2，AD=3，AA’=4，∠BAD=90°，∠BAA’=∠DAA’=45°"
    const g = parseParallelepipedGivens(alt)
    expect(g).not.toBeNull()
    expect(g.ab).toBe(2)
    expect(g.aa).toBe(4)
    expect(g.angleB).toBe(45)
  })

  it('缺一个量就返回 null —— 宁可退回示意形状，也不猜', () => {
    expect(parseParallelepipedGivens("平行六面体中 AB = 4，AD = 3")).toBeNull()
    expect(
      parseParallelepipedGivens("平行六面体中 AB=4，AD=3，AA'=5，∠BAD=90°"),
    ).toBeNull()
  })

  it('夹角不是 90° 的底面也算得出来', () => {
    const g = parseParallelepipedGivens(
      "平行六面体中 AB=2，AD=2，AA'=2，∠BAD=60°，∠BAA'=60°，∠DAA'=60°",
    )
    expect(g.baseAngle).toBe(60)
  })
})

describe('computeParallelepipedVertices', () => {
  const V = computeParallelepipedVertices(PROBLEM)

  it('八个顶点都有坐标且都是有限值', () => {
    expect(V).toHaveLength(8)
    for (const p of V) {
      expect(p).toHaveLength(3)
      expect(p.every(Number.isFinite)).toBe(true)
    }
  })

  it('顶面必须是底面平移同一个向量（平行六面体的定义）', () => {
    const shift = sub(V[4], V[0]) // A' - A
    for (const i of [1, 2, 3]) {
      const d = sub(V[i + 4], V[i])
      d.forEach((v, k) => expect(v).toBeCloseTo(shift[k], 9))
    }
  })

  // 这一组盯的是顶点 C。上面每条断言都只用 A、B、D 与"平移量"，
  // 而整体平移一致使得 C 错位也照样成立 —— 曾经 C 的第三分量被误写成
  // B[1] + D[1]（恒为 0），∠BAD = 90° 时 C 与 B 逐位相同、底面塌成一条线，
  // 15 条测试没有一个报错。所以这里必须直接断言 C 本身。
  it('底面 ABCD 是平行四边形：C − B = D − A', () => {
    const cb = sub(V[2], V[1])
    const da = sub(V[3], V[0])
    cb.forEach((v, i) => expect(v).toBeCloseTo(da[i], 9))
  })

  it('底面四个顶点两两不重合（C 曾与 B 完全重合）', () => {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        expect(
          len(sub(V[i], V[j])),
          `底面顶点 ${i} 与 ${j} 重合`,
        ).toBeGreaterThan(1e-9)
      }
    }
  })

  it('底面有面积（A、B、D 共线的话底面退化）', () => {
    const ab = sub(V[1], V[0])
    const ad = sub(V[3], V[0])
    const n = [
      ab[1] * ad[2] - ab[2] * ad[1],
      ab[2] * ad[0] - ab[0] * ad[2],
      ab[0] * ad[1] - ab[1] * ad[0],
    ]
    expect(len(n), '底面面积为 0').toBeGreaterThan(1e-9)
  })

  // 图形整体缩放到画布视野内（保持相似），所以验的是比例与夹角，不是绝对值
  const AB = len(sub(V[1], V[0]))
  const AD = len(sub(V[3], V[0]))
  const AA = len(sub(V[4], V[0]))
  const shift = sub(V[4], V[0])

  it('棱长之比与题目一致：AB:AD:AA\' = 4:3:5', () => {
    expect(AB / AD).toBeCloseTo(4 / 3, 9)
    expect(AA / AB).toBeCloseTo(5 / 4, 9)
  })

  it('夹角用余弦验（避开 arccos 的精度问题）：∠BAA\'=∠DAA\'=60°', () => {
    const cosB = dot(shift, sub(V[1], V[0])) / (AA * AB)
    const cosD = dot(shift, sub(V[3], V[0])) / (AA * AD)
    expect(cosB).toBeCloseTo(Math.cos(Math.PI / 3), 9)
    expect(cosD).toBeCloseTo(Math.cos(Math.PI / 3), 9)
  })

  it('底面 ∠BAD 确实是 90°', () => {
    expect(dot(sub(V[1], V[0]), sub(V[3], V[0]))).toBeCloseTo(0, 9)
  })

  it('AA\' 的方向与手算的 (2.5, √12.5, 2.5) 一致', () => {
    const norm = (v) => v.map((x) => x / len(v))
    const got = norm(shift)
    const want = norm([2.5, Math.sqrt(12.5), 2.5]) // y 是竖直方向
    got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 9))
  })

  it('图形被缩放到相机视野内（真实尺寸会溢出画面）', () => {
    const radius = Math.max(...V.map((p) => Math.hypot(...p)))
    expect(radius).toBeGreaterThan(1)
    expect(radius).toBeLessThan(3)
  })

  it('已平移到形心为原点（相机看向原点，不居中的话图形会偏出画面）', () => {
    const n = V.length
    const c = V.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
    c.forEach((v) => expect(v / n).toBeCloseTo(0, 9))
  })

  it('题目数据不成立时返回 null，不画错图', () => {
    // AB ⟂ AD 时，AA' 与两条棱的夹角余弦平方和不能超过 1（方向余弦）。
    // 60° 与 10°：cos²60°+cos²10° ≈ 1.22 > 1，这样的 AA' 根本不存在。
    const bad = "平行六面体中 AB=10，AD=10，AA'=1，∠BAD=90°，∠BAA'=60°，∠DAA'=10°"
    expect(computeParallelepipedVertices(bad)).toBeNull()
  })

  it('夹角很小但成立时照常算（不误杀）', () => {
    const slim = "平行六面体中 AB=2，AD=2，AA'=2，∠BAD=90°，∠BAA'=60°，∠DAA'=60°"
    expect(computeParallelepipedVertices(slim)).toHaveLength(8)
  })

  it('取不到参数时返回 null（调用方退回模板形状）', () => {
    expect(computeParallelepipedVertices('随便一道题')).toBeNull()
    expect(computeParallelepipedVertices('')).toBeNull()
  })
})
