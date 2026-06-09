// ═══════════════════════════════════════════════════════
//  PPT 导出引擎 — 浏览器端生成 .pptx (PptxGenJS)
// ═══════════════════════════════════════════════════════
import PptxGenJS from 'pptxgenjs'

/**
 * 截取 Canvas 元素为 base64 图片
 * @param {HTMLElement} canvasElement - 3D Canvas 的 DOM 元素
 * @returns {Promise<string>} base64 data URL
 */
async function captureCanvas(canvasElement) {
  // Try html-to-image if available
  try {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(canvasElement, { pixelRatio: 2, backgroundColor: '#f8f9fb' })
    return dataUrl
  } catch {
    // Fallback: try native canvas.toDataURL
    const canvas = canvasElement?.querySelector('canvas')
    if (canvas) {
      return canvas.toDataURL('image/png')
    }
    throw new Error('无法截取 Canvas 图片')
  }
}

const PPT_THEME = {
  primary: '2c3e50',
  secondary: '666666',
  accent: '4A90E2',
  light: 'f8f9fb',
  white: 'FFFFFF',
}

/**
 * 生成 PPT 并触发下载
 * @param {Object} workspace - workspace 数据 { problemText, steps, parsedData, geometry }
 * @param {HTMLElement} canvasElement - 3D Canvas DOM 元素
 * @returns {Promise<void>}
 */
export async function generatePPT(workspace, canvasElement) {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'CUSTOM', width: '13.333', height: '7.5' })
  pptx.layout = 'CUSTOM'

  const { problemText = '', steps = [], parsedData = {} } = workspace

  // ── Slide 1: 封面 ──────────────────────────────
  const slide1 = pptx.addSlide()
  slide1.background = { color: PPT_THEME.light }
  slide1.addText('数学解题可视化讲解', {
    x: 0.8, y: 1.5, w: '80%', h: 1.2,
    fontSize: 36, bold: true, color: PPT_THEME.primary, fontFace: 'Microsoft YaHei',
  })
  slide1.addText(problemText || '几何体题目', {
    x: 1.2, y: 3.0, w: '80%', h: 1.5,
    fontSize: 20, color: PPT_THEME.secondary, fontFace: 'Microsoft YaHei',
  })
  slide1.addText('由 几何维度 AI 生成', {
    x: 0.8, y: 6.0, w: '40%', h: 0.5,
    fontSize: 11, color: PPT_THEME.accent, fontFace: 'Microsoft YaHei',
  })

  // ── Slide 2: 3D 模型截图 ────────────────────────
  const slide2 = pptx.addSlide()
  slide2.background = { color: PPT_THEME.white }
  slide2.addText('3D 几何模型', {
    x: 0.5, y: 0.4, w: '80%', h: 0.7,
    fontSize: 24, bold: true, color: PPT_THEME.primary, fontFace: 'Microsoft YaHei',
  })

  try {
    const screenshot = await captureCanvas(canvasElement)
    slide2.addImage({
      data: screenshot,
      x: 0.5, y: 1.3, w: 8.5, h: 5.5,
      sizing: { type: 'contain', w: 8.5, h: 5.5 },
    })
  } catch {
    slide2.addText('(3D 模型截图)', {
      x: 2, y: 3, w: 9, h: 2,
      fontSize: 16, color: PPT_THEME.secondary,
    })
  }

  if (parsedData.type) {
    slide2.addText(`几何体: ${parsedData.type}  |  大小: ${parsedData.size || 'N/A'}`, {
      x: 9.5, y: 1.5, w: 3.5, h: 3,
      fontSize: 12, color: PPT_THEME.secondary, fontFace: 'Microsoft YaHei',
    })
  }

  // ── Slide 3: 对象标注 ───────────────────────────
  const slide3 = pptx.addSlide()
  slide3.background = { color: PPT_THEME.white }
  slide3.addText('关键对象标注', {
    x: 0.5, y: 0.4, w: '80%', h: 0.7,
    fontSize: 24, bold: true, color: PPT_THEME.primary, fontFace: 'Microsoft YaHei',
  })

  const labels = parsedData.labels || []
  const highlights = parsedData.highlightLines || []
  const items = [
    ...labels.slice(0, 8).map(l => `顶点: ${l}`),
    ...highlights.map(h => `关键线段: ${h.label || h.from + h.to} — ${h.reason || ''}`),
  ]
  slide3.addText(items.length > 0 ? items.join('\n') : '(标注信息)', {
    x: 1, y: 1.5, w: 11, h: 5,
    fontSize: 14, color: PPT_THEME.secondary, fontFace: 'Microsoft YaHei',
    lineSpacing: 28,
  })

  // ── Slide 4: 解题步骤 ───────────────────────────
  const slide4 = pptx.addSlide()
  slide4.background = { color: PPT_THEME.white }
  slide4.addText('解题步骤', {
    x: 0.5, y: 0.4, w: '80%', h: 0.7,
    fontSize: 24, bold: true, color: PPT_THEME.primary, fontFace: 'Microsoft YaHei',
  })

  const stepsText = steps.slice(0, 5).map(s =>
    `步骤 ${s.step}: ${s.title}\n${s.content}`
  )
  slide4.addText(stepsText.join('\n\n') || '(解题步骤)', {
    x: 1, y: 1.3, w: 11, h: 5.5,
    fontSize: 12, color: PPT_THEME.secondary, fontFace: 'Microsoft YaHei',
    lineSpacing: 20,
    valign: 'top',
  })

  // ── Slide 5: 总结 ──────────────────────────────
  const slide5 = pptx.addSlide()
  slide5.background = { color: PPT_THEME.light }
  slide5.addText('总结', {
    x: 0.5, y: 1.5, w: '90%', h: 1,
    fontSize: 32, bold: true, color: PPT_THEME.primary, fontFace: 'Microsoft YaHei',
    align: 'center',
  })

  const lastStep = steps[steps.length - 1]
  if (lastStep) {
    slide5.addText(`最终结论: ${lastStep.content}`, {
      x: 2, y: 3.0, w: '70%', h: 2,
      fontSize: 18, color: PPT_THEME.secondary, fontFace: 'Microsoft YaHei',
      align: 'center',
    })
  }

  slide5.addText('由 几何维度 AI 生成 · jihewedu.cn', {
    x: 0, y: 6.5, w: '100%', h: 0.5,
    fontSize: 10, color: PPT_THEME.accent, fontFace: 'Microsoft YaHei',
    align: 'center',
  })

  // ── 下载 ────────────────────────────────────────
  const fileName = `几何维度-${(problemText || '讲解').slice(0, 30)}.pptx`
  await pptx.writeFile({ fileName })
}
