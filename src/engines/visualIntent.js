// ═══════════════════════════════════════════════════════
//  VisualIntent — Deterministic step→visual mapper
//
//  Pure function: step (type, title, content)
//               + parsedData (type, highlightLines)
//               → VisualIntent (highlight, aux, opacity)
//
//  Sparse Visual Mapping (ECC):
//    observation  → highlight problem edges
//    construction → 1-2 aux lines
//    calculation  → only edges being calculated
//    conclusion   → result edges, full overview
//
//  Camera is NEVER auto-controlled. Users freely orbit.
//  Step switching only updates: highlight, aux, opacity.
//
//  Zero AI dependency. No sceneState. Debuggable.
// ═══════════════════════════════════════════════════════

import { resolveEdge, createLabelMap } from './labelMapper'
import { enforceProgression } from './intentProgression'

// ── Camera position presets ──────────────────────────

export const CAMERA_PRESETS = {
  overview:     [4, 4, 6],
  front:        [0, 0, 6],
  top:          [0, 6, 0.1],
  side:         [6, 0, 0],
  diagonal:     [5, 3, 5],
  base:         [0, -1.5, 3],
  apex:         [0, 5, 1.5],
  closeUp:      [2.5, 2, 3.5],
  bottomUp:     [0, -3, 2],
  corner:       [3.5, 2.5, 4.5],   // 角点视角 — 适合二面角
  section:      [2, 1.5, 5],        // 截面正对视角
  projection:   [1, 3, 5],          // 投影视角 — 适合线面角
}

// ── Step type → visual defaults ──────────────────────
// NOTE: Camera is NOT auto-controlled. Users freely orbit.
//       Only highlight, aux lines, and opacity change per step.

const TYPE_DEFAULTS = {
  observation: {
    highlightColor: '#4A90E2',
    faceOpacity: 0.42,
    nonHighlightOpacity: 1.0,
  },
  construction: {
    highlightColor: '#4A90E2',
    faceOpacity: 0.30,
    nonHighlightOpacity: 0.25,
  },
  calculation: {
    highlightColor: '#4A90E2',
    faceOpacity: 0.25,
    nonHighlightOpacity: 0.20,
  },
  conclusion: {
    highlightColor: '#4A90E2',
    faceOpacity: 0.42,
    nonHighlightOpacity: 1.0,
  },
}

// ── Geometry type → set of valid edge IDs ────────────
// (for matching extracted edges against known edges)

const GEOMETRY_EDGES = {
  cube: [
    // 12 edges
    'AB','BC','CD','DA','EF','FG','GH','HE','AE','BF','CG','DH',
    // 12 face diagonals
    'AC','BD','EG','FH','AF','BE','DG','CH','AH','DE','BG','CF',
    // 4 space diagonals
    'AG','BH','CE','DF',
  ],
  cuboid: [
    'AB','BC','CD','DA','EF','FG','GH','HE','AE','BF','CG','DH',
    'AC','BD','EG','FH','AF','BE','DG','CH','AH','DE','BG','CF',
    'AG','BH','CE','DF',
  ],
  pyramid: [
    'AB','BC','CD','DA','PA','PB','PC','PD','AC','BD','PO',
  ],
  prism: [
    'AB','BC','CA',"A'B'","B'C'","C'A'","AA'","BB'","CC'",
  ],
  squareFrustum: [
    'AB','BC','CD','DA','EF','FG','GH','HE',
    'AE','BF','CG','DH',
    'AC','BD','EG','FH',
    'AF','BE','BG','CF','CH','DG','DE','AH',
  ],
  sphere: ['NS','EW','FB','NO','SO'],
  cylinder: ["OO'",'h1','h2'],
  cone: ['OP','h1','h2','h3','h4'],
  circularFrustum: ["OO'",'h1','h2','h3','h4'],
  tetrahedron: [
    'AB','AC','AD','BC','BD','CD',
  ],
  octahedron: [
    'TR','TF','TL','TB','DR','DF','DL','DB',
    'RF','FL','LB','BR',
  ],
}

// ── Keyword patterns for edge extraction ─────────────

// Matches edge label patterns like "AB", "A'B'", "AG" etc.
const EDGE_PATTERN = /[A-O]'?[A-O]'?/g

// Keywords that indicate which edges to highlight
const DIAGONAL_KEYWORDS = /对角线|diagonal|体对角|空间对角/
const FACE_DIAGONAL_KEYWORDS = /面对角|面对角线/
const SKEW_KEYWORDS = /异面|skew|异面直线/
const AUXILIARY_KEYWORDS = /辅助线|辅助面|平移|作.*线|连接|构造|截面/
const HEIGHT_KEYWORDS = /高线|高[为是]|高度|垂直|垂线/
const EDGE_KEYWORDS = /棱长|棱[为是]|边长|边[为是]|侧棱/

// ── 球体半径公式 ──────────────────────────────────
//  内接球（内切球）& 外接球 半径（以棱长/尺寸为参数）

const SPHERE_FORMULAS = {
  cube: {
    inscribed:   (size) => size / 2,                  // r = a/2
    circumscribed: (size) => size * Math.sqrt(3) / 2,  // R = a√3/2
  },
  tetrahedron: {
    inscribed:   (size) => size * Math.sqrt(6) / 12,   // r = a√6/12
    circumscribed: (size) => size * Math.sqrt(6) / 4,   // R = a√6/4
  },
  octahedron: {
    inscribed:   (size) => size / Math.sqrt(6),         // r = a/√6
    circumscribed: (size) => size / Math.sqrt(2),        // R = a/√2
  },
  pyramid: {
    circumscribed: (size) => {
      // 正四棱锥外接球 R = (h² + a²/2) / (2h)，默认 h=size
      const h = size, a = size
      return (h * h + a * a / 2) / (2 * h)
    },
  },
}

/**
 * 计算几何体的内接/外接球信息
 * @param {string} geoType — 几何体类型
 * @param {number} size — 棱长/尺寸
 * @param {string} sphereType — 'inscribed' | 'circumscribed'
 * @returns {{ radius: number, color: string, opacity: number, wireframe: boolean } | null}
 */
export function computeSphereOverlay(geoType, size, sphereType) {
  const formulas = SPHERE_FORMULAS[geoType]
  if (!formulas || !formulas[sphereType]) return null

  const radius = formulas[sphereType](size)
  if (!radius || radius <= 0) return null

  return {
    radius,
    color: sphereType === 'inscribed' ? '#22C55E' : '#F59E0B',  // 绿色内切 · 琥珀外接
    opacity: 0.12,
    wireframe: true,
  }
}

// ── Core function ────────────────────────────────────

/**
 * Extract valid edge IDs from parsedData.highlightLines.
 * Uses labelMap to translate user labels to internal edge IDs.
 *
 * @param {Object} parsedData — { type, highlightLines, ... }
 * @param {Set} validEdges — Set of valid edge IDs for this geometry
 * @param {string} geoType — geometry type
 * @param {Object} [labelMap] — from createLabelMap()
 * @returns {string[]} deduplicated valid edge IDs
 */
function extractEdgesFromParsedData(parsedData, validEdges, geoType, labelMap) {
  if (!parsedData?.highlightLines?.length) return []
  const ids = new Set()
  for (const hl of parsedData.highlightLines) {
    const label = (hl.label || `${hl.from}${hl.to}`).replace(/\s/g, '')
    const resolved = resolveWithLabelMap(label, validEdges, labelMap)
    if (resolved) ids.add(resolved)
  }
  return [...ids]
}

/**
 * Resolve a label to a valid internal edge ID, using labelMap if available.
 */
function resolveWithLabelMap(label, validEdges, labelMap) {
  // 1) Direct match
  if (validEdges.has(label)) return label
  // 2) Reverse
  const rev = label.split('').reverse().join('')
  if (validEdges.has(rev)) return rev
  // 3) Use labelMap to translate user edge → internal edge
  if (labelMap) {
    const internal = resolveEdge(label, labelMap)
    if (internal) {
      if (validEdges.has(internal)) return internal
      const revInternal = internal.split('').reverse().join('')
      if (validEdges.has(revInternal)) return revInternal
    }
  }
  return null
}

/**
 * Convert AI sceneState fields to VisualIntent props for Canvas3D.
 * Uses labelMap to translate user-facing edge IDs to internal edge IDs.
 */
function sceneStateToIntent(sceneState, labelMap) {
  const highlightEdgeIds = (sceneState.highlightEdges?.map(e => {
    const raw = typeof e === 'string' ? e : `${e.from}${e.to}`
    if (labelMap) {
      const resolved = resolveUserEdge(raw, labelMap)
      if (resolved) return resolved
    }
    return raw
  }) || []).filter(Boolean)

  return {
    highlightEdgeIds,
    highlightColor: sceneState.highlightColor || '#FF6B6B',
    auxLines: sceneState.showAuxiliaryLines || [],
    faceOpacity: sceneState.opacity?.faces ?? 0.42,
    nonHighlightOpacity: sceneState.opacity?.nonHighlightedEdges ?? 1.0,
    annotations: sceneState.annotations || [],
  }
}

/**
 * 使用 labelMap 将用户边标签解析为内部边 ID
 * "A1B" → "EB" (A1→E, B→B)
 * "B1C" → "FC" (B1→F, C→C)
 */
function resolveUserEdge(userEdge, labelMap) {
  if (!labelMap || !userEdge || userEdge.length < 2) return null

  // 先尝试直接匹配（已经是内部边）
  const normalized = userEdge.replace(/['']/g, "'")
  if (labelMap.internalLabels.some(l => l === normalized || l === normalized.split('').reverse().join(''))) {
    return normalized
  }

  // 通过 resolveEdge 解析
  const internal = resolveEdge(normalized, labelMap)
  if (internal) return internal

  return null
}

/**
 * Compute visual intent for a step.
 *
 * Priority:
 *   1. step.sceneState (from AI DeepSeek) — constrained by enforceProgression
 *   2. Rule-based fallback (ECC Sparse Visual Mapping)
 *
 * Camera is NEVER auto-controlled — users freely orbit with OrbitControls.
 * Step switching only updates: highlight, auxLines, opacity.
 *
 * @param {Object} step — { step, title, content, type, sceneState }
 * @param {Object} parsedData — { type, size, labels, highlightLines, explanation }
 * @param {string} [problemText] — original problem text
 * @param {Object} [labelMap] — from createLabelMap()
 * @returns {Object} VisualIntent — { highlightEdgeIds, auxLines, faceOpacity, nonHighlightOpacity, sphereOverlay }
 */
export function computeVisualIntent(step, parsedData, problemText, labelMap) {
  if (!step || !parsedData) return defaultIntent()

  const geoType = parsedData.type || 'cube'
  const validEdges = new Set(GEOMETRY_EDGES[geoType] || GEOMETRY_EDGES.cube)
  const typeDefaults = TYPE_DEFAULTS[step.type] || TYPE_DEFAULTS.observation

  const problemEdges = extractEdgesFromParsedData(parsedData, validEdges, geoType, labelMap)

  // Sphere overlay detection
  const searchText = `${step.title || ''} ${step.content || ''} ${problemText || ''}`
  let sphereOverlay = null
  if (/内接|内切|inscribed/.test(searchText)) {
    sphereOverlay = computeSphereOverlay(geoType, parsedData.size || 2, 'inscribed')
  } else if (/外接|外切|circumscribed/.test(searchText)) {
    sphereOverlay = computeSphereOverlay(geoType, parsedData.size || 2, 'circumscribed')
  }

  // Priority 1: AI sceneState (constrained by progression)
  if (step.sceneState) {
    const rawIntent = sceneStateToIntent(step.sceneState, labelMap)
    const stepIndex = (step.step || 1) - 1
    const intent = enforceProgression(rawIntent, stepIndex, step.type, problemEdges, geoType)
    intent.sphereOverlay = sphereOverlay
    return intent
  }

  // Priority 2: Rule-based fallback
  const stepIndex = (step.step || 1) - 1
  const rawIntent = computeRuleBasedIntent(step, parsedData, problemText, geoType, typeDefaults, problemEdges, validEdges)
  const intent = enforceProgression(rawIntent, stepIndex, step.type, problemEdges, geoType)
  intent.sphereOverlay = sphereOverlay
  return intent
}

/**
 * Rule-based intent computation (fallback when AI sceneState is not available)
 */
function computeRuleBasedIntent(step, parsedData, problemText, geoType, typeDefaults, problemEdges, validEdges) {
  const base = {
    highlightEdgeIds: problemEdges,
    highlightColor: typeDefaults.highlightColor,
    auxLines: [],
    faceOpacity: typeDefaults.faceOpacity,
    nonHighlightOpacity: typeDefaults.nonHighlightOpacity,
  }

  if (step.type === 'construction') {
    const auxLines = computeAuxLines(step, parsedData, geoType, problemEdges, problemText)
    base.highlightEdgeIds = []
    base.auxLines = auxLines.slice(0, 2)
  }

  return base
}

// ── Edge extraction ──────────────────────────────────

// Map primed vertex labels (A'→E, B'→F, etc.) for cube/cuboid ABCD-EFGH convention.
// Only letters followed by "'" get mapped; unprimed letters stay as-is.
// Example: "B'D" → B'=F, D=D → "FD" (canonical edge = DF).
function mapPrimedVertex(label, geoType) {
  if (!label.includes("'") || (geoType !== 'cube' && geoType !== 'cuboid' && geoType !== 'squareFrustum')) {
    return label
  }
  // ABCD-EFGH convention: A'→E, B'→F, C'→G, D'→H
  const PRIME_MAP = { A: 'E', B: 'F', C: 'G', D: 'H', E: 'A', F: 'B', G: 'C', H: 'D' }
  // Track which chars have primes; strip primes but only map primed chars
  let result = ''
  let i = 0
  while (i < label.length) {
    const ch = label[i]
    if (ch === "'") { i++; continue }
    if (i + 1 < label.length && label[i + 1] === "'") {
      // This char was primed → map it
      result += PRIME_MAP[ch] || ch
      i += 2
    } else {
      // Unprimed → keep as-is
      result += ch
      i++
    }
  }
  return result
}

// Resolve an edge label to a valid edge ID, trying variations
function resolveEdgeLabel(label, validEdges, geoType) {
  // 1) Direct match
  if (validEdges.has(label)) return label
  // 2) Reverse (edges are undirected: AB = BA)
  const rev = label.split('').reverse().join('')
  if (validEdges.has(rev)) return rev
  // 3) Map primed vertices first (B'D → FD → DF)
  //    Do this BEFORE stripping primes — "B'D" should map to DF, not BD
  const mapped = mapPrimedVertex(label, geoType)
  if (mapped !== label) {
    if (validEdges.has(mapped)) return mapped
    const revMapped = mapped.split('').reverse().join('')
    if (validEdges.has(revMapped)) return revMapped
  }
  // 4) Strip primes → try (fallback for simple prime labels like "A'B'")
  const noPrime = label.replace(/'/g, '')
  if (noPrime !== label) {
    if (validEdges.has(noPrime)) return noPrime
    const revPrime = noPrime.split('').reverse().join('')
    if (validEdges.has(revPrime)) return revPrime
  }
  return null
}

function extractHighlightEdges(step, parsedData, validEdges, geoType, problemText) {
  const ids = new Set()

  const text = `${step.title} ${step.content}`

  // A) Use parsedData.highlightLines first (most reliable)
  if (parsedData.highlightLines && parsedData.highlightLines.length > 0) {
    for (const hl of parsedData.highlightLines) {
      const label = (hl.label || `${hl.from}${hl.to}`).replace(/\s/g, '')
      const resolved = resolveEdgeLabel(label, validEdges, geoType)
      if (resolved) ids.add(resolved)
    }
  }

  // B) Extract from step text — scan for edge label patterns
  const matches = text.match(/[A-O]'?[A-O]'?/g) || []
  for (const m of matches) {
    const resolved = resolveEdgeLabel(m, validEdges, geoType)
    if (resolved) ids.add(resolved)
  }

  // C) Extract from problemText (the original user input)
  //    Template steps don't contain specific edge IDs like "AB" or "B'D",
  //    but the original problem text does.
  if (ids.size <= 1 && problemText) {
    // First: keyword-aware matching (from keywords that indicate edges)
    const kwPattern = /(?:对角线|异面直线|线段|求|求长|夹角|与|已知|平行|垂直|计算|证明|等于|=)\s*([A-Z]'?[A-Z]?'?)/g
    let m
    while ((m = kwPattern.exec(problemText)) !== null) {
      const label = m[1].replace(/\s/g, '')
      const resolved = resolveEdgeLabel(label, validEdges, geoType)
      if (resolved) ids.add(resolved)
    }
    // Fallback: any adjacent letter pair (limited to 4 to avoid clutter)
    if (ids.size <= 1) {
      const genericMatches = problemText.match(/[A-Z]'?[A-Z]'?/g) || []
      for (const match of genericMatches) {
        const resolved = resolveEdgeLabel(match, validEdges, geoType)
        if (resolved) ids.add(resolved)
        if (ids.size >= 4) break
      }
    }
  }

  // D) Step type heuristics — add complementary edges
  if (step.type === 'observation') {
    // Observation: highlight edges mentioned in the problem
    // If we found edges from problem text, keep them
  }

  if (step.type === 'construction') {
    // Construction: also add diagonals / auxiliary edges
    if (DIAGONAL_KEYWORDS.test(text) || (problemText && DIAGONAL_KEYWORDS.test(problemText))) {
      const spaceDiags = ['AG','BH','CE','DF'].filter(id => validEdges.has(id))
      spaceDiags.forEach(id => ids.add(id))
      // Add face diagonals too
      const faceDiags = ['AC','BD','EG','FH','AF','BE','DG','CH','AH','DE','BG','CF']
        .filter(id => validEdges.has(id))
      // Only add a subset to avoid visual clutter
      if (faceDiags.length > 0) ids.add(faceDiags[0])
    }
    // Section keywords → highlight section-related edges
    if (/截面/.test(text) || (problemText && /截面/.test(problemText))) {
      const mids = ['MN','PQ','EF','GH','AB','CD'].filter(id => validEdges.has(id))
      mids.forEach(id => ids.add(id))
    }
    // Height keywords → add vertical edges
    if (HEIGHT_KEYWORDS.test(text) || (problemText && HEIGHT_KEYWORDS.test(problemText))) {
      const verts = ['AE','BF','CG','DH',"OO'","AA'","BB'","CC'","PO"]
        .filter(id => validEdges.has(id))
      verts.forEach(id => ids.add(id))
    }
  }

  if (step.type === 'calculation') {
    // Calculation: keep the problem edges, also add diagonals if mentioned
    if (ids.size === 0 && parsedData.highlightLines) {
      for (const hl of parsedData.highlightLines) {
        const label = (hl.label || `${hl.from}${hl.to}`).replace(/\s/g, '')
        if (validEdges.has(label)) ids.add(label)
      }
    }
    // If we have edges from problem text, those ARE the edges being calculated
  }

  if (step.type === 'conclusion') {
    // Conclusion: keep all existing highlights, show the result edges
  }

  return [...ids]
}

// ── Auxiliary line computation ───────────────────────

function computeAuxLines(step, parsedData, geoType, highlightEdgeIds, problemText) {
  const auxLines = []
  const text = `${step.title} ${step.content}`
  const searchText = `${text} ${problemText || ''}`

  // Only add aux lines for construction steps
  if (step.type !== 'construction' && !AUXILIARY_KEYWORDS.test(searchText)) {
    return auxLines
  }

  // Cube/Cuboid diagonal construction: add body diagonal if discussed
  if ((geoType === 'cube' || geoType === 'cuboid') && DIAGONAL_KEYWORDS.test(searchText)) {
    // If "体对角线AG" is mentioned, add face diagonal AC as aux
    if (text.includes('AG') || highlightEdgeIds.includes('AG') || searchText.includes('AG')) {
      auxLines.push({ from: 'A', to: 'C', dashed: true, color: '#4A90E2' })
    }
    if (text.includes('BH') || highlightEdgeIds.includes('BH')) {
      auxLines.push({ from: 'B', to: 'D', dashed: true, color: '#4A90E2' })
    }
    if (text.includes('CE') || highlightEdgeIds.includes('CE')) {
      auxLines.push({ from: 'C', to: 'A', dashed: true, color: '#4A90E2' })
    }
    if (text.includes('DF') || highlightEdgeIds.includes('DF')) {
      auxLines.push({ from: 'D', to: 'B', dashed: true, color: '#4A90E2' })
    }
  }

  // Skew line angle: add translation line
  if (SKEW_KEYWORDS.test(searchText)) {
    // Generic: if two edges mentioned, add a translation
    const edges = [...highlightEdgeIds]
    if (edges.length >= 2) {
      // Add auxiliary: translate second edge to share endpoint with first
      auxLines.push({
        from: edges[0]?.[0] || 'B',
        to: edges[1]?.[1] || 'D',
        dashed: true,
        color: '#8B5CF6',
      })
    }
  }

  // Height/axis: add center axis
  if (HEIGHT_KEYWORDS.test(searchText)) {
    if (['pyramid', 'cone'].includes(geoType)) {
      auxLines.push({ from: 'O', to: 'P', dashed: true, color: '#4A90E2' })
    }
    if (['cylinder', 'circularFrustum'].includes(geoType)) {
      auxLines.push({ from: 'O', to: "O'", dashed: true, color: '#4A90E2' })
    }
  }

  // Section plane: add section outline
  if (/截面/.test(searchText)) {
    if (geoType === 'cylinder' || geoType === 'circularFrustum') {
      // Section through centers
      auxLines.push({ from: 'A', to: "A'", dashed: true, color: '#8B5CF6' })
      auxLines.push({ from: 'C', to: "C'", dashed: true, color: '#8B5CF6' })
    }
  }

  return auxLines
}

// ── Default intent (no step selected yet) ────────────

function defaultIntent() {
  return {
    highlightEdgeIds: [],
    highlightColor: '#4A90E2',
    auxLines: [],
    faceOpacity: 0.42,
    nonHighlightOpacity: 1.0,
  }
}

// ── Validation / Debug ───────────────────────────────

/**
 * Validate a visual intent against known geometry edges.
 * Returns warnings for invalid edge IDs.
 */
export function validateIntent(intent, geoType) {
  const validEdges = new Set(GEOMETRY_EDGES[geoType] || [])
  const warnings = []

  for (const id of intent.highlightEdgeIds) {
    if (!validEdges.has(id)) {
      warnings.push(`Unknown highlight edge: "${id}" for type "${geoType}"`)
    }
  }

  for (const aux of intent.auxLines) {
    // aux.from/to can be vertex labels OR coordinate references like 'center', 'top' etc.
    // Those reference labels are resolved by lineDefinitions/resolvePoint at render time
  }

  return { valid: warnings.length === 0, warnings }
}
