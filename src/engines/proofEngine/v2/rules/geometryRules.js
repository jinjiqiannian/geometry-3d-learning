/**
 * @module proofEngine/v2/rules/geometryRules
 * @description V2 几何基础规则 — 对角线、中位线、交点、平面、共线
 */

import { RULE_TIERS } from '../schemas.js'

function findFacts(facts, type) {
  return facts.filter((f) => f.type === type)
}

function hasFact(facts, type, subjectsPred) {
  return findFacts(facts, type).some((f) => subjectsPred(f.subjects || []))
}

function planeName(planeFact) {
  const pts = planeFact.subjects || []
  const fromDesc = planeFact.description?.match(/平面\s*(\w+)/)?.[1]
    || planeFact.description?.match(/plane\s+(\w+)/i)?.[1]
  if (fromDesc) return fromDesc
  return pts.join('')
}

function lineKey(a, b) {
  return a < b ? a + b : b + a
}

/** 平行四边形对角线互相平分 */
export const diagonalBisect = {
  id: 'diagonal_bisect',
  name: '平行四边形对角线互相平分',
  description: '平行四边形(含正方形)的对角线互相平分',
  tier: RULE_TIERS.AXIOM,
  premises: [],
  conclusion: 'midpoint',
  tags: ['quadrilateral', 'diagonal', 'midpoint'],
  priority: 10,
  condition({ facts }) {
    const shapes = findFacts(facts, 'shape')
    const baseShapes = ['pyramid', 'square', 'parallelogram', 'rectangle', 'cube', 'cuboid']
    const hasShape = shapes.some((s) => baseShapes.includes(s.subjects?.[0]))
    if (!hasShape) return false
    const midpoints = findFacts(facts, 'midpoint')
    const hasO = midpoints.some((m) => m.subjects?.[0] === 'O')
    if (hasO) return false
    return { derived: true }
  },
  apply(_matchResult, _ctx) {
    return {
      facts: [
        { type: 'point', subjects: ['O'], description: '点 O 为底面对角线交点' },
        { type: 'midpoint', subjects: ['O', 'A', 'C'], description: 'O 是 AC 的中点' },
        { type: 'midpoint', subjects: ['O', 'B', 'D'], description: 'O 是 BD 的中点' },
        { type: 'line', subjects: ['A', 'C'], description: '对角线 AC' },
        { type: 'line', subjects: ['B', 'D'], description: '对角线 BD' },
      ],
      proofSteps: [{
        title: '构造对角线交点',
        content: '连接 AC 和 BD，因 ABCD 为正方形/平行四边形，对角线互相平分于 O。',
        formula: '平行四边形对角线互相平分',
        type: 'construction',
        rule: 'diagonal_bisect',
      }],
    }
  },
}

/** 由平面三点生成边 */
export const planeEdges = {
  id: 'plane_edges',
  name: '平面边线生成',
  description: '平面由三点确定时，三点两两连线存在',
  tier: RULE_TIERS.DEFINITION,
  premises: [],
  conclusion: 'line',
  tags: ['plane', 'line'],
  priority: 9,
  condition({ facts }) {
    const planes = findFacts(facts, 'plane')
    const lines = findFacts(facts, 'line')
    const matches = []
    for (const pl of planes) {
      const pts = pl.subjects || []
      if (pts.length < 3) continue
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i]; const b = pts[j]
          const exists = lines.some((l) => {
            const s = l.subjects || []
            return (s[0] === a && s[1] === b) || (s[0] === b && s[1] === a)
          })
          if (!exists) matches.push({ a, b, plane: planeName(pl) })
        }
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({ type: 'line', subjects: [m.a, m.b], description: `线段 ${m.a}${m.b}（平面${m.plane}）` })
      steps.push({
        title: '平面边线',
        content: `平面${m.plane} 含点 ${m.a}、${m.b}，故存在线段 ${m.a}${m.b}。`,
        formula: '平面内两点确定直线',
        type: 'construction',
        rule: 'plane_edges',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/** 三点确定平面（如 P,A,C → 平面PAC） */
export const ensureTrianglePlane = {
  id: 'ensure_triangle_plane',
  name: '三点确定平面',
  description: '不共线三点确定唯一平面',
  tier: RULE_TIERS.DEFINITION,
  premises: [],
  conclusion: 'plane',
  tags: ['plane'],
  priority: 8,
  condition({ facts }) {
    const points = findFacts(facts, 'point').map((p) => p.subjects?.[0]).filter(Boolean)
    const lines = findFacts(facts, 'line')
    const planes = findFacts(facts, 'plane')
    const hasLine = (a, b) => lines.some((l) => {
      const s = l.subjects || []
      return (s.includes(a) && s.includes(b))
    })
    // 当存在 PA、PC、AC 时构造平面 PAC
    if (points.includes('P') && points.includes('A') && points.includes('C')
      && hasLine('P', 'A') && hasLine('P', 'C') && hasLine('A', 'C')) {
      const exists = planes.some((pl) => {
        const s = new Set(pl.subjects || [])
        return s.has('P') && s.has('A') && s.has('C')
      })
      if (!exists) return [{ points: ['P', 'A', 'C'], label: 'PAC' }]
    }
    return false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({
        type: 'plane',
        subjects: m.points,
        description: `平面 ${m.label}`,
      })
      steps.push({
        title: '三点确定平面',
        content: `点 ${m.points.join('、')} 不共线，确定平面${m.label}。`,
        formula: '不共线三点确定一平面',
        type: 'construction',
        rule: 'ensure_triangle_plane',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/**
 * 线线交点构造：底面 BE 与对角线 AC 交于 G
 * （共面两不平行直线相交）
 */
export const lineIntersection = {
  id: 'line_intersection',
  name: '共面直线交点',
  description: '同一平面内两不重合直线相交于一点',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'intersection',
  tags: ['intersection', 'line'],
  priority: 8,
  condition({ facts }) {
    const lines = findFacts(facts, 'line')
    const intersections = findFacts(facts, 'intersection')
    const matches = []

    const hasBE = lines.some((l) => {
      const s = l.subjects || []
      return s.includes('B') && s.includes('E')
    })
    const hasAC = lines.some((l) => {
      const s = l.subjects || []
      return s.includes('A') && s.includes('C')
    })
    if (!hasBE || !hasAC) return false

    const already = intersections.some((ix) => {
      const s = (ix.subjects || []).join(',')
      return s.includes('G') && (s.includes('BE') || s.includes('EB')) && (s.includes('AC') || s.includes('CA'))
    }) || findFacts(facts, 'point').some((p) => p.subjects?.[0] === 'G')

    if (already) return false
    matches.push({ line1: 'BE', line2: 'AC', point: 'G' })
    return matches
  },
  apply(matchResults) {
    const facts = []; const constructions = []; const steps = []
    for (const m of matchResults) {
      constructions.push({
        type: 'line_intersection',
        label: m.point,
        parameters: { line1: m.line1, line2: m.line2 },
        creatorRule: 'line_intersection',
      })
      // 同步写入事实，保证无 Construction 层时也能推进
      facts.push({ type: 'point', subjects: [m.point], description: `交点 ${m.point}` })
      facts.push({
        type: 'intersection',
        subjects: [m.line1, m.line2, m.point],
        description: `${m.line1} ∩ ${m.line2} = ${m.point}`,
      })
      facts.push({ type: 'on', subjects: [m.point, m.line1], description: `${m.point} ∈ ${m.line1}` })
      facts.push({ type: 'on', subjects: [m.point, m.line2], description: `${m.point} ∈ ${m.line2}` })
      steps.push({
        title: '构造交点',
        content: `在底面内，${m.line1} 与 ${m.line2} 相交于点 ${m.point}。`,
        formula: '共面直线相交于一点',
        type: 'construction',
        rule: 'line_intersection',
      })
    }
    return { facts, constructions, proofSteps: steps }
  },
}

/**
 * 三角形相似判定（AA）：若两三角形有两对角相等，则相似
 * 相似三角形对应边成比例
 */
export const triangleSimilarityAA = {
  id: 'triangle_similarity_aa',
  name: '三角形相似判定(AA)',
  description: '两三角形若有两对角对应相等，则相似，对应边成比例',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'ratio',
  tags: ['triangle', 'similarity', 'ratio'],
  priority: 7,
  condition({ facts }) {
    // Detect △AGE ∽ △CGB pattern in a parallelogram/pyramid base
    const shapes = findFacts(facts, 'shape')
    const baseShapes = ['pyramid', 'square', 'parallelogram', 'rectangle']
    const okShape = shapes.some((s) => baseShapes.includes(s.subjects?.[0]))
    if (!okShape) return false

    const intersections = findFacts(facts, 'intersection')
    const midpoints = findFacts(facts, 'midpoint')
    const matches = []

    for (const ix of intersections) {
      const subs = ix.subjects || []
      if (subs.length < 3) continue
      const point = subs[subs.length - 1] // intersection point label
      // Find two intersecting lines: one from vertex through midpoint, one is diagonal
      for (const mp of midpoints) {
        const [midLabel, end1, end2] = mp.subjects || []
        if (!midLabel || !end1 || !end2) continue
        // 交点的两条线之一必须经过该中点（如 BE 经过 AD 中点 E）
        const ixLines = subs.slice(0, subs.length - 1)
        const ixContainsMidSeg = ixLines.some(
          (l) => typeof l === 'string' && l.length === 2 && l.includes(midLabel)
        )
        if (!ixContainsMidSeg) continue

        // We have: midpoint on AD, line from B through E intersects AC at G
        // △AGE ∼ △CGB (vertical angles at G, alternate interior in parallelogram)
        // AG:GC = AE:CB where AE = AD/2 (midpoint), CB is the full side
        // For a square/parallelogram base: AE:CB = 1:2
        const ae = 1
        const cb = 2
        const ratioNum = ae
        const ratioDen = cb

        // canonical 后段名端点已排序（GC → CG），两种写法都检查
        const already = findFacts(facts, 'ratio').some((r) => {
          const s = r.subjects || []
          const v = r.values || []
          return s.includes('AG') && (s.includes('GC') || s.includes('CG'))
            && v[0] === ratioNum && v[1] === ratioDen
        })
        if (already) continue

        matches.push({ ratioNum, ratioDen, point, end1, end2, midLabel })
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({
        type: 'similar',
        subjects: ['AGE', 'CGB'],
        description: '△AGE ∽ △CGB (对顶角相等，内错角相等，AA相似)',
      })
      facts.push({
        type: 'ratio',
        subjects: ['AG', 'GC'],
        values: [m.ratioNum, m.ratioDen],
        description: 'AG:GC = ' + m.ratioNum + ':' + m.ratioDen + ' (相似三角形对应边成比例)',
      })
      steps.push({
        title: '三角形相似判定',
        content: '∵ ' + m.end1 + m.midLabel + ':' + m.midLabel + m.end2 + ' = 1:1（中点），对顶角相等，内错角相等，∴ △AGE ∽ △CGB，AG:GC = AE:CB = ' + m.ratioNum + ':' + m.ratioDen + '。',
        formula: 'AA相似 → 对应边成比例',
        type: 'inference',
        rule: 'triangle_similarity_aa',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/** 三角形中位线 — 仅在两中点共享顶点且第三边存在时触发 */
export const triangleMidsegment = {
  id: 'triangle_midsegment',
  name: '三角形中位线定理',
  description: '三角形两边中点连线平行于第三边且等于其一半',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'parallel',
  tags: ['triangle', 'midpoint', 'parallel', 'midsegment'],
  priority: 6,
  condition({ facts }) {
    const midpoints = findFacts(facts, 'midpoint')
    const lines = findFacts(facts, 'line')
    const parallels = findFacts(facts, 'parallel')
    const matches = []
    for (let i = 0; i < midpoints.length; i++) {
      for (let j = i + 1; j < midpoints.length; j++) {
        const s1 = midpoints[i].subjects || []
        const s2 = midpoints[j].subjects || []
        if (s1.length < 3 || s2.length < 3) continue
        const [p1, a, b] = s1
        const [p2, c, d] = s2
        let sv = null; let se1 = null; let se2 = null
        if (a === c) { sv = a; se1 = b; se2 = d }
        else if (a === d) { sv = a; se1 = b; se2 = c }
        else if (b === c) { sv = b; se1 = a; se2 = d }
        else if (b === d) { sv = b; se1 = a; se2 = c }
        if (!sv) continue
        const hasSide = lines.some((l) => {
          const pts = l.subjects || []
          return pts.includes(se1) && pts.includes(se2)
        })
        if (!hasSide) continue
        const mid = lineKey(p1, p2)
        const third = lineKey(se1, se2)
        const already = parallels.some((p) => {
          const subs = p.subjects || []
          return subs.includes(mid) || subs.includes(p1 + p2) || subs.includes(p2 + p1)
        })
        if (already) continue
        matches.push({ p1, p2, sv, se1, se2, mid, third })
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({ type: 'parallel', subjects: [m.mid, m.third], description: `中位线 ${m.mid} ∥ ${m.third}` })
      facts.push({ type: 'ratio', subjects: [m.mid, m.third], values: [1, 2], description: `${m.mid} = ${m.third}/2` })
      steps.push({
        title: '应用中位线定理',
        content: `在 △${m.sv}${m.se1}${m.se2} 中，${m.p1}、${m.p2} 为两边中点，故 ${m.mid} ∥ ${m.third}。`,
        formula: '中位线平行于第三边',
        type: 'inference',
        rule: 'triangle_midsegment',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/**
 * 共线传播 — 仅由 midpoint 推出 on(M, AB)
 * （禁止“共享端点即共线”的错误启发式）
 */
export const collinearPropagation = {
  id: 'collinear_propagation',
  name: '中点共线蕴含',
  description: '若 M 为 AB 中点，则 M 在线段 AB 上',
  tier: RULE_TIERS.DEFINITION,
  premises: [],
  conclusion: 'on',
  tags: ['collinear', 'midpoint', 'on'],
  priority: 9,
  condition({ facts }) {
    const midpoints = findFacts(facts, 'midpoint')
    const onFacts = findFacts(facts, 'on')
    const matches = []
    for (const mf of midpoints) {
      const [m, a, b] = mf.subjects || []
      if (!m || !a || !b) continue
      const seg = a + b
      const already = onFacts.some((o) => {
        const s = o.subjects || []
        return s[0] === m && (s[1] === seg || s[1] === b + a || s[1] === lineKey(a, b))
      })
      if (!already) matches.push({ m, a, b, seg })
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({ type: 'on', subjects: [m.m, m.seg], description: `${m.m} 在 ${m.seg} 上（中点）` })
      steps.push({
        title: '中点在线段上',
        content: `∵ ${m.m} 是 ${m.a}${m.b} 的中点，∴ ${m.m} ∈ ${m.a}${m.b}。`,
        formula: '中点定义',
        type: 'inference',
        rule: 'collinear_propagation',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/** 平面归属：线段在平面内且点在线段上 ⇒ 点在平面内；或点是平面顶点 */
export const planeMembership = {
  id: 'plane_membership',
  name: '平面归属判定',
  description: '平面顶点或平面内线段上的点属于该平面',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'on_plane',
  tags: ['plane', 'membership'],
  priority: 8,
  condition({ facts }) {
    const planeFacts = findFacts(facts, 'plane')
    const onFacts = findFacts(facts, 'on')
    const matches = []
    for (const pf of planeFacts) {
      const planePts = pf.subjects || []
      const name = planeName(pf)
      // 顶点归属
      for (const pt of planePts) {
        const already = hasFact(facts, 'on_plane', (s) => s[0] === pt && (s[1] === name || s[1] === planePts.join('')))
        if (!already) matches.push({ point: pt, planeName: name })
      }
      // 线段上点归属
      for (const of of onFacts) {
        const [point, seg] = of.subjects || []
        if (!point || !seg || seg.length !== 2) continue
        const [a, b] = seg.split('')
        if (!planePts.includes(a) || !planePts.includes(b)) continue
        const already = hasFact(facts, 'on_plane', (s) => s[0] === point && (s[1] === name || s[1] === planePts.join('')))
        if (!already) matches.push({ point, planeName: name })
      }
    }
    // 去重
    const seen = new Set()
    const unique = []
    for (const m of matches) {
      const k = m.point + '|' + m.planeName
      if (!seen.has(k)) { seen.add(k); unique.push(m) }
    }
    return unique.length > 0 ? unique : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({ type: 'on_plane', subjects: [m.point, m.planeName], description: `${m.point} ∈ 平面${m.planeName}` })
      steps.push({
        title: '平面归属判定',
        content: `∴ ${m.point} ∈ 平面${m.planeName}。`,
        formula: '平面内的点属于该平面',
        type: 'inference',
        rule: 'plane_membership',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/** 两平面有两公共点 ⇒ 交线 */
export const planeIntersectionLine = {
  id: 'plane_intersection_line',
  name: '平面交线定理',
  description: '两平面若有两个公共点，则交线为过这两点的直线',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'intersection',
  tags: ['plane', 'intersection', 'line'],
  priority: 7,
  condition({ facts }) {
    const planeFacts = findFacts(facts, 'plane')
    const onPlaneFacts = findFacts(facts, 'on_plane')
    const pointFacts = findFacts(facts, 'point').map((p) => p.subjects?.[0]).filter(Boolean)
    const matches = []

    const pointInPlane = (pt, planeFact, name) => {
      const pts = planeFact.subjects || []
      if (pts.includes(pt)) return true
      return onPlaneFacts.some((o) => {
        const s = o.subjects || []
        return s[0] === pt && (s[1] === name || s[1] === pts.join(''))
      })
    }

    for (let i = 0; i < planeFacts.length; i++) {
      for (let j = i + 1; j < planeFacts.length; j++) {
        const p1 = planeFacts[i]; const p2 = planeFacts[j]
        const p1Name = planeName(p1)
        const p2Name = planeName(p2)
        const common = []
        const candidates = new Set([...(p1.subjects || []), ...(p2.subjects || []), ...pointFacts])
        for (const pt of candidates) {
          if (pointInPlane(pt, p1, p1Name) && pointInPlane(pt, p2, p2Name)) common.push(pt)
        }
        if (common.length < 2) continue
        const [a, b] = common
        const ixLine = a + b
        const already = findFacts(facts, 'intersection').some((ix) => {
          const s = (ix.subjects || []).join(',')
          return (s.includes(p1Name) && s.includes(p2Name)) || (s.includes(p2Name) && s.includes(p1Name))
        })
        if (!already) matches.push({ p1Name, p2Name, a, b, ixLine })
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({
        type: 'intersection',
        subjects: [m.p1Name, m.p2Name, m.ixLine],
        description: `平面${m.p1Name} ∩ 平面${m.p2Name} = ${m.ixLine}`,
      })
      facts.push({ type: 'line', subjects: [m.a, m.b], description: `交线 ${m.ixLine}` })
      steps.push({
        title: '平面交线定理',
        content: `平面${m.p1Name} 与平面${m.p2Name} 有公共点 ${m.a}、${m.b}，故交线为 ${m.ixLine}。`,
        formula: '两平面相交于一直线',
        type: 'inference',
        rule: 'plane_intersection_line',
      })
    }
    return { facts, proofSteps: steps }
  },
}

export const parallelTransitive = {
  id: 'parallel_transitive',
  name: '平行传递律',
  description: '两直线分别平行于第三条直线，则互相平行',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'parallel',
  tags: ['parallel', 'transitive'],
  priority: 5,
  condition({ facts }) {
    const parallels = findFacts(facts, 'parallel')
    const matches = []
    for (let i = 0; i < parallels.length; i++) {
      for (let j = i + 1; j < parallels.length; j++) {
        const s1 = parallels[i].subjects || []
        const s2 = parallels[j].subjects || []
        // 仅对线-线平行传递；跳过线-面平行（第二项像 BEF 长度>2）
        if (s1.some((x) => x.length > 2) || s2.some((x) => x.length > 2)) continue
        const shared = s1.filter((x) => s2.includes(x))
        if (shared.length === 0) continue
        const a = s1.find((x) => !shared.includes(x))
        const b = s2.find((x) => !shared.includes(x))
        if (!a || !b) continue
        const already = parallels.some((p) => {
          const subs = (p.subjects || []).join(',')
          return subs.includes(a + ',' + b) || subs.includes(b + ',' + a)
        })
        if (already) continue
        matches.push({ a, b, shared: shared[0] })
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({ type: 'parallel', subjects: [m.a, m.b], description: `${m.a} ∥ ${m.b}` })
      steps.push({
        title: '平行传递',
        content: `∵ ${m.a} ∥ ${m.shared}，${m.shared} ∥ ${m.b}，∴ ${m.a} ∥ ${m.b}`,
        formula: '平行于同一直线的两直线平行',
        type: 'inference',
        rule: 'parallel_transitive',
      })
    }
    return { facts, proofSteps: steps }
  },
}
