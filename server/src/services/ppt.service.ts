// ═══════════════════════════════════════════════════════
//  PPT Service — 服务端 PPT 生成（基于 pptxgenjs）
// ═══════════════════════════════════════════════════════
import PptxGenJS from 'pptxgenjs'
import type { Workspace, PPTExportOptions } from '../types/index.js'
import { getWorkspace } from './workspace.service.js'

interface PPTGenerationResult {
  buffer: Buffer
  fileName: string
}

/**
 * 生成 PPT 并返回二进制 buffer
 */
export async function generatePPTBuffer(
  options: PPTExportOptions,
  userId?: string
): Promise<PPTGenerationResult> {
  // Load workspace
  const workspace = await getWorkspace(options.workspaceId, userId)
  if (!workspace) {
    throw new Error('Workspace not found')
  }

  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'CUSTOM', width: 13.333, height: 7.5 })
  pptx.layout = 'CUSTOM'

  const template = options.template || 'default'
  const isClassroom = template === 'classroom'

  // ── Slide 1: Cover ──────────────────────────────
  const slide1 = pptx.addSlide()
  // Background gradient (approximate with shapes)
  slide1.background = { color: '1a1a2e' }

  // MathViz logo text
  slide1.addText('📐 MathViz', {
    x: 0.5, y: 0.4, w: 3, h: 0.6,
    fontSize: 14, color: '4A90E2', fontFace: 'Arial',
  })

  // Title
  slide1.addText(isClassroom ? '数学课堂教学讲义' : '数学解题可视化讲解', {
    x: 0.8, y: 2.0, w: '85%', h: 1.2,
    fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Microsoft YaHei',
  })

  // Problem text
  slide1.addText(workspace.problem_text, {
    x: 1.2, y: 3.5, w: '80%', h: 1.5,
    fontSize: 18, color: 'CCCCCC', fontFace: 'Microsoft YaHei',
  })

  // Teacher/School info
  if (options.teacherName) {
    slide1.addText(`授课教师：${options.teacherName}`, {
      x: 0.8, y: 5.5, w: 5, h: 0.5,
      fontSize: 12, color: '999999',
    })
  }
  if (options.schoolName) {
    slide1.addText(options.schoolName, {
      x: 0.8, y: 6.0, w: 5, h: 0.5,
      fontSize: 12, color: '999999',
    })
  }

  // Date
  slide1.addText(new Date().toLocaleDateString('zh-CN'), {
    x: 9, y: 5.5, w: 3, h: 0.5,
    fontSize: 11, color: '999999', align: 'right',
  })

  // ── Slide 2: 3D Model Screenshot ────────────────
  const slide2 = pptx.addSlide()
  slide2.background = { color: 'F5F7FA' }

  slide2.addText('3D 几何模型', {
    x: 0.5, y: 0.3, w: 5, h: 0.6,
    fontSize: 20, bold: true, color: '2c3e50', fontFace: 'Microsoft YaHei',
  })

  // Geometry info
  const geoType = workspace.geometry?.type || workspace.parsed_data?.type || 'unknown'
  const geoName = geometryNames[geoType] || geoType
  slide2.addText(`${geoName} · ${workspace.parsed_data?.explanation || ''}`, {
    x: 0.5, y: 0.9, w: 10, h: 0.5,
    fontSize: 13, color: '666666',
  })

  // Screenshot placeholder
  if (options.screenshotBase64) {
    try {
      const base64Data = options.screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
      slide2.addImage({
        data: `data:image/png;base64,${base64Data}`,
        x: 1.5, y: 1.6, w: 10, h: 5.2,
        sizing: { type: 'contain', w: 10, h: 5.2 },
      })
    } catch {
      slide2.addText('[3D 模型截图]', {
        x: 3, y: 3, w: 7, h: 2,
        fontSize: 18, color: 'CCCCCC', align: 'center',
      })
    }
  } else {
    slide2.addText('[3D 模型截图区域]\n导出时自动捕获', {
      x: 3, y: 3, w: 7, h: 2,
      fontSize: 18, color: 'CCCCCC', align: 'center',
    })
  }

  // ── Slide 3: Annotations ────────────────────────
  const slide3 = pptx.addSlide()
  slide3.background = { color: 'FFFFFF' }

  slide3.addText('关键标注', {
    x: 0.5, y: 0.3, w: 5, h: 0.6,
    fontSize: 20, bold: true, color: '2c3e50', fontFace: 'Microsoft YaHei',
  })

  const labels = workspace.parsed_data?.labels || []
  const highlightLines = workspace.parsed_data?.highlightLines || []

  if (labels.length > 0) {
    slide3.addText(`顶点：${labels.join(', ')}`, {
      x: 0.5, y: 1.2, w: 12, h: 0.4,
      fontSize: 14, color: '333333',
    })
  }

  if (highlightLines.length > 0) {
    slide3.addText('关键线段：', {
      x: 0.5, y: 1.8, w: 3, h: 0.4,
      fontSize: 14, bold: true, color: '333333',
    })
    highlightLines.forEach((line: any, i: number) => {
      slide3.addText(`${line.label || `${line.from}${line.to}`} — ${line.reason || ''}`, {
        x: 1.0, y: 2.3 + i * 0.5, w: 10, h: 0.4,
        fontSize: 13, color: 'E53935',
      })
    })
  }

  // ── Slide 4: Solution Steps ─────────────────────
  const steps = workspace.steps || []
  const showSteps = steps.slice(0, 5) // Max 5 steps on one slide

  if (showSteps.length > 0) {
    const slide4 = pptx.addSlide()
    slide4.background = { color: 'FFFFFF' }

    slide4.addText('解题步骤', {
      x: 0.5, y: 0.3, w: 5, h: 0.6,
      fontSize: 20, bold: true, color: '2c3e50', fontFace: 'Microsoft YaHei',
    })

    const stepColors: Record<string, string> = {
      observation: '4A90E2',
      construction: '43A047',
      calculation: 'FB8C00',
      conclusion: '8E24AA',
    }

    showSteps.forEach((step: any, i: number) => {
      const y = 1.2 + i * 1.15
      const color = stepColors[step.type] || '4A90E2'

      // Step number badge
      slide4.addShape(pptx.ShapeType.rect, {
        x: 0.5, y, w: 0.5, h: 0.4,
        fill: { color },
        rectRadius: 0.05,
      })
      slide4.addText(`${step.step || i + 1}`, {
        x: 0.5, y, w: 0.5, h: 0.4,
        fontSize: 11, color: 'FFFFFF', align: 'center', bold: true,
      })

      // Step title
      slide4.addText(step.title || `步骤 ${i + 1}`, {
        x: 1.2, y, w: 3, h: 0.4,
        fontSize: 13, bold: true, color, fontFace: 'Microsoft YaHei',
      })

      // Step content
      slide4.addText(step.content || '', {
        x: 1.2, y: y + 0.35, w: 10.5, h: 0.6,
        fontSize: 11, color: '555555', fontFace: 'Microsoft YaHei',
      })

      // Narration (if included)
      if (options.includeNarration) {
        slide4.addText('📢 讲稿：结合3D模型演示，引导学生观察', {
          x: 1.2, y: y + 0.8, w: 10.5, h: 0.3,
          fontSize: 9, color: '999999', italic: true,
        })
      }
    })

    // If more than 5 steps, add another slide
    if (steps.length > 5) {
      const slide4b = pptx.addSlide()
      slide4b.background = { color: 'FFFFFF' }
      slide4b.addText('解题步骤（续）', {
        x: 0.5, y: 0.3, w: 5, h: 0.6,
        fontSize: 20, bold: true, color: '2c3e50', fontFace: 'Microsoft YaHei',
      })

      steps.slice(5, 10).forEach((step: any, i: number) => {
        const y = 1.2 + i * 1.15
        const color = stepColors[step.type] || '4A90E2'
        slide4b.addShape(pptx.ShapeType.rect, {
          x: 0.5, y, w: 0.5, h: 0.4,
          fill: { color }, rectRadius: 0.05,
        })
        slide4b.addText(`${step.step || i + 6}`, {
          x: 0.5, y, w: 0.5, h: 0.4,
          fontSize: 11, color: 'FFFFFF', align: 'center', bold: true,
        })
        slide4b.addText(step.title || '', {
          x: 1.2, y, w: 3, h: 0.4,
          fontSize: 13, bold: true, color,
        })
        slide4b.addText(step.content || '', {
          x: 1.2, y: y + 0.35, w: 10.5, h: 0.6,
          fontSize: 11, color: '555555',
        })
      })
    }
  }

  // ── Slide 5: Summary ────────────────────────────
  const slide5 = pptx.addSlide()
  slide5.background = { color: '1a1a2e' }

  slide5.addText('总结', {
    x: 0.8, y: 1.5, w: 5, h: 0.8,
    fontSize: 28, bold: true, color: 'FFFFFF', fontFace: 'Microsoft YaHei',
  })

  // Last step content as conclusion
  const lastStep = steps[steps.length - 1]
  if (lastStep) {
    slide5.addText(lastStep.content || '', {
      x: 1.2, y: 2.8, w: 10, h: 1.5,
      fontSize: 16, color: 'CCCCCC', fontFace: 'Microsoft YaHei',
    })
  }

  // Key formula / result
  slide5.addText('方法小结：空间几何问题的关键是建立正确的空间直角坐标系，将几何关系转化为代数运算。', {
    x: 1.2, y: 4.5, w: 10, h: 1,
    fontSize: 13, color: '999999', fontFace: 'Microsoft YaHei',
  })

  // Footer
  slide5.addText('由 MathViz AI 生成 · mathviz.ai', {
    x: 0.8, y: 6.5, w: 5, h: 0.4,
    fontSize: 10, color: '666666',
  })

  // ── Generate buffer ──────────────────────────────
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer

  const fileName = `MathViz-${workspace.title || '讲解'}.pptx`

  return { buffer, fileName }
}

const geometryNames: Record<string, string> = {
  cube: '正方体',
  cuboid: '长方体',
  sphere: '球体',
  cylinder: '圆柱',
  cone: '圆锥',
  pyramid: '棱锥',
  prism: '棱柱',
  squareFrustum: '四棱台',
  circularFrustum: '圆台',
}
