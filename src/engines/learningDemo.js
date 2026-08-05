/**
 * 学习演示统一层 — 高考基础板块 + 后续全学科扩展
 *
 * 四段式：setup → formula → plug → done
 * 对应教学节奏：认题型/图形 → 列公式 → 代入/构造 → 结论
 */

/** @typedef {'setup'|'formula'|'plug'|'done'} LearningPhase */

export const LEARNING_PHASE_ORDER = Object.freeze(['setup', 'formula', 'plug', 'done'])

/** 高考数学基础四板块（P0） */
export const GAOKAO_BASIC_TRACKS = Object.freeze({
  geometry: {
    id: 'geometry',
    label: '立体几何',
    phases: ['认图形', '列公式', '画辅助线', '得结论'],
  },
  combo: {
    id: 'combo',
    label: '排列组合/概率',
    phases: ['认题型', '列公式', '分步计数', '得结论'],
  },
  derivative: {
    id: 'derivative',
    label: '导数',
    phases: ['认函数', '列公式', '代入计算', '得结论'],
  },
  conic: {
    id: 'conic',
    label: '圆锥曲线',
    phases: ['认曲线', '读 a/b/c', '代入关系', '得结论'],
  },
})

/** 物理等扩展板块 — 同一套四段式 */
export const EXTENDED_TRACKS = Object.freeze({
  physics: {
    id: 'physics',
    label: '物理',
    phases: ['认物理量', '列公式', '代入运动', '得结论'],
  },
})

/**
 * @param {number} stepIndex
 * @param {number} [totalSteps]
 * @returns {LearningPhase}
 */
export function stepToLearningPhase(stepIndex, totalSteps = 4) {
  const n = Math.max(1, Number(totalSteps) || 4)
  const i = Math.max(0, Number(stepIndex) || 0)
  if (n <= 4) {
    return LEARNING_PHASE_ORDER[Math.min(i, 3)]
  }
  const ratio = n > 1 ? i / (n - 1) : 0
  if (ratio <= 0.28) return 'setup'
  if (ratio <= 0.58) return 'formula'
  if (ratio <= 0.86) return 'plug'
  return 'done'
}

/**
 * @param {LearningPhase} phase
 */
export function isMotionPhase(phase) {
  return phase === 'plug' || phase === 'done'
}

/**
 * @param {string} subjectOrTopic
 */
export function resolveLearningTrack(subjectOrTopic) {
  const s = String(subjectOrTopic || 'geometry')
  if (s === 'combo') return 'combo'
  if (s === 'derivative') return 'derivative'
  if (s === 'conic') return 'conic'
  if (s.startsWith('phys_')) return 'physics'
  return 'geometry'
}

/**
 * @param {string} trackId
 * @param {LearningPhase} phase
 */
export function getPhaseLabel(trackId, phase) {
  const track =
    GAOKAO_BASIC_TRACKS[trackId] || EXTENDED_TRACKS[trackId] || GAOKAO_BASIC_TRACKS.geometry
  const idx = LEARNING_PHASE_ORDER.indexOf(phase)
  return track.phases[idx >= 0 ? idx : 0]
}

/**
 * @param {LearningPhase} phase
 */
export function phaseFlags(phase) {
  return {
    phase,
    showFormula: phase !== 'setup',
    showAnswer: phase === 'done',
    playing: isMotionPhase(phase),
  }
}

/**
 * @param {number} stepIndex
 * @param {number} totalSteps
 * @param {string} trackId
 */
export function getStepLearningMeta(stepIndex, totalSteps, trackId) {
  const phase = stepToLearningPhase(stepIndex, totalSteps)
  return {
    ...phaseFlags(phase),
    phaseLabel: getPhaseLabel(trackId, phase),
    trackId,
  }
}
