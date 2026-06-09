// ═══════════════════════════════════════════════════════
//  VisualIntent — Deterministic step→visual mapper
//
//  Pure function: step (type, title, content)
//               + parsedData (type, highlightLines)
//               → VisualIntent (highlight, aux, camera, opacity)
//
//  Sparse Visual Mapping (ECC):
//    observation  → no highlights, camera only
//    construction → no highlights, 1-2 aux lines
//    calculation  → only edges being calculated
//    conclusion   → result edges, full overview
//
//  Zero AI dependency. No sceneState. Debuggable.
// ═══════════════════════════════════════════════════════

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
}

// ── Step type → visual defaults ──────────────────────

const TYPE_DEFAULTS = {
  observation: {
    highlightColor: '#4A90E2',
    faceOpacity: 0.42,
    nonHighlightOpacity: 1.0,
    cameraPreset: 'overview',
  },
  construction: {
    highlightColor: '#8B5CF6',
    faceOpacity: 0.30,
    nonHighlightOpacity: 0.25,
    cameraPreset: 'diagonal',
  },
  calculation: {
    highlightColor: '#FF6B6B',
    faceOpacity: 0.25,
    nonHighlightOpacity: 0.20,
    cameraPreset: 'closeUp',
  },
  conclusion: {
    highlightColor: '#3FB950',
    faceOpacity: 0.42,
    nonHighlightOpacity: 1.0,
    cameraPreset: 'overview',
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

// ── Core function ────────────────────────────────────

/**
 * Extract valid edge IDs from parsedData.highlightLines.
 *
 * @param {Object} parsedData — { type, highlightLines, ... }
 * @param {Set} validEdges — Set of valid edge IDs for this geometry
 * @param {string} geoType — geometry type (for prime→unprimed mapping)
 * @returns {string[]} deduplicated valid edge IDs
 */
function extractEdgesFromParsedData(parsedData, validEdges, geoType) {
  if (!parsedData?.highlightLines?.length) return []
  const ids = new Set()
  for (const hl of parsedData.highlightLines) {
    const label = (hl.label || `${hl.from}${hl.to}`).replace(/\s/g, '')
    const resolved = resolveEdgeLabel(label, validEdges, geoType)
    if (resolved) ids.add(resolved)
  }
  return [...ids]
}

/**
 * Compute visual intent for a step — Sparse Visual Mapping (ECC).
 *
 * Each step type expresses exactly one cognitive action:
 *   observation  → no highlighted edges, camera changes only
 *   construction → no highlighted edges, 1-2 key auxiliary lines
 *   calculation  → only edges being calculated
 *   conclusion   → result edges, full overview
 *
 * @param {Object} step — { step, title, content, type }
 * @param {Object} parsedData — { type, size, labels, highlightLines, explanation }
 * @param {string} [problemText] — original problem text (used for aux line generation)
 * @returns {Object} VisualIntent — { highlightEdgeIds, auxLines, cameraPreset, faceOpacity, nonHighlightOpacity }
 */
export function computeVisualIntent(step, parsedData, problemText) {
  if (!step || !parsedData) return defaultIntent()

  const geoType = parsedData.type || 'cube'
  const validEdges = new Set(GEOMETRY_EDGES[geoType] || GEOMETRY_EDGES.cube)
  const typeDefaults = TYPE_DEFAULTS[step.type] || TYPE_DEFAULTS.observation
  const stepIndex = step.step ? step.step - 1 : 0

  // Extract edges from parsedData (not from step content — steps are pure text)
  const problemEdges = extractEdgesFromParsedData(parsedData, validEdges, geoType)

  // ── Sparse Visual Mapping by Step Type ──
  switch (step.type) {
    case 'observation': {
      // observation → 不连线，仅视角变化
      // 第一次 observation: overview, 全可见
      // 后续 observation: diagonal, 非高亮变暗
      const cameraPreset = stepIndex <= 1 ? 'overview' : 'diagonal'
      return {
        highlightEdgeIds: [],
        highlightColor: typeDefaults.highlightColor,
        auxLines: [],
        cameraPreset,
        faceOpacity: stepIndex <= 1 ? 0.42 : 0.35,
        nonHighlightOpacity: stepIndex <= 1 ? 1.0 : 0.25,
      }
    }

    case 'construction': {
      // construction → 只添加 1–2 条关键辅助线，不连线
      const auxLines = computeAuxLines(step, parsedData, geoType, problemEdges, problemText)
      return {
        highlightEdgeIds: [],
        highlightColor: typeDefaults.highlightColor,
        auxLines: auxLines.slice(0, 2),
        cameraPreset: 'diagonal',
        faceOpacity: 0.30,
        nonHighlightOpacity: 0.20,
      }
    }

    case 'calculation': {
      // calculation → 只高亮参与计算的边
      return {
        highlightEdgeIds: problemEdges,
        highlightColor: typeDefaults.highlightColor,
        auxLines: [],
        cameraPreset: 'closeUp',
        faceOpacity: 0.20,
        nonHighlightOpacity: 0.10,
      }
    }

    case 'conclusion': {
      // conclusion → 结果边绿色高亮，全恢复
      return {
        highlightEdgeIds: problemEdges,
        highlightColor: typeDefaults.highlightColor,
        auxLines: [],
        cameraPreset: 'overview',
        faceOpacity: 0.42,
        nonHighlightOpacity: 1.0,
      }
    }

    default: {
      return {
        highlightEdgeIds: problemEdges,
        highlightColor: typeDefaults.highlightColor,
        auxLines: [],
        cameraPreset: typeDefaults.cameraPreset,
        faceOpacity: typeDefaults.faceOpacity,
        nonHighlightOpacity: typeDefaults.nonHighlightOpacity,
      }
    }
  }
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

// ── Camera preset selection ──────────────────────────

function determineCameraPreset(step, parsedData, geoType, highlightEdgeIds, problemText) {
  const text = `${step.title} ${step.content}`
  const searchText = `${text} ${problemText || ''}`
  const typeDefault = (TYPE_DEFAULTS[step.type] || TYPE_DEFAULTS.observation).cameraPreset

  // Construction with diagonal → use diagonal view
  if (step.type === 'construction' && DIAGONAL_KEYWORDS.test(searchText)) {
    return 'diagonal'
  }

  // Construction with height/vertical → use side or apex view
  if (step.type === 'construction' && HEIGHT_KEYWORDS.test(searchText)) {
    if (['pyramid', 'cone'].includes(geoType)) return 'apex'
    return 'side'
  }

  // Looking at base
  if (/底面/.test(searchText) && !/顶面/.test(searchText)) {
    return 'base'
  }

  // Looking at top
  if (/顶面/.test(searchText) && !/底面/.test(searchText)) {
    return 'top'
  }

  // Section view
  if (/截面/.test(searchText)) {
    return 'front'
  }

  // Skew lines → diagonal for 3D perspective
  if (SKEW_KEYWORDS.test(searchText)) {
    return 'diagonal'
  }

  // Specific calculation → close up
  if (step.type === 'calculation' && highlightEdgeIds.length > 0) {
    return 'closeUp'
  }

  // Observation of apex geometries
  if (step.type === 'observation' && ['pyramid', 'cone'].includes(geoType)) {
    return 'overview'
  }

  // Sphere → front-ish for better circle visibility
  if (geoType === 'sphere') {
    return typeDefault
  }

  return typeDefault
}

// ── Default intent (no step selected yet) ────────────

function defaultIntent() {
  return {
    highlightEdgeIds: [],
    highlightColor: '#4A90E2',
    auxLines: [],
    cameraPreset: 'overview',
    faceOpacity: 0.42,
    nonHighlightOpacity: 1.0,
  }
}

// ── Camera preset → position mapping ─────────────────

/**
 * Get camera position for a given preset and geometry type.
 * Tweaks positions slightly based on geometry size.
 */
export function getCameraPosition(preset, geoType = 'cube') {
  const base = CAMERA_PRESETS[preset] || CAMERA_PRESETS.overview

  // Adjust for specific geometry types
  if (geoType === 'pyramid' && preset === 'overview') {
    return [4, 2.5, 4]
  }
  if (geoType === 'cone' && preset === 'overview') {
    return [3, 3, 4]
  }
  if (geoType === 'sphere' && preset === 'overview') {
    return [0, 4, 0.1]
  }
  if ((geoType === 'cylinder' || geoType === 'circularFrustum') && preset === 'overview') {
    return [3, 2.5, 4]
  }

  return base
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
