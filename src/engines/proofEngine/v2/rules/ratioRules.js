/**
 * @module proofEngine/v2/rules/ratioRules
 * @description V2 比例推导规则 — 线面平行性质、平行截比例、比例运算
 */

import { RULE_TIERS } from '../schemas.js'

function findFacts(facts, type) {
  return facts.filter((f) => f.type === type)
}

function planeName(planeFact) {
  const pts = planeFact.subjects || []
  const fromDesc = planeFact.description?.match(/平面\s*(\w+)/)?.[1]
    || planeFact.description?.match(/plane\s+(\w+)/i)?.[1]
  if (fromDesc) return fromDesc
  return pts.join('')
}

/**
 * 线面平行性质定理：
 * 若 l ∥ 平面 α，β 过 l，α ∩ β = m，则 l ∥ m
 */
export const lineParallelPlaneProperty = {
  id: 'line_parallel_plane_property',
  name: '线面平行性质定理',
  description: '直线平行于平面时，过该直线的平面与已知平面的交线平行于该直线',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'parallel',
  tags: ['parallel', 'plane', 'line'],
  priority: 7,
  condition({ facts }) {
    const parallelFacts = findFacts(facts, 'parallel')
    const intersectionFacts = findFacts(facts, 'intersection')
    const matches = []

    for (const pf of parallelFacts) {
      const subs = pf.subjects || []
      if (subs.length < 2) continue
      // 线-面平行：一端为长度2的线名，一端为长度≥3的平面名
      let line = null; let plane1 = null
      if (subs[0].length === 2 && subs[1].length >= 3) {
        line = subs[0]; plane1 = subs[1]
      } else if (subs[1].length === 2 && subs[0].length >= 3) {
        line = subs[1]; plane1 = subs[0]
      } else continue

      for (const intf of intersectionFacts) {
        const intSubs = intf.subjects || []
        // 平面交线形式：[planeA, planeB, lineName]
        if (intSubs.length < 3) continue
        const [a, b, ixLine] = intSubs
        const touchesPlane1 = a === plane1 || b === plane1 || a.includes(plane1) || b.includes(plane1)
        if (!touchesPlane1) continue
        if (!ixLine || ixLine.length !== 2) continue

        const already = findFacts(facts, 'parallel').some((p) => {
          const ps = p.subjects || []
          return (ps.includes(line) && ps.includes(ixLine))
        })
        if (already) continue

        const plane2 = a === plane1 ? b : b === plane1 ? a : (a.includes(plane1) ? b : a)
        matches.push({ line, intersectionLine: ixLine, plane1, plane2 })
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      facts.push({
        type: 'parallel',
        subjects: [m.line, m.intersectionLine],
        description: `${m.line} ∥ ${m.intersectionLine}（线面平行性质）`,
      })
      steps.push({
        title: '应用线面平行性质定理',
        content: `∵ ${m.line} ∥ 平面${m.plane1}，平面${m.plane1} ∩ 平面${m.plane2} = ${m.intersectionLine}，∴ ${m.line} ∥ ${m.intersectionLine}。`,
        formula: '线面平行 ⇒ 交线平行',
        type: 'inference',
        rule: 'line_parallel_plane_property',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/**
 * 平行线分线段成比例（三角形内）：
 * 在 △XYZ 中，A∈XY，B∈XZ，AB∥YZ ⇒ XA:XY = XB:XZ
 * 这里用于：△PAC 中 F∈PA，G∈AC，FG∥PC ⇒ AF:AP = AG:AC
 */
export const proportionalSegments = {
  id: 'proportional_segments',
  name: '平行线分线段成比例',
  description: '三角形中平行于一边的直线截其他两边所得对应线段成比例',
  tier: RULE_TIERS.THEOREM,
  premises: [],
  conclusion: 'ratio',
  tags: ['proportion', 'parallel', 'ratio'],
  priority: 6,
  condition({ facts }) {
    const parallelFacts = findFacts(facts, 'parallel')
    const onFacts = findFacts(facts, 'on')
    const ratioFacts = findFacts(facts, 'ratio')
    const matches = []

    // 寻找：FG ∥ PC，F on PA，G on AC（或交点事实）
    for (const pf of parallelFacts) {
      const pSubs = pf.subjects || []
      if (pSubs.length < 2) continue
      // 只要线-线平行
      if (pSubs[0].length !== 2 || pSubs[1].length !== 2) continue

      const [l1, l2] = pSubs
      // 候选：一条是 PC（三角形一边），一条是 FG（截线）
      const candidates = []
      if ((l1 === 'PC' || l1 === 'CP') && (l2.includes('F') || l2.includes('G'))) {
        candidates.push({ base: 'PC', cut: l2 })
      } else if ((l2 === 'PC' || l2 === 'CP') && (l1.includes('F') || l1.includes('G'))) {
        candidates.push({ base: 'PC', cut: l1 })
      } else if ((l1 === 'FG' || l1 === 'GF') && (l2 === 'PC' || l2 === 'CP')) {
        candidates.push({ base: 'PC', cut: 'FG' })
      } else if ((l2 === 'FG' || l2 === 'GF') && (l1 === 'PC' || l1 === 'CP')) {
        candidates.push({ base: 'PC', cut: 'FG' })
      }

      for (const c of candidates) {
        const fOnPA = onFacts.some((o) => {
          const s = o.subjects || []
          return s[0] === 'F' && (s[1] === 'PA' || s[1] === 'AP')
        })
        const gOnAC = onFacts.some((o) => {
          const s = o.subjects || []
          return s[0] === 'G' && (s[1] === 'AC' || s[1] === 'CA')
        }) || findFacts(facts, 'intersection').some((ix) => (ix.subjects || []).includes('G'))

        if (!fOnPA || !gOnAC) continue

        // 需要已知 AG:AC 比例才能传递
        const baseRatio = ratioFacts.find((r) => {
          const s = r.subjects || []
          const v = r.values || []
          return s.includes('AG') && s.includes('AC') && v.length >= 2
        })
        if (!baseRatio) continue

        const already = ratioFacts.some((r) => {
          const s = r.subjects || []
          return (s.includes('AF') && s.includes('AP')) || (s.includes('AP') && s.includes('AF'))
        })
        if (already) continue

        // canonical 可能存储为 (AC, AG, [den, num])：按 subjects 方向取值
        const idxAG = baseRatio.subjects.indexOf('AG')
        matches.push({
          apex: 'P',
          base: c.base,
          cut: c.cut,
          agAc: [baseRatio.values[idxAG], baseRatio.values[1 - idxAG]],
        })
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const m of matchResults) {
      const [num, den] = m.agAc
      // AF:AP = AG:AC
      facts.push({
        type: 'ratio',
        subjects: ['AF', 'AP'],
        values: [num, den],
        description: `AF:AP = AG:AC = ${num}:${den}`,
      })
      facts.push({
        type: 'ratio',
        subjects: ['AP', 'AF'],
        values: [den, num],
        description: `AP:AF = ${den}:${num}`,
      })
      // 整体/部分数值
      if (num !== 0) {
        facts.push({
          type: 'ratio',
          subjects: ['AP/AF'],
          values: [den / num],
          description: `AP/AF = ${den / num}`,
        })
      }
      steps.push({
        title: '平行线分线段成比例',
        content: `在 △PAC 中，F ∈ PA，G ∈ AC，且 ${m.cut} ∥ ${m.base}，∴ AF:AP = AG:AC = ${num}:${den}，故 AP/AF = ${den / num}。`,
        formula: '平行于三角形一边的直线截其他两边成比例',
        type: 'inference',
        rule: 'proportional_segments',
      })
    }
    return { facts, proofSteps: steps }
  },
}

/**
 * 比例运算：由 part:rest = m:n 得 whole/part = (m+n)/m
 * 也处理已有 AG:GC → AG:AC
 */
export const ratioArithmetic = {
  id: 'ratio_arithmetic',
  name: '比例运算',
  description: '由分段比计算整体与部分的比值',
  tier: RULE_TIERS.COROLLARY,
  premises: [],
  conclusion: 'ratio',
  tags: ['ratio', 'calculation'],
  priority: 4,
  condition({ facts }) {
    const ratioFacts = findFacts(facts, 'ratio')
    const onFacts = findFacts(facts, 'on')
    // 共享点必须已知位于 whole 线段上（如 on(G, AC)），
    // 否则 part:whole 会被误当作 part:part 反复推导（无界增长）
    const pointOnSegment = (pt, a, b) => onFacts.some((o) => {
      const s = o.subjects || []
      return s[0] === pt && (s[1] === a + b || s[1] === b + a)
    })
    const matches = []

    for (const rf of ratioFacts) {
      const subs = rf.subjects || []
      const vals = rf.values || []
      if (subs.length < 2 || vals.length < 2) continue
      const [seg1, seg2] = subs
      const [m, n] = vals
      if (typeof m !== 'number' || typeof n !== 'number' || m === 0) continue

      // AG:GC = 1:2 → AG:AC = 1:3（若尚未存在；要求 G 在 AC 上）
      if (seg1.length === 2 && seg2.length === 2) {
        const shared = [...seg1].find((ch) => seg2.includes(ch))
        if (shared) {
          const end1 = [...seg1].find((ch) => ch !== shared)
          const end2 = [...seg2].find((ch) => ch !== shared)
          if (end1 && end2 && pointOnSegment(shared, end1, end2)) {
            const whole = end1 < end2 ? end1 + end2 : end2 + end1
            // canonical 可能交换两段并同步交换 values，两种方向都算已存在
            const alreadyWhole = ratioFacts.some((r) => {
              const s = r.subjects || []
              const v = r.values || []
              return (s[0] === seg1 && s[1] === whole && v[0] === m && v[1] === m + n)
                || (s[0] === whole && s[1] === seg1 && v[0] === m + n && v[1] === m)
            })
            if (!alreadyWhole && whole.length === 2) {
              matches.push({ kind: 'part_to_whole', seg1, seg2, whole, m, n })
            }
          }
        }
      }

      // AP:AF = 3:1 → AP/AF = 3
      if (seg1.length === 2 && seg2.length === 2 && n !== 0) {
        const slash = `${seg1}/${seg2}`
        const alreadySlash = ratioFacts.some((r) => {
          const s = r.subjects || []
          return s.length === 1 && s[0] === slash
        })
        if (!alreadySlash) {
          matches.push({ kind: 'slash', seg1, seg2, value: m / n })
        }
      }
    }
    return matches.length > 0 ? matches : false
  },
  apply(matchResults) {
    const facts = []; const steps = []
    for (const match of matchResults) {
      if (match.kind === 'part_to_whole') {
        const { seg1, whole, m, n } = match
        facts.push({
          type: 'ratio',
          subjects: [seg1, whole],
          values: [m, m + n],
          description: `${seg1}:${whole} = ${m}:${m + n}`,
        })
        steps.push({
          title: '比例计算',
          content: `∵ ${seg1}:${match.seg2} = ${m}:${n}，∴ ${seg1}:${whole} = ${m}:${m + n}。`,
          formula: `${seg1}/${whole} = ${m}/${m + n}`,
          type: 'calculation',
          rule: 'ratio_arithmetic',
        })
      } else if (match.kind === 'slash') {
        const { seg1, seg2, value } = match
        facts.push({
          type: 'ratio',
          subjects: [`${seg1}/${seg2}`],
          values: [value],
          description: `${seg1}/${seg2} = ${value}`,
        })
        steps.push({
          title: '比例计算',
          content: `∴ ${seg1}/${seg2} = ${value}。`,
          formula: `${seg1}/${seg2} = ${value}`,
          type: 'calculation',
          rule: 'ratio_arithmetic',
        })
      }
    }
    return { facts, proofSteps: steps }
  },
}
