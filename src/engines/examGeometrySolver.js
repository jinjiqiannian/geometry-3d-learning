/**
 * 高考基础立体几何 — 线面角 / 二面角 / 点面距离
 * 用坐标系直接算出答案，替代 explanationEngine 里的静态模板假答案。
 */
import {
  computeVector,
  computeVectorLength,
  computeDotProduct,
  computePlaneNormal,
  computePointToPlaneDistance,
} from './proofEngine/coordMethod.js'

const CUBE_LABELS = {
  A: [0, 0, 0],
  B: [1, 0, 0],
  C: [1, 1, 0],
  D: [0, 1, 0],
  A1: [0, 0, 1],
  B1: [1, 0, 1],
  C1: [1, 1, 1],
  D1: [0, 1, 1],
}

function scalePoint(p, a) {
  return [p[0] * a, p[1] * a, p[2] * a]
}

function getCubePoints(a = 1) {
  const out = {}
  for (const [k, v] of Object.entries(CUBE_LABELS)) {
    out[k] = scalePoint(v, a)
  }
  return out
}

/** 统一标签：A1 / A₁ / A' → A1 */
function normalizeLabel(raw) {
  if (!raw) return null
  let s = String(raw)
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/'/g, '1')
    .toUpperCase()
  if (/^[A-D]$/.test(s)) return s
  if (/^[A-D]1$/.test(s)) return s
  return s
}

function pt(points, label) {
  const key = normalizeLabel(label)
  return points[key] || points[label] || null
}

function fmtNum(n) {
  if (!Number.isFinite(n)) return String(n)
  const r = Math.round(n * 1e6) / 1e6
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r))
  // 常见根式
  const sq = r * r
  for (const [name, val] of [
    ['√2/2', Math.SQRT1_2],
    ['√3/3', Math.sqrt(3) / 3],
    ['√3/2', Math.sqrt(3) / 2],
    ['√2/3', Math.sqrt(2) / 3],
    ['√6/3', Math.sqrt(6) / 3],
    ['√2', Math.SQRT2],
    ['√3', Math.sqrt(3)],
  ]) {
    if (Math.abs(r - val) < 1e-6) return name
  }
  if (Math.abs(sq - 2) < 1e-6) return '√2'
  if (Math.abs(sq - 3) < 1e-6) return '√3'
  return String(r)
}

function simplifySinCos(sinOrCos) {
  return fmtNum(sinOrCos)
}

/**
 * sinθ = |d·n| / (|d||n|)  → 线面角
 */
export function linePlaneAngleSin(dir, normal) {
  const dLen = computeVectorLength(dir)
  const nLen = computeVectorLength(normal)
  if (dLen === 0 || nLen === 0) return null
  const absDot = Math.abs(computeDotProduct(dir, normal))
  return Math.min(1, absDot / (dLen * nLen))
}

/**
 * cosφ = |n1·n2| / (|n1||n2|)  → 二面角（取锐角/教材常用绝对值形式，再说明需看图形定锐钝）
 */
export function dihedralAngleCos(n1, n2) {
  const l1 = computeVectorLength(n1)
  const l2 = computeVectorLength(n2)
  if (l1 === 0 || l2 === 0) return null
  return Math.min(1, Math.abs(computeDotProduct(n1, n2)) / (l1 * l2))
}

function extractSize(parsedData, text) {
  const fromParsed = parsedData?.size || parsedData?.params?.size || parsedData?.params?.a
  if (fromParsed != null && Number(fromParsed) > 0) return Number(fromParsed)
  const m = String(text || '').match(/棱长(?:为|是|=)?\s*(\d+(?:\.\d+)?)/)
  if (m) return Number(m[1])
  return 1
}

/** 从题干抽线段：A₁B / AB / A1C 等 */
function extractSegment(text) {
  const m = String(text).match(
    /([A-Da-d][₁1'₂2']?)([A-Da-d][₁1'₂2']?)(?:与|和|到|所成|夹)/,
  )
  if (m) return [normalizeLabel(m[1]), normalizeLabel(m[2])]
  const m2 = String(text).match(
    /求\s*([A-Da-d][₁1']?)([A-Da-d][₁1']?)/,
  )
  if (m2) return [normalizeLabel(m2[1]), normalizeLabel(m2[2])]
  return null
}

/** 平面：平面ABCD / 底面ABCD / 平面ABC */
function extractPlane(text) {
  const m = String(text).match(/平面\s*([A-Da-d₁1'₂2'₃3']{3,6})/)
  if (m) {
    const raw = m[1].replace(/₁/g, '1').replace(/'/g, '1')
    // 拆成点标签序列
    const labels = []
    let i = 0
    while (i < raw.length) {
      if (i + 1 < raw.length && /[1]/.test(raw[i + 1])) {
        labels.push(normalizeLabel(raw.slice(i, i + 2)))
        i += 2
      } else {
        labels.push(normalizeLabel(raw[i]))
        i += 1
      }
    }
    if (labels.length >= 3) return labels.slice(0, 4)
  }
  if (/底面|平面ABCD|面ABCD/.test(text)) return ['A', 'B', 'C', 'D']
  if (/侧面ABB|平面ABB/.test(text)) return ['A', 'B', 'B1', 'A1']
  return ['A', 'B', 'C', 'D']
}

function wantSin(text) {
  return /正弦|sin/i.test(text)
}
function wantCos(text) {
  return /余弦|cos/i.test(text)
}
function wantTan(text) {
  return /正切|tan/i.test(text)
}

/**
 * @returns {{ steps: object[], answer: string, formula: string, typeName: string } | null}
 */
export function solveExamGeometry(problemText, parsedData = {}) {
  const q =
    parsedData?.questionType ||
    (/二面角/.test(problemText)
      ? 'dihedral_angle'
      : /点到.*平面.*距离|点面距离/.test(problemText)
        ? 'point_plane_distance'
        : /线面角|直线.*平面.*角|与平面.*所成角/.test(problemText)
          ? 'line_plane_angle'
          : null)

  if (!q) return null
  if (!/正方体|立方体|cube/i.test(problemText) && parsedData?.type !== 'cube') {
    // 先覆盖高考最常见的正方体模型；长方体后续再扩
    if (parsedData?.type && parsedData.type !== 'cube') return null
    if (!/正方体|立方体/.test(problemText)) return null
  }

  const a = extractSize(parsedData, problemText)
  const points = getCubePoints(a)

  if (q === 'line_plane_angle') {
    return solveLinePlane(problemText, points, a)
  }
  if (q === 'dihedral_angle') {
    return solveDihedral(problemText, points, a)
  }
  if (q === 'point_plane_distance') {
    return solvePointPlane(problemText, points, a)
  }
  return null
}

function solveLinePlane(text, points, a) {
  const seg = extractSegment(text) || ['A1', 'B']
  const planeLabels = extractPlane(text)
  const p0 = pt(points, seg[0])
  const p1 = pt(points, seg[1])
  const q0 = pt(points, planeLabels[0])
  const q1 = pt(points, planeLabels[1])
  const q2 = pt(points, planeLabels[2])
  if (!p0 || !p1 || !q0 || !q1 || !q2) return null

  const dir = computeVector(p0, p1)
  const normal = computePlaneNormal(q0, q1, q2)
  const sin = linePlaneAngleSin(dir, normal)
  if (sin == null) return null

  const cos = Math.sqrt(Math.max(0, 1 - sin * sin))
  const tan = cos > 1e-9 ? sin / cos : null

  let answerVal
  let answerExpr
  if (wantTan(text) && tan != null) {
    answerVal = simplifySinCos(tan)
    answerExpr = `tanθ = ${answerVal}`
  } else if (wantCos(text)) {
    answerVal = simplifySinCos(cos)
    answerExpr = `cosθ = ${answerVal}`
  } else {
    // 默认给正弦（高考最常考）
    answerVal = simplifySinCos(sin)
    answerExpr = `sinθ = ${answerVal}`
  }

  const lineName = `${seg[0]}${seg[1]}`
  const planeName = planeLabels.join('')

  return {
    typeName: '正方体',
    formula: 'sinθ = |方向向量·法向量| / (|方向向量|·|法向量|)',
    answer: answerExpr,
    steps: [
      {
        title: '识别线面角',
        content: `求直线${lineName}与平面${planeName}所成角θ。线面角范围 [0°, 90°]。`,
        type: 'observation',
        formula: '',
      },
      {
        title: '建立坐标系',
        content: `正方体棱长为 ${a}，以 A 为原点建立空间直角坐标系，写出${lineName}的方向向量与平面${planeName}的法向量。`,
        type: 'construction',
        formula: '',
      },
      {
        title: '代入向量公式',
        content: `sinθ = |d·n| / (|d|·|n|)。方向向量 d = ${fmtVec(dir)}，法向量 n = ${fmtVec(normal)}。`,
        type: 'calculation',
        formula: 'sinθ = |d·n| / (|d|·|n|)',
      },
      {
        title: '计算结果',
        content: `算出 sinθ = ${simplifySinCos(sin)}${wantTan(text) && tan != null ? `，进而 tanθ = ${simplifySinCos(tan)}` : ''}。`,
        type: 'calculation',
        formula: answerExpr,
      },
      {
        title: '结论',
        content: `所以 ${answerExpr}。注意线面角用正弦公式，不要误用余弦。`,
        type: 'conclusion',
        formula: answerExpr,
        finalAnswer: { expression: answerExpr, value: answerVal, unit: '' },
      },
    ],
  }
}

function solveDihedral(text, points, a) {
  // 默认：平面 ACC1A1 与底面 ABCD（高考经典）
  let plane1 = ['A', 'C', 'C1']
  let plane2 = ['A', 'B', 'C']
  const planes = [...String(text).matchAll(/平面\s*([A-Da-d₁1'₂2'₃3']{3,8})/g)]
  if (planes.length >= 2) {
    plane1 = extractPlane(`平面${planes[0][1]}`)
    plane2 = extractPlane(`平面${planes[1][1]}`)
  } else if (/ACC|对角面/.test(text)) {
    plane1 = ['A', 'C', 'C1']
    plane2 = ['A', 'B', 'C']
  }

  const a0 = pt(points, plane1[0])
  const a1 = pt(points, plane1[1])
  const a2 = pt(points, plane1[2])
  const b0 = pt(points, plane2[0])
  const b1 = pt(points, plane2[1])
  const b2 = pt(points, plane2[2])
  if (!a0 || !a1 || !a2 || !b0 || !b1 || !b2) return null

  const n1 = computePlaneNormal(a0, a1, a2)
  const n2 = computePlaneNormal(b0, b1, b2)
  const cos = dihedralAngleCos(n1, n2)
  if (cos == null) return null
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos))

  let answerExpr
  let answerVal
  if (wantSin(text)) {
    answerVal = simplifySinCos(sin)
    answerExpr = `sinθ = ${answerVal}`
  } else {
    answerVal = simplifySinCos(cos)
    answerExpr = `cosθ = ${answerVal}`
  }

  return {
    typeName: '正方体',
    formula: 'cosθ = |n₁·n₂| / (|n₁|·|n₂|)',
    answer: answerExpr,
    steps: [
      {
        title: '识别二面角',
        content: `求二面角的平面角。关键是找两个半平面的法向量夹角。`,
        type: 'observation',
        formula: '',
      },
      {
        title: '建立坐标系',
        content: `正方体棱长 ${a}，分别求两平面法向量 n₁、n₂。`,
        type: 'construction',
        formula: '',
      },
      {
        title: '法向量夹角',
        content: `n₁ = ${fmtVec(n1)}，n₂ = ${fmtVec(n2)}。cosθ = |n₁·n₂| / (|n₁|·|n₂|)。（锐钝需结合图形判断，高考常取锐角对应的绝对值形式再核对。）`,
        type: 'calculation',
        formula: 'cosθ = |n₁·n₂| / (|n₁|·|n₂|)',
      },
      {
        title: '结论',
        content: `得 ${answerExpr}。`,
        type: 'conclusion',
        formula: answerExpr,
        finalAnswer: { expression: answerExpr, value: answerVal, unit: '' },
      },
    ],
  }
}

function solvePointPlane(text, points, a) {
  // 点：点C1 / 点P
  let pointLabel = 'C1'
  const pm = String(text).match(/点\s*([A-Da-d][₁1']?)/)
  if (pm) pointLabel = normalizeLabel(pm[1])
  else {
    const m2 = String(text).match(/([A-D][₁1]?)\s*到/)
    if (m2) pointLabel = normalizeLabel(m2[1])
  }
  const planeLabels = extractPlane(text)
  // 若是「点到对面」类，默认对面底
  const point = pt(points, pointLabel)
  const q0 = pt(points, planeLabels[0])
  const q1 = pt(points, planeLabels[1])
  const q2 = pt(points, planeLabels[2])
  if (!point || !q0 || !q1 || !q2) return null

  const d = computePointToPlaneDistance(point, q0, q1, q2)
  const answerVal = fmtNum(d)
  const answerExpr = `d = ${answerVal}`

  return {
    typeName: '正方体',
    formula: 'd = |Ax₀+By₀+Cz₀+D| / √(A²+B²+C²)',
    answer: answerExpr,
    steps: [
      {
        title: '点面距离',
        content: `求点${pointLabel}到平面${planeLabels.join('')}的距离。`,
        type: 'observation',
        formula: '',
      },
      {
        title: '建系与平面方程',
        content: `棱长 ${a}。用法向量写出平面方程，再代入点坐标。`,
        type: 'construction',
        formula: '',
      },
      {
        title: '代入距离公式',
        content: `d = |n·(P−Q)| / |n|，算得 ${answerExpr}。`,
        type: 'calculation',
        formula: 'd = |n·(P−Q)| / |n|',
      },
      {
        title: '结论',
        content: `点${pointLabel}到该平面的距离为 ${answerVal}。`,
        type: 'conclusion',
        formula: answerExpr,
        finalAnswer: { expression: answerExpr, value: answerVal, unit: '' },
      },
    ],
  }
}

function fmtVec(v) {
  return `(${fmtNum(v[0])}, ${fmtNum(v[1])}, ${fmtNum(v[2])})`
}
