/**
 * V2 ProofEngine Adapter — WorkspaceContext 层接入点
 *
 * 流程：parsedData → 结构化 seed → registerAllRules → scheduler → ProofStep[]
 * 禁止：文本硬编码结论、AP/AF 特例、用 rel.includes 做推理
 */
import { createFactRegistry } from './factRegistry.js'
import { createRuleRegistry } from './ruleRegistry.js'
import { createConstructionManager } from './construction/constructionManager.js'
import { runScheduler, SCHEDULER_STATUS } from './scheduler/scheduler.js'
import { registerAllRules } from './rules/index.js'

/** V2 fallback 阶段标识（结构化日志用） */
export const V2_FALLBACK_STAGES = {
  SEED_GATE: 'seed-gate',
  NO_PROOFSTEPS: 'no-proofsteps',
  NO_GOAL: 'no-goal',
  EXCEPTION: 'exception',
}

function isTestEnv() {
  return typeof process !== 'undefined'
    && !!process.env
    && (!!process.env.VITEST || process.env.NODE_ENV === 'test')
}

/**
 * V2 回退结构化日志 — 测试环境静默，避免污染 console
 * @param {string} stage - V2_FALLBACK_STAGES 之一
 * @param {Object} [detail] - 附加诊断信息
 */
function logV2Fallback(stage, detail = {}) {
  if (isTestEnv()) return
  console.warn('[ProofEngine V2] fallback', { stage, ...detail })
}

/**
 * 将 semantic.relations 中的结构化关系词条解析为事实。
 * 这是数据装载，不是推理。只接受固定语法：
 *   "<P> midpoint <AB>"
 *   "<P> on <AB>"
 *   "<L> parallel plane <Π>"
 *   "<L> parallel <M>"
 *   "<A> perpendicular <B>"
 */
function parseRelationToken(relation) {
  if (typeof relation !== 'string') return null
  const tokens = relation.trim().split(/\s+/)
  if (tokens.length < 3) return null

  if (tokens[1] === 'midpoint') {
    const point = tokens[0]
    const seg = tokens[2] || ''
    if (seg.length < 2) return null
    return {
      type: 'midpoint',
      subjects: [point, seg[0], seg[1]],
      description: relation,
    }
  }

  if (tokens[1] === 'on') {
    return {
      type: 'on',
      subjects: [tokens[0], tokens[2]],
      description: relation,
    }
  }

  if (tokens[1] === 'parallel' && tokens[2] === 'plane' && tokens[3]) {
    return {
      type: 'parallel',
      subjects: [tokens[0], tokens[3]],
      description: relation,
    }
  }

  if (tokens[1] === 'parallel') {
    return {
      type: 'parallel',
      subjects: [tokens[0], tokens[2]],
      description: relation,
    }
  }

  if (tokens[1] === 'perpendicular' && tokens[2] === 'plane' && tokens[3]) {
    return {
      type: 'perpendicular',
      subjects: [tokens[0], tokens[3]],
      description: relation,
    }
  }

  if (tokens[1] === 'perpendicular') {
    return {
      type: 'perpendicular',
      subjects: [tokens[0], tokens[2]],
      description: relation,
    }
  }

  return null
}

/**
 * 当 parsedData.semantic 不存在时，从已有 points/edges/planes/relations
 * 构造最小 semantic。仅做数据搬运，不做推理：
 *   - points  ← labels / vertices
 *   - edges   ← highlightLines（from/to 结构）
 *   - planes  ← parsedData.planes；缺失时从 "X parallel plane YYY" 等
 *               词条中的平面名还原（单字母顶点标签拆分）
 *   - relations ← parsedData.relations
 */
export function buildMinimalSemantic(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') return null

  const points = parsedData.labels || parsedData.vertices || []
  const relations = parsedData.relations || []

  const edges = []
  const seenEdges = new Set()
  for (const h of parsedData.highlightLines || []) {
    if (!h?.from || !h?.to) continue
    const key = h.from <= h.to ? h.from + h.to : h.to + h.from
    if (seenEdges.has(key)) continue
    seenEdges.add(key)
    edges.push({ from: h.from, to: h.to, label: h.label || h.from + h.to })
  }

  let planes = parsedData.planes || []
  if (planes.length === 0) {
    const seenPlanes = new Set()
    planes = []
    for (const rel of relations) {
      if (typeof rel !== 'string') continue
      const m = rel.match(/\bplane\s+([A-Z]{3,})\b/)
      if (!m || seenPlanes.has(m[1])) continue
      seenPlanes.add(m[1])
      planes.push({ label: m[1], points: m[1].split('') })
    }
  }

  return {
    shape: parsedData.type,
    points,
    edges,
    planes,
    relations,
  }
}

/**
 * 从 parsedData 装载初始事实（结构化字段优先）
 */
export function seedFactsFromParsedData(factRegistry, parsedData) {
  const semantic = parsedData?.semantic || {}

  if (semantic.shape || parsedData?.type) {
    factRegistry.addFact({
      type: 'shape',
      subjects: [semantic.shape || parsedData.type],
      description: `shape: ${semantic.shape || parsedData.type}`,
    })
  }

  const baseShape = semantic.baseShape || parsedData?.baseShape
  if (baseShape) {
    factRegistry.addFact({
      type: 'shape',
      subjects: [baseShape],
      description: `baseShape: ${baseShape}`,
    })
  }

  const points = semantic.points || parsedData?.vertices || parsedData?.labels || []
  for (const p of points) {
    factRegistry.addFact({ type: 'point', subjects: [p], description: `point ${p}` })
  }

  const edges = semantic.edges || []
  for (const e of edges) {
    if (!e?.from || !e?.to) continue
    factRegistry.addFact({
      type: 'line',
      subjects: [e.from, e.to],
      description: `edge ${e.label || e.from + e.to}`,
    })
  }

  const planes = [...(semantic.planes || parsedData?.planes || [])]
  const goalList = []
  if (Array.isArray(parsedData?.goals)) goalList.push(...parsedData.goals)
  else if (Array.isArray(semantic.goals)) goalList.push(...semantic.goals)
  else if (parsedData?.goal) goalList.push(parsedData.goal)
  else if (semantic.goal) goalList.push(semantic.goal)
  for (const g of goalList) {
    const plane = g?.subjects?.[1]
    if (typeof plane === 'string' && plane.length >= 3 && !planes.some((p) => (p.label || p.subjects?.join?.('')) === plane)) {
      planes.push({ label: plane, points: plane.split('') })
    }
  }

  for (const pl of planes) {
    const pts = pl.points || pl.subjects || []
    if (!pts.length) continue
    factRegistry.addFact({
      type: 'plane',
      subjects: pts,
      description: `平面 ${pl.label || pts.join('')}`,
    })
  }

  // 结构化 relations 数组（对象形式）优先
  const structured = semantic.structuredRelations || parsedData?.structuredRelations || []
  for (const rel of structured) {
    if (rel?.type && Array.isArray(rel.subjects)) {
      factRegistry.addFact({
        type: rel.type,
        subjects: rel.subjects,
        values: rel.values,
        description: rel.description || '',
      })
    }
  }

  // 词条关系（固定语法装载，不做推理）
  const relations = semantic.relations || parsedData?.relations || []
  for (const rel of relations) {
    if (typeof rel === 'object' && rel?.type && Array.isArray(rel.subjects)) {
      factRegistry.addFact({
        type: rel.type,
        subjects: rel.subjects,
        values: rel.values,
        description: rel.description || '',
      })
      continue
    }
    const parsed = parseRelationToken(rel)
    if (parsed) factRegistry.addFact(parsed)
  }

  return factRegistry
}

// 段名端点排序（与 factRegistry canonical 对齐）："PA" → "AP"
function normSeg(label) {
  if (typeof label !== 'string' || label.length !== 2) return label
  return label[0] <= label[1] ? label : label[1] + label[0]
}

/**
 * 从题目结构推断 goal（求哪些量 / 求证什么），不硬编码答案数值。
 * 无显式目标时返回 null：让 scheduler 跑到收敛，由调用方检查结论事实。
 * （禁止"任意 slash-ratio 即达成"的弱 goal —— 会被 AG/CG 等中间比例提前满足）
 */
export function buildGoal(parsedData) {
  if (typeof parsedData?.goal === 'function') return parsedData.goal
  if (parsedData?.goal?.id) return parsedData.goal

  const list = []
  if (Array.isArray(parsedData?.goals) && parsedData.goals.length) {
    list.push(...parsedData.goals)
  } else if (parsedData?.goal) {
    list.push(parsedData.goal)
  } else if (Array.isArray(parsedData?.semantic?.goals) && parsedData.semantic.goals.length) {
    list.push(...parsedData.semantic.goals)
  } else if (parsedData?.semantic?.goal) {
    list.push(parsedData.semantic.goal)
  }

  if (list.length === 0) return null

  const checkers = list.map((g) => {
    if (g?.type === 'ratio' && Array.isArray(g.subjects)) {
      const want = g.subjects.map(normSeg)
      return (factRegistry) =>
        factRegistry.getAllFacts().some((f) => {
          if (f.type !== 'ratio') return false
          const s = (f.subjects || []).map(normSeg)
          if (want.length === 1) {
            return s[0] === want[0] && (f.values || []).length > 0
          }
          return want.every((w) => s.includes(w)) && (f.values || []).length > 0
        })
    }
    if (
      (g?.type === 'perpendicular' || g?.type === 'parallel') &&
      Array.isArray(g.subjects) &&
      g.subjects.length >= 2
    ) {
      const line = normSeg(g.subjects[0])
      const plane = g.subjects[1]
      return (factRegistry) =>
        factRegistry.getAllFacts().some((f) => {
          if (f.type !== g.type) return false
          const s = f.subjects || []
          const hasLine = s.some((x) => normSeg(x) === line || x === g.subjects[0])
          const hasPlane = s.includes(plane)
          return hasLine && hasPlane
        })
    }
    return null
  }).filter(Boolean)

  if (checkers.length === 0) return null
  if (checkers.length === 1) return checkers[0]
  return (factRegistry) => checkers.every((fn) => fn(factRegistry))
}

function isProofGoal(parsedData) {
  const g = parsedData?.goal || parsedData?.semantic?.goal
  const gs = parsedData?.goals || parsedData?.semantic?.goals
  if (Array.isArray(gs) && gs.some((x) => x?.type === 'perpendicular' || x?.type === 'parallel')) {
    return true
  }
  return g?.type === 'perpendicular' || g?.type === 'parallel'
}

function toProofSteps(steps) {
  return (steps || []).map((s, i) => ({
    step: i + 1,
    title: s.title || '',
    content: s.content || '',
    type: s.type || 'inference',
    formula: s.formula || '',
    rule: s.rule || '',
    premiseFactIds: s.premiseFactIds || s.premiseIds || undefined,
    conclusionFactId: s.conclusionFactId || s.conclusionId || undefined,
    constructionObjects: s.constructionObjects || undefined,
  }))
}

/**
 * @param {Object} parsedData — 来自 problemParser 的解析结果
 * @returns {Object[]|null} ProofStep[] 或 null（失败时回退 V1）
 */
export function tryV2Proof(parsedData) {
  try {
    if (!parsedData || typeof parsedData !== 'object') {
      logV2Fallback(V2_FALLBACK_STAGES.SEED_GATE, { reason: 'parsedData missing' })
      return null
    }

    // semantic 缺失时从已有结构化字段构造最小 semantic（真实用户流程）
    const semantic = parsedData.semantic || buildMinimalSemantic(parsedData)
    if (!semantic) {
      logV2Fallback(V2_FALLBACK_STAGES.SEED_GATE, { reason: 'semantic unavailable' })
      return null
    }
    const normalized = {
      ...(parsedData.semantic ? parsedData : { ...parsedData, semantic }),
      semantic,
      goal: parsedData.goal || semantic.goal,
      goals: parsedData.goals || semantic.goals,
      baseShape: parsedData.baseShape || semantic.baseShape,
      relations: parsedData.relations || semantic.relations,
    }

    const hasRelations =
      (semantic.relations && semantic.relations.length > 0)
      || (normalized.relations && normalized.relations.length > 0)
      || (semantic.structuredRelations && semantic.structuredRelations.length > 0)
    if (!hasRelations) {
      logV2Fallback(V2_FALLBACK_STAGES.SEED_GATE, { reason: 'no relations to seed', type: normalized.type })
      return null
    }

    const factRegistry = createFactRegistry()
    const ruleRegistry = createRuleRegistry()
    const constructionManager = createConstructionManager()
    constructionManager.setFactRegistry(factRegistry)
    constructionManager.setRuleRegistry(ruleRegistry)
    registerAllRules(ruleRegistry)

    seedFactsFromParsedData(factRegistry, normalized)

    const goal = buildGoal(normalized)
    const result = runScheduler({
      factRegistry,
      ruleRegistry,
      constructionManager,
      goal,
      maxRounds: 15,
    })

    if (!result.proofSteps || result.proofSteps.length === 0) {
      logV2Fallback(V2_FALLBACK_STAGES.NO_PROOFSTEPS, {
        status: result.status,
        rounds: result.rounds,
        factCount: (result.facts || []).length,
      })
      return null
    }

    // GOAL_REACHED：完整成功
    if (result.status === SCHEDULER_STATUS.GOAL_REACHED) {
      let steps = result.proofSteps
      // 求证题压缩展示：只保留判定链关键步骤，去掉平面归属/交线噪声
      if (isProofGoal(normalized)) {
        const keep = new Set([
          'diagonal_bisect',
          'rhombus_diagonals_perpendicular',
          'line_perp_plane_property',
          'line_perp_plane_criterion',
          'triangle_midsegment',
          'line_parallel_plane_criterion',
        ])
        const filtered = steps.filter((s) => keep.has(s.rule))
        if (filtered.length > 0) steps = filtered
      }
      return toProofSteps(steps)
    }

    // 求证题禁止用中间比例冒充成功
    if (isProofGoal(normalized)) {
      logV2Fallback(V2_FALLBACK_STAGES.NO_GOAL, {
        status: result.status,
        rounds: result.rounds,
        proofStepCount: result.proofSteps.length,
        reason: 'proof goal not reached',
      })
      return null
    }

    // 若已推出带数值的 slash-ratio，也视为可用（goal 未配置时）
    const hasRatioConclusion = result.facts.some((f) =>
      f.type === 'ratio'
      && Array.isArray(f.subjects)
      && f.subjects.length === 1
      && String(f.subjects[0]).includes('/')
      && (f.values || []).length > 0
    )
    if (hasRatioConclusion) {
      return toProofSteps(result.proofSteps)
    }

    logV2Fallback(V2_FALLBACK_STAGES.NO_GOAL, {
      status: result.status,
      rounds: result.rounds,
      proofStepCount: result.proofSteps.length,
    })
    return null
  } catch (e) {
    logV2Fallback(V2_FALLBACK_STAGES.EXCEPTION, { message: e?.message })
    return null
  }
}
