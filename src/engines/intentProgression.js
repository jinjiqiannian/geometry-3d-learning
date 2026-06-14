// ═══════════════════════════════════════════════════════
//  IntentProgression — 步骤递进步谱约束
//
//  核心原则：每一步只能增加信息，不能提前剧透。
//
//  步谱:
//    Step 1 (conceptual):     原始几何体，无高亮，无辅助线
//    Step 2 (conceptual):     题目给定的已知线（A₁B, B₁C）
//    Step 3 (construction):   辅助线（平移构造线、辅助平面）
//    Step 4 (calculation):    高亮计算对象（参与计算的三角形/边）
//    Step 5 (validation):     完整结果 + 全视图
// ═══════════════════════════════════════════════════════

/**
 * 强制步骤递进约束
 *
 * @param {Object} sceneState — AI 或默认场景状态 { highlightEdgeIds, auxLines, ... }
 * @param {number} stepIndex — 步骤序号 (0-based)
 * @param {string} stepType — 'conceptual' | 'construction' | 'calculation' | 'validation'
 * @param {string[]} problemEdgeIds — 题目中提到的边 ID（内部格式）
 * @param {string} geometryType — 几何体类型
 * @returns {Object} 约束后的 sceneState
 */
export function enforceProgression(sceneState, stepIndex, stepType, problemEdgeIds = [], geometryType = 'cube') {
  if (!sceneState) return sceneState

  // 复制一份，避免修改原始对象
  const result = { ...sceneState }

  // 辅助线数组（由 construction 步骤生成）
  let allowedAuxLines = []
  if (stepType === 'construction') {
    // 构造步骤可以显示辅助线
    allowedAuxLines = sceneState.auxLines || []
  }
  result.auxLines = allowedAuxLines

  // 高亮边：根据步骤类型和序号递增
  const allowedHighlights = computeAllowedHighlights(stepIndex, stepType, problemEdgeIds)
  result.highlightEdgeIds = allowedHighlights

  // 步骤类型默认配置 — 严格渐进披露
  // Step 0: 仅显示几何体轮廓（所有边极淡），让学生先看到几何体形状
  const typeConfigs = {
    conceptual: {
      faceOpacity: stepIndex === 0 ? 0.35 : 0.38,
      nonHighlightOpacity: stepIndex === 0 ? 0.06 : 0.12,
      hideLabels: stepIndex === 0,
    },
    construction: {
      faceOpacity: 0.28,
      nonHighlightOpacity: 0.08,
      hideLabels: false,
    },
    calculation: {
      faceOpacity: 0.22,
      nonHighlightOpacity: 0.05,
      hideLabels: false,
    },
    validation: {
      faceOpacity: 0.40,
      nonHighlightOpacity: 1.0,
      hideLabels: false,
    },
  }

  const config = typeConfigs[stepType] || typeConfigs.conceptual
  if (result.faceOpacity == null) result.faceOpacity = config.faceOpacity
  if (result.nonHighlightOpacity == null) result.nonHighlightOpacity = config.nonHighlightOpacity
  if (result.hideLabels == null) result.hideLabels = config.hideLabels

  return result
}

/**
 * 根据步骤类型和序号，计算允许的高亮边
 */
function computeAllowedHighlights(stepIndex, stepType, problemEdgeIds) {
  // 第一步（index 0）始终无高亮
  if (stepIndex <= 0) return []

  switch (stepType) {
    case 'conceptual': {
      // conceptual 步骤（概念理解）：可以显示题目已知线
      if (stepIndex >= 1) {
        return problemEdgeIds
      }
      return []
    }

    case 'construction': {
      // 构造步骤：不显示高亮边（只显示辅助线）
      return []
    }

    case 'calculation': {
      // 计算步骤：高亮计算涉及的边
      return problemEdgeIds
    }

    case 'validation': {
      // 验证步骤：显示所有相关边
      return problemEdgeIds
    }

    default:
      return []
  }
}

/**
 * 从步骤列表中推导"题目已知边"
 * 收集在 conceptual/calculation 类型步骤中提到的边
 *
 * @param {Array} steps — 步骤列表
 * @returns {string[]} 去重的边 ID 列表
 */
export function deriveProblemEdges(steps) {
  if (!steps || steps.length === 0) return []

  const edges = new Set()

  for (const step of steps) {
    if (step.type === 'conceptual' || step.type === 'calculation') {
      // 从步骤文本中提取边引用
      const text = `${step.title} ${step.content}`
      const matches = text.match(/[A-Z]'?[A-Z]'?/g) || []
      matches.forEach(m => edges.add(m))
    }
  }

  return [...edges]
}

/**
 * 验证步骤序列是否符合递进原则
 * 用于调试和测试
 */
export function validateProgression(steps) {
  if (!steps || steps.length === 0) return { valid: true, warnings: [] }

  const warnings = []
  const seenTypes = new Set()

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    // 检查类型顺序
    if (step.type === 'validation' && i < steps.length - 1) {
      warnings.push(`步骤 ${i + 1} 是 conclusion 类型，但后面还有步骤`)
    }

    // 检查第一步不是结论
    if (i === 0 && step.type === 'validation') {
      warnings.push('第一步不能是 conclusion 类型')
    }

    seenTypes.add(step.type)
  }

  return { valid: warnings.length === 0, warnings }
}
