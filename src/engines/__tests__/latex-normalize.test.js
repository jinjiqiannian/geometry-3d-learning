import { describe, it, expect } from 'vitest'
import { normalizeLatexForDisplay } from '../problemParser'

/**
 * 回归：OCR 模型经常把 \overrightarrow 输出成 overrightarrow ——
 * 反斜杠在 JSON 转义里丢了。原实现的正则强制要求反斜杠，于是不仅
 * 转换失效，后续步骤还会把花括号剥掉，学生看到的是
 * overrightarrowAB' 这种半截 LaTeX，比不转换更糟。
 *
 * 现在反斜杠是可选的：两种写法都必须转成 →XX（MathText 再渲染成上箭头）。
 */
describe('normalizeLatexForDisplay 对向量写法要容错', () => {
  it('标准 LaTeX（带反斜杠）', () => {
    expect(normalizeLatexForDisplay('$\\overrightarrow{AA\'} \\cdot \\overrightarrow{AB}$'))
      .toBe("→AA' · →AB")
    expect(normalizeLatexForDisplay('\\vec{AB}')).toBe('→AB')
  })

  it('反斜杠丢失（线上实际输出）也要转对', () => {
    expect(normalizeLatexForDisplay("overrightarrow{AB'}")).toBe("→AB'")
    expect(normalizeLatexForDisplay('vec{AB}')).toBe('→AB')
    expect(
      normalizeLatexForDisplay("(1) overrightarrow{AA'} · overrightarrow{AB};"),
    ).toBe("(1) →AA' · →AB;")
  })

  it('转换后不得残留命令名或花括号', () => {
    for (const raw of [
      '\\overrightarrow{AB}',
      'overrightarrow{AB}',
      '\\vec{AB}',
      'vec{AB}',
    ]) {
      const out = normalizeLatexForDisplay(raw)
      expect(out, `输入 ${raw} 输出 ${out}`).not.toMatch(/overrightarrow|vec\{|[{}]/)
    }
  })

  it('其他命令同样容错', () => {
    expect(normalizeLatexForDisplay('frac{1}{2}')).toBe('1/2')
    expect(normalizeLatexForDisplay('sqrt{3}')).toBe('√3')
    expect(normalizeLatexForDisplay('overline{AB}')).toMatch(/AB/)
  })
})
