// ═══════════════════════════════════════════════════════
//  SceneIRBuilder — 确定性场景中间表示构造器
//
//  职责：
//  1. buildBaseSceneIR() — 从几何体模板生成基准场景（第 0 步）
//  2. applyStepToSceneIR() — 应用步骤的渐进约束 + sceneOps → 该步 SceneIR
//  3. 所有 SceneIR 是纯数据，可序列化为 JSON，用于持久化和回放
//
//  数据流：
//    buildBaseSceneIR → SceneIR[0]
//    SceneIR[n-1] + step[n] + sceneOps → SceneIR[n]
// ═══════════════════════════════════════════════════════

import { getScaledTemplate } from './sceneIRTemplate'

// ── 步骤类型 Progressive Disclosure 配置 ──────────

const PROGRESSION_CONFIG = {
  conceptual: {
    faceOpacity: 0.38,
    nonHighlightOpacity: 0.12,
    showLabels: true,
    allowHighlights: true,
    allowAuxLines: false,
  },
  construction: {
    faceOpacity: 0.28,
    nonHighlightOpacity: 0.08,
    showLabels: true,
    allowHighlights: false,
    allowAuxLines: true,
  },
  calculation: {
    faceOpacity: 0.22,
    nonHighlightOpacity: 0.05,
    showLabels: true,
    allowHighlights: true,
    allowAuxLines: false,
  },
  validation: {
    faceOpacity: 0.40,
    nonHighlightOpacity: 1.0,
    showLabels: true,
    allowHighlights: true,
    allowAuxLines: false,
  },
}

const STEP_ZERO_CONFIG = {
  faceOpacity: 0.35,
  nonHighlightOpacity: 0.06,
  showLabels: false,
  allowHighlights: false,
  allowAuxLines: false,
}

// ── 工具函数 ──────────────────────────────────────

function edgeId(a, b) {
  return a < b ? a + b : b + a
}

// ── 核心 API ──────────────────────────────────────

/**
 * 从几何体模板生成基准 SceneIR（第 0 步：无高亮、无辅助线）
 * @param {string} type - 几何体类型 (cube/cuboid/...)
 * @param {{size?: number}} [params]
 * @param {string[]} [userLabels] - 自定义标签
 * @returns {SceneIR}
 */
export function buildBaseSceneIR(type, params, userLabels) {
  const tpl = getScaledTemplate(type, params || {}, userLabels)

  // 构建 Points
  const points = tpl.vertices.map((pos, i) => ({
    id: tpl.labels[i] || 'V' + i,
    label: tpl.labels[i] || 'V' + i,
    position: pos,
    visible: true,
  }))

  // 构建 Lines（从模板 lines 定义）
  const lines = tpl.lines.map(line => ({
    id: line.id,
    from: tpl.labels[line.from] || 'V' + line.from,
    to: tpl.labels[line.to] || 'V' + line.to,
    category: line.category,
    dashed: line.dashed || false,
    visible: true,
    highlighted: false,
  }))

  // 构建 Faces
  const faces = tpl.faces.length > 0
    ? tpl.faces.map((face, i) => ({
        id: 'face_' + i,
        vertices: face.vertices.map(vi => tpl.labels[vi] || 'V' + vi),
        opacity: 0.35,
        visible: true,
        color: face.color,
      }))
    : undefined

  return {
    points,
    lines,
    faces,
    labelVisibility: {},
  }
}

/**
 * 应用步骤到 SceneIR，生成该步的确定性场景快照
 *
 * @param {number} stepIndex - 0-based 步骤索引
 * @param {string} stepType - 步骤类型
 * @param {SceneOps} [sceneOps] - 步骤的场景操作指令
 * @param {SceneIR} [baseIR] - 基准 SceneIR（来自 buildBaseSceneIR）
 * @returns {SceneIR} 该步骤的 SceneIR 快照
 */
export function applyStepToSceneIR(stepIndex, stepType, sceneOps, baseIR) {
  // 如果没有 baseIR，返回空 SceneIR
  if (!baseIR) {
    return { points: [], lines: [] }
  }

  // 深拷贝基准 IR（避免修改原始数据）
  const ir = JSON.parse(JSON.stringify(baseIR))

  // Step 0 特殊处理：只显示轮廓
  if (stepIndex === 0) {
    const cfg = STEP_ZERO_CONFIG
    ir.points.forEach(p => { p.visible = false })
    ir.lines.forEach(l => {
      l.visible = true
      l.highlighted = false
    })
    if (ir.faces) {
      ir.faces.forEach(f => { f.opacity = cfg.faceOpacity })
    }
    ir.labelVisibility = {}
    return ir
  }

  // 获取 stepType 配置
  const cfg = PROGRESSION_CONFIG[stepType] || PROGRESSION_CONFIG.conceptual

  // ── 应用渐进约束 ──

  // 1. 面透明度
  if (ir.faces) {
    ir.faces.forEach(f => { f.opacity = cfg.faceOpacity })
  }

  // 2. 标签可见性
  ir.points.forEach(p => {
    p.visible = cfg.showLabels
  })
  if (ir.labelVisibility) {
    ir.labelVisibility = {}
    if (cfg.showLabels) {
      ir.points.forEach(p => {
        ir.labelVisibility[p.id] = true
      })
    }
  }

  // 3. 线段高亮和可见性
  ir.lines.forEach(l => {
    l.highlighted = false
    l.visible = true
  })

  // ── 应用 sceneOps（如果存在）──

  if (sceneOps) {
    // 高亮指定线段
    if (sceneOps.highlightLines && cfg.allowHighlights) {
      const hlSet = new Set(sceneOps.highlightLines.map(id => id.toUpperCase()))
      ir.lines.forEach(l => {
        if (hlSet.has(l.id.toUpperCase())) {
          l.highlighted = true
        }
      })
    }

    // 添加辅助线
    if (sceneOps.addAuxLines && cfg.allowAuxLines) {
      for (const aux of sceneOps.addAuxLines) {
        const auxId = edgeId(aux.from.pointId, aux.to.pointId)
        // 去重：如果 ID 已存在则跳过
        if (!ir.lines.some(l => l.id === auxId)) {
          ir.lines.push({
            id: auxId,
            from: aux.from.pointId,
            to: aux.to.pointId,
            category: '辅助线',
            dashed: aux.dashed !== false,
            color: aux.color || '#8b5cf6',
            visible: true,
            highlighted: false,
          })
        }
      }
    }

    // 添加辅助点
    if (sceneOps.addAuxPoints) {
      for (const ap of sceneOps.addAuxPoints) {
        if (!ir.points.some(p => p.id === ap.id)) {
          let position = [0, 0, 0]
          if (ap.position === 'midpoint' && ap.refs.length >= 2) {
            const p1 = ir.points.find(p => p.id === ap.refs[0])
            const p2 = ir.points.find(p => p.id === ap.refs[1])
            if (p1 && p2) {
              position = [
                (p1.position[0] + p2.position[0]) / 2,
                (p1.position[1] + p2.position[1]) / 2,
                (p1.position[2] + p2.position[2]) / 2,
              ]
            }
          }
          ir.points.push({
            id: ap.id,
            label: ap.label,
            position,
            visible: true,
          })
        }
      }
    }

    // 淡化指定线段
    if (sceneOps.fadeLines) {
      const fadeSet = new Set(sceneOps.fadeLines.map(id => id.toUpperCase()))
      ir.lines.forEach(l => {
        if (fadeSet.has(l.id.toUpperCase())) {
          l.highlighted = false
          l.visible = true
        }
      })
    }

    // 设置标签可见性
    if (sceneOps.showLabels) {
      const labelSet = new Set(sceneOps.showLabels)
      ir.points.forEach(p => {
        p.visible = labelSet.has(p.id)
      })
      if (ir.labelVisibility) {
        ir.points.forEach(p => {
          ir.labelVisibility[p.id] = labelSet.has(p.id)
        })
      }
    }

    // 平面高亮（转换为 SceneSection）
    if (sceneOps.planeHighlight) {
      if (!ir.sections) ir.sections = []
      ir.sections.push({
        id: 'section_' + ir.sections.length,
        type: 'polygon',
        points: sceneOps.planeHighlight.vertices,
        visible: true,
      })
    }

    // 截面
    if (sceneOps.sectionCut) {
      if (!ir.sections) ir.sections = []
      ir.sections.push({
        id: 'cut_' + ir.sections.length,
        type: 'plane',
        points: sceneOps.sectionCut.plane,
        visible: sceneOps.sectionCut.showSection !== false,
      })
    }
  }

  return ir
}

/**
 * 生成完整步骤序列的 SceneIR 数组
 * 用于批量预计算和 workspace 持久化
 * @param {string} type
 * @param {{size?: number}} params
 * @param {string[]|undefined} userLabels
 * @param {Array<{type: string, sceneOps?: SceneOps}>} steps
 * @returns {SceneIR[]}
 */
export function buildSceneIRSequence(type, params, userLabels, steps) {
  if (!steps || steps.length === 0) return []

  const baseIR = buildBaseSceneIR(type, params, userLabels)
  const sequence = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const prevIR = i === 0 ? baseIR : sequence[i - 1]
    const ir = applyStepToSceneIR(i, step.type, step.sceneOps, prevIR)
    sequence.push(ir)
  }

  return sequence
}
