/**
 * SceneIR 校验闸门 —— AI 候选场景进入渲染层之前的唯一关卡。
 *
 * 为什么需要它：见 .claude/skills/scene-ir-core/SKILL.md 的 validation gate 一节。
 * 模板表决定了"只有认得的形状才有图"，要覆盖剩下的题就得让 AI 提候选场景。
 * 但 AI 是概率引擎，坐标可能算错、标签可能对不上、可能声称一个它自己都画不
 * 出来的性质。闸门在，确定性就在；闸门漏一次，学生就会看到一张错的图 ——
 * 而错图比没有图更糟，因为他不知道自己在看一张错图。
 *
 * 本文件只做判定，不做渲染、不做修正、不做兜底。判不过就交给调用方不画。
 *
 * ── 关于"数值"校验：必须尺度无关 ──────────────────────────
 * 这是最容易写错的一条。parallelepipedSolver 反解出顶点后会乘一个全局缩放
 * k 把图形收进相机视野（页面上没有自动对焦），所以**一条正确的 SceneIR 里
 * |AB| 并不等于题目给的 4**。若按字面"题目说 AB=4 就算出 |AB| 比一比"，
 * 正确场景会被全部拒掉。
 *
 * 正确形式：从第一条长度约束解出全局缩放 k，再用同一个 k 验其余所有约束。
 * 这比逐条独立比对更严 —— 模型若把 AB 与 AD 的相对比例搞错，就不存在任何
 * 一个 k 能同时满足两条，于是被拒；而逐条比对只要场景被缩放过就失效。
 */

import { lengthOf, NUM_PAT, parseNum } from './parallelepipedSolver'
import { normalizeLatexForDisplay } from './problemParser'

/** 相对容差。浮点误差会被缩放放大，所以一律用相对量，不拍绝对阈值。 */
const TOL = 1e-6

/** 判定档位：pass 直接用；degrade 画但丢掉存疑部分；reject 不画 */
export const VERDICT = Object.freeze({
  PASS: 'pass',
  DEGRADE: 'degrade',
  REJECT: 'reject',
})

// ── 向量工具（本文件私有，不导出，避免与渲染层重复实现领域计算）──

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (v) => Math.hypot(v[0], v[1], v[2])
const dist = (a, b) => norm(sub(a, b))

/** 三点定平面法向量；三点共线时返回 null（不是零向量，避免下游除以 0） */
function planeNormal(pts) {
  const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]))
  return norm(n) < TOL ? null : n
}

/** 棱的规范名：与题面一致，如 A + B → "AB"，A + B' → "A'B'" */
const edgeLabel = (u, v) => `${u}${v}`

// ── 结构：坐标与拓扑必须先自洽，否则后面几条都无从谈起 ──

function checkStructure(scene, reject) {
  const pts = scene.points

  if (!Array.isArray(pts) || pts.length < 4) {
    // 立体几何至少 4 个顶点（四面体）。少了必然是模型没输出完。
    reject('BAD_STRUCTURE', `顶点数 ${pts?.length ?? 0} 少于 4，不构成几何体`)
    return false
  }

  const ids = new Set()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    if (!p || typeof p.id !== 'string' || !p.id) {
      reject('BAD_STRUCTURE', `points[${i}] 缺少 id`)
      return false
    }
    if (ids.has(p.id)) {
      reject('BAD_STRUCTURE', `顶点 id 重复：${p.id}`)
      return false
    }
    ids.add(p.id)
    if (!Array.isArray(p.position) || p.position.length !== 3) {
      reject('BAD_STRUCTURE', `顶点 ${p.id} 的 position 不是长度 3 的数组`)
      return false
    }
    if (!p.position.every(Number.isFinite)) {
      // 非有限值进 Float32BufferAttribute 不会抛错，只在 Three.js 内部报
      // 一条 warning（见 sceneIR-geometry.test.js 记的那次线上事故）。
      reject('BAD_STRUCTURE', `顶点 ${p.id} 的坐标含非有限值`)
      return false
    }
  }

  const n = pts.length
  const edges = scene.edges || []
  // 棱是候选契约的一部分（SKILL.md：顶点坐标 + 棱 + 面索引）。没有棱的
  // 多面体场景是残缺的，而且会让数值校验无据可查后"空过"—— 那是一道漏洞。
  if (edges.length === 0) {
    reject('BAD_STRUCTURE', '候选场景没有给出任何棱')
    return false
  }
  for (const e of edges) {
    if (!Array.isArray(e) || e.length !== 2) {
      reject('BAD_STRUCTURE', `棱 ${JSON.stringify(e)} 不是两点对`)
      return false
    }
    if (!ids.has(e[0]) || !ids.has(e[1])) {
      reject('BAD_STRUCTURE', `棱 ${edgeLabel(e[0], e[1])} 的端点不存在`)
      return false
    }
    if (e[0] === e[1]) {
      reject('BAD_STRUCTURE', `棱 ${edgeLabel(e[0], e[1])} 两端是同一点`)
      return false
    }
  }

  const faces = scene.faces || []
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i]
    if (!Array.isArray(f) || f.length < 3) {
      reject('BAD_STRUCTURE', `faces[${i}] 少于 3 个顶点`)
      return false
    }
    if (!f.every((x) => Number.isInteger(x) && x >= 0 && x < n)) {
      // 越界索引会被 .flat() 读成 undefined，进 BufferAttribute 就是 NaN
      reject('BAD_STRUCTURE', `faces[${i}] 索引越界（顶点只有 ${n} 个）`)
      return false
    }
    if (new Set(f).size !== f.length) {
      reject('BAD_STRUCTURE', `faces[${i}] 有重复顶点`)
      return false
    }
  }

  return true
}

/** 零长度棱单查一遍：结构过了不代表边长非零，退化判定要在长度上做 */
function checkNoZeroLengthEdge(scene, reject) {
  const at = Object.fromEntries(scene.points.map((p) => [p.id, p.position]))
  for (const [u, v] of scene.edges || []) {
    const d = dist(at[u], at[v])
    // 阈值取相对量：与场景自身尺度比，避免大场景放过、小场景误杀
    if (d < TOL) {
      reject('ZERO_LENGTH_EDGE', `棱 ${edgeLabel(u, v)} 长度为 0`)
      return false
    }
  }
  return true
}

// ── 数值：把图和题面绑死。这是四条校验里最有力的一条 ──

/**
 * 收集题面给了值的棱。题面没提到、或提到了但没给数的棱一律不进约束 ——
 * 校验器只对"有证据"的部分负责。
 */
function collectLengthConstraints(scene, problemText) {
  const at = Object.fromEntries(scene.points.map((p) => [p.id, p.position]))
  const out = []
  for (const [u, v] of scene.edges || []) {
    // 两个方向都要试：题面写「AD = 3」，而候选里的棱可能是 ['D','A']。
    // 只查一个方向会漏掉一半约束 —— 漏掉的约束不会报错，只是不再被校验，
    // 也就是闸门悄悄变松。
    const expected =
      lengthOf(problemText, edgeLabel(u, v)) ??
      lengthOf(problemText, edgeLabel(v, u))
    if (expected == null || expected <= 0) continue
    out.push({ edge: [u, v], expected, actual: dist(at[u], at[v]) })
  }
  return out
}

/**
 * 取聚合写法给的尺寸。
 *
 * 题面常见「棱长为 2」「长为 4，宽为 3，高为 2」，并没有逐棱的 "AB = 4"。
 * 只认逐棱的话 lengthOf 一条证据都取不到，多数正例会被 NO_NUMERIC_EVIDENCE
 * 挡在门外 —— 而这不是边缘情况，是多数题的写法。
 *
 * 聚合值仍是可证伪的硬约束。注意全局缩放 k 会把这些值一并缩放，所以
 * 「棱长为 2」实际约束的是**所有棱等长**（2 被 k 吸收了）；如果图里画的是
 * 长方体，这条立刻不成立 —— 恰好挡住"长方体被画成正方体"这一类。
 */
function aggregateLengths(problemText) {
  const t = normalizeLatexForDisplay(problemText || '')
  // 数值一律走 NUM_PAT / parseNum，认 2、2.5、2√3、√3
  const pick = (s, body) => {
    const m = s.match(new RegExp(body + NUM_PAT))
    return m ? parseNum(m[1]) : null
  }

  const BASE = String.raw`底面?边长[为是]?\s*`
  const LATERAL = String.raw`侧棱长[为是]?\s*`

  // 先摘掉带定语的「侧棱长」「底面边长」，剩下的「棱长」才是整体棱长。
  // 不摘的话，「侧棱长为 2√3」会被下面那条当成「棱长为 2」。
  const base = pick(t, BASE)
  const lateral = pick(t, LATERAL)
  const rest = t
    .replace(new RegExp(BASE + NUM_PAT, 'g'), ' ')
    .replace(new RegExp(LATERAL + NUM_PAT, 'g'), ' ')

  return {
    base,
    lateral,
    edge: pick(rest, String.raw`(?:各\s*)?棱长[为是均]?\s*`),
    // 「长」要排除「棱长 / 边长 / 对角线长」。用后顾断言而非前导字符类：
    // 前者不吃字符、不影响相邻匹配，也认「的长为 4」这种最自然的写法
    // （前导 [，,、\s] 那一版正是漏了「的」，实测取不到值）。
    length: pick(rest, String.raw`(?<![棱边周对])长[为是]?\s*`),
    width: pick(rest, String.raw`宽[为是]?\s*`),
    height: pick(rest, String.raw`高[为是]?\s*`),
  }
}

/**
 * 棱的方向特征。d 与 −d 视为同一方向，并做定点舍入 ——
 * 否则浮点误差会把同向的棱分裂成两组，长方体就永远凑不齐三组。
 */
function dirKey(a, b) {
  const d = sub(b, a)
  const n = norm(d)
  if (n < TOL) return null
  const u = d.map((v) => v / n)
  const first = u.find((v) => Math.abs(v) > 1e-9)
  const flip = first != null && first < 0 ? -1 : 1
  return u.map((v) => (v * flip).toFixed(6)).join(',')
}

/** 按相对量比较两组长度序列（各自归一化到首项），与缩放无关且与顺序无关 */
function sameRatios(got, want) {
  if (got.length !== want.length) return false
  const g = [...got].sort((x, y) => y - x)
  const w = [...want].sort((x, y) => y - x)
  return g.every((v, i) => Math.abs(v / g[0] - w[i] / w[0]) <= TOL)
}

/**
 * 聚合写法的数值校验。
 *
 * 返回三态而不是布尔 —— 这里只有两种结果时必然出错：'验过且通过' 和
 * '验过且不通过' 都需要表达"拿到证据了"，而后者还必须让整条链短路。
 * 曾经用 true/false 表达，于是判失败后返回 true 被上层当成通过，
 * 而 reject 只置标志、不改返回值 —— 校验器一声不响地放行了错的图。
 *
 * @returns {'ok'|'fail'|'none'} fail 表示已调用 reject；none 表示没有聚合证据
 */
function checkAggregate(scene, problemText, reject) {
  const agg = aggregateLengths(problemText)
  const edges = scene.edges || []
  const at = Object.fromEntries(scene.points.map((p) => [p.id, p.position]))

  if (agg.edge != null) {
    // 「棱长为 X」→ 每条棱等长（X 被全局缩放吸收，见函数头注释）
    const lens = edges.map(([u, v]) => dist(at[u], at[v]))
    const first = lens[0]
    for (let i = 1; i < lens.length; i++) {
      if (Math.abs(lens[i] - first) > TOL * Math.max(lens[i], first)) {
        reject(
          'NUMBER_MISMATCH',
          `题面说各棱等长，但 ${edgeLabel(...edges[0])} 与 ${edgeLabel(...edges[i])} 长度不同`,
        )
        return 'fail'
      }
    }
    return 'ok'
  }

  const { base: B, lateral: A } = agg
  if (B != null && A != null) {
    // 「底面边长为 a，侧棱长为 b」。
    //
    // 底面 = 顶点最多的那个面：棱锥的侧面一律是三角形，底面是多边形。
    // 按**面的顶点数**定，不按标签约定也不判"锥顶"—— 这个仓库因为
    // degree > maxDegree 严格比较误判锥顶，把整套坐标错位过一格。
    // 面是候选自己给的拓扑，与命名习惯无关。
    const faces = scene.faces || []
    if (faces.length === 0) {
      reject('NUMBER_MISMATCH', '题面给的是底面/侧棱，候选却没给出面，认不出哪些棱是底面的')
      return 'fail'
    }

    let baseFace = faces[0]
    for (const f of faces) if (f.length > baseFace.length) baseFace = f

    const onBase = new Set()
    for (let i = 0; i < baseFace.length; i++) {
      const u = scene.points[baseFace[i]].id
      const v = scene.points[baseFace[(i + 1) % baseFace.length]].id
      onBase.add(`${u}|${v}`)
      onBase.add(`${v}|${u}`)
    }

    const baseLens = []
    const latLens = []
    for (const [u, v] of edges) {
      ;(onBase.has(`${u}|${v}`) ? baseLens : latLens).push(dist(at[u], at[v]))
    }
    if (baseLens.length === 0 || latLens.length === 0) {
      reject('NUMBER_MISMATCH', '候选的棱分不出底面棱与侧棱')
      return 'fail'
    }

    const spread = (a) => (Math.max(...a) - Math.min(...a)) / Math.max(...a)
    if (spread(baseLens) > TOL) {
      reject('NUMBER_MISMATCH', '底面各棱长短不一')
      return 'fail'
    }
    if (spread(latLens) > TOL) {
      reject('NUMBER_MISMATCH', '各条侧棱长短不一')
      return 'fail'
    }

    // 比值校验，与全局缩放无关
    const got = baseLens[0] / latLens[0]
    const want = B / A
    if (Math.abs(got - want) > TOL * Math.max(got, want)) {
      reject(
        'NUMBER_MISMATCH',
        `题面底面棱:侧棱 = ${B}:${A}（≈${want.toFixed(3)}），图上却是 ${got.toFixed(3)}`,
      )
      return 'fail'
    }
    return 'ok'
  }

  const { length: L, width: W, height: H } = agg
  if (L != null && W != null && H != null) {
    // 「长为 a，宽为 b，高为 c」→ 三组平行棱的长度之比须为 a:b:c。
    // 按方向分组而不是按标签约定（AB 是长、AD 是宽…）—— 这个仓库
    // 在"按标签推断角色"上栽过，方向是几何事实，标签只是叫法。
    const byDir = new Map()
    for (const [u, v] of edges) {
      const key = dirKey(at[u], at[v])
      if (key && !byDir.has(key)) byDir.set(key, dist(at[u], at[v]))
    }
    if (byDir.size !== 3) {
      reject(
        'NUMBER_MISMATCH',
        `题面给的是长宽高三个方向的棱，图上却有 ${byDir.size} 组平行棱`,
      )
      return 'fail'
    }

    const lens = [...byDir.values()]
    if (!sameRatios(lens, [L, W, H])) {
      reject(
        'NUMBER_MISMATCH',
        `题面给的长宽高是 ${L}:${W}:${H}，图上三组棱之比是 ${lens
          .map((x) => x.toFixed(3))
          .join(':')}`,
      )
      return 'fail'
    }
    return 'ok'
  }

  return 'none'
}

function checkNumbers(scene, problemText, reject) {
  // lengthOf / aggregateLengths 都不自己规范化（见 parseParallelepipedGivens
  // 的用法：规范化是调用方的责任），所以在这里统一做一次。
  const text = normalizeLatexForDisplay(problemText || '')
  const cons = collectLengthConstraints(scene, text)

  if (cons.length > 0) {
    // 逐棱写法（AB = 4）：以第一条定出全局缩放 k，再验其余各条。
    const k = cons[0].expected / cons[0].actual
    if (!Number.isFinite(k) || k <= 0) {
      reject('BAD_STRUCTURE', '无法从第一条边长约束解出缩放系数')
      return false
    }

    for (const c of cons) {
      const want = c.expected
      const got = c.actual * k
      // 相对容差：绝对容差会被缩放放大，在大尺寸题目上误杀
      if (Math.abs(got - want) > TOL * Math.max(want, got)) {
        reject(
          'NUMBER_MISMATCH',
          `棱 ${edgeLabel(...c.edge)} 题面为 ${want}，按图算是 ${got.toFixed(4)}，比例对不上`,
        )
        return false
      }
    }
    return true
  }

  // 题面用的是聚合写法；聚合也取不到才算"缺证据"。
  const agg = checkAggregate(scene, text, reject)
  if (agg === 'fail') return false
  if (agg === 'ok') return true

  // 缺证据即拒，退回下一层（题目照片），绝不"没有证据所以放行"。
  //
  // 这是**有意**的取舍，不是疏漏：没有数值就只剩结构/退化/声明三条，它们都
  // 只能证明"图形自洽"，证明不了"图形与这道题一致"。放行等于把最有力的那条
  // 校验让出去，而错的图比没有图更糟。
  //
  // 代价要认：纯证明题（「证明：AB ∥ CD」）会被一律挡下。这在降级链完整时
  // 是对的 —— 挡下之后学生还能看到题目照片里的原图。**如果层 3a 还没上线，
  // 挡下就等于什么都不画**，那时这条策略的收益是负的，需要重新评估。
  reject(
    'NO_NUMERIC_EVIDENCE',
    '题面里没有可核对的边长，无法确认图形与题目一致',
  )
  return false
}

// ── 退化：数值全合法、形状却是塌的，这类最瞒得过"只查 NaN"的测试 ──

function checkDegenerate(scene, reject) {
  const pts = scene.points.map((p) => p.position)
  const faces = scene.faces || []

  for (let i = 0; i < faces.length; i++) {
    const ring = faces[i].map((x) => scene.points[x].position)
    // 面退化成一条线（三点共线）时法向量不存在，这个面画出来是零面积
    if (!planeNormal(ring)) {
      reject('DEGENERATE', `faces[${i}] 的顶点共线，该面面积为 0`)
      return false
    }
  }

  // 整体不能共面 —— 所有点落在一个平面上就是一张平面图，不是立体。
  // 这里不依赖 faces：候选没给面时也得判，否则"无面"会成为绕开本条的漏洞。
  const p0 = pts[0]
  let normal = null
  for (let i = 1; i < pts.length && !normal; i++) {
    for (let j = i + 1; j < pts.length && !normal; j++) {
      normal = planeNormal([p0, pts[i], pts[j]])
    }
  }
  if (!normal) {
    reject('DEGENERATE', '所有顶点共线，不构成几何体')
    return false
  }

  const n = norm(normal)
  const scale = Math.max(...pts.map((p) => dist(p, p0)))
  const outOfPlane =
    Math.max(...pts.map((p) => Math.abs(dot(sub(p, p0), normal)) / n)) /
    (scale || 1)
  // 用相对量：与图形自身尺度比，避免大场景放过、小场景误杀
  if (scale <= 0 || outOfPlane < TOL) {
    reject('DEGENERATE', '所有顶点共面，不构成几何体')
    return false
  }

  return true
}

// ── 声明：模型说"PA ⊥ 底面"，就用点积自己验一遍 ──

/** 长度 2 视为线段，≥3 视为平面（点集）。少一个字段让模型少错一次。 */
const isPlane = (b) => b.length >= 3

function dirOf(pts, at) {
  return sub(at[pts[1]], at[pts[0]])
}

/**
 * 验一条声明。返回 null 表示验过且成立；返回字符串表示不成立的原因；
 * 返回 { unverifiable } 表示这类声明校验器不支持 —— 交调用方降级处理。
 */
function verifyClaim(claim, at) {
  const { kind, a, b } = claim || {}

  if (!Array.isArray(a) || a.length < 2 || !Array.isArray(b) || b.length < 2) {
    return { unverifiable: '声明的点集不完整' }
  }
  if (a.length > 2) return { unverifiable: `不支持以点集为起点的 ${kind}` }

  const miss = [...a, ...b].filter((id) => !at[id])
  if (miss.length) return `声明引用了不存在的顶点：${miss.join(', ')}`

  const da = dirOf(a, at)

  if (isPlane(b)) {
    const nb = planeNormal(b.map((id) => at[id]))
    if (!nb) return { unverifiable: `平面 ${b.join('')} 的顶点共线，无法定出法向量` }
    const nbn = nb.map((v) => v / norm(nb))

    if (kind === 'perpendicular') {
      // 线 ⊥ 面 ⇔ 线方向 ∥ 面法向
      const r = norm(cross(da, nbn)) / norm(da)
      return r > 1e-6 ? `${a.join('')} 与平面 ${b.join('')} 不垂直（偏差 ${r.toExponential(2)}）` : null
    }
    if (kind === 'parallel') {
      // 线 ∥ 面 ⇔ 线方向 ⊥ 面法向
      const r = Math.abs(dot(da, nbn)) / norm(da)
      return r > 1e-6 ? `${a.join('')} 与平面 ${b.join('')} 不平行（偏差 ${r.toExponential(2)}）` : null
    }
    return { unverifiable: `不支持线-面关系 ${kind}` }
  }

  const db = dirOf(b, at)
  const scale = norm(da) * norm(db)
  if (scale < TOL) return '声明两端有一方长度为 0'

  if (kind === 'perpendicular') {
    const r = Math.abs(dot(da, db)) / scale
    return r > 1e-6 ? `${a.join('')} ⊥ ${b.join('')} 不成立（夹角余弦残差 ${r.toExponential(2)}）` : null
  }
  if (kind === 'parallel') {
    const r = norm(cross(da, db)) / scale
    return r > 1e-6 ? `${a.join('')} ∥ ${b.join('')} 不成立（正弦残差 ${r.toExponential(2)}）` : null
  }
  return { unverifiable: `不支持的声明类型 ${kind}` }
}

function checkClaims(scene, reject, degrade) {
  const at = Object.fromEntries(scene.points.map((p) => [p.id, p.position]))

  for (const claim of scene.claims || []) {
    const r = verifyClaim(claim, at)
    if (r === null) continue

    if (r?.unverifiable) {
      // 验不了 ≠ 错。按既定策略降级：图照画，只是不标注这条性质，
      // 而不是因为一条说不清的声明把整张图毙掉。
      degrade(`声明「${claim.kind}」未验证：${r.unverifiable}`)
      continue
    }

    // 验了且不成立 —— 模型的坐标和它自己的声明自相矛盾，坐标不可信
    reject('CLAIM_FALSE', r)
    return false
  }
  return true
}

// ── 闸门 ──

/**
 * 校验一份 AI 候选场景。
 *
 * @param {object} scene  候选场景 { points, edges, faces, claims? }
 * @param {string} problemText  题目原文，供"数值"一项取证据
 * @returns {{ok:boolean, verdict:string, code:string|null, reason:string|null, degraded:string[]}}
 *   ok 为 true 时（pass / degrade）才允许交给渲染层；
 *   reject 时调用方**不画**，并把 reason 说给用户 —— 绝不退回"随便画一个"。
 */
export function validateSceneIR(scene, problemText) {
  const degraded = []
  let code = null
  let reason = null

  const reject = (c, r) => {
    code = c
    reason = r
  }
  const degrade = (r) => degraded.push(r)

  if (!scene || typeof scene !== 'object') {
    return {
      ok: false,
      verdict: VERDICT.REJECT,
      code: 'BAD_STRUCTURE',
      reason: '没有候选场景',
      degraded,
    }
  }

  const pass =
    checkStructure(scene, reject) &&
    checkNoZeroLengthEdge(scene, reject) &&
    checkDegenerate(scene, reject) &&
    checkNumbers(scene, problemText, reject) &&
    checkClaims(scene, reject, degrade)

  // code !== null 这道保险不能省：reject 只置标志、不改返回值，所以某个
  // 检查若在 reject 之后返回了真值，光看 pass 就会把它放过去。放行一张错的
  // 图是这个模块唯一不可接受的失败，宁可多加一次判断。
  if (!pass || code !== null) {
    return { ok: false, verdict: VERDICT.REJECT, code, reason, degraded }
  }

  return {
    ok: true,
    verdict: degraded.length ? VERDICT.DEGRADE : VERDICT.PASS,
    code: null,
    reason: null,
    degraded,
  }
}
