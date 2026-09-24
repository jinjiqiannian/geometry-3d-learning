import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import KnowledgeModel from '../KnowledgeModel'

function htmlOf(type, accent = '') {
  const { container } = render(<KnowledgeModel type={type} accent={accent} />)
  return container.innerHTML
}

function textOf(type, accent = '') {
  const { container } = render(<KnowledgeModel type={type} accent={accent} />)
  return container.textContent
}

describe('KnowledgeModel（知识点专属构图）', () => {
  it('正方体的四个知识点各自渲染不同构图，互不复用', () => {
    // 与 curriculum.js 中四个 cube 知识点实际使用的 accent 一一对应：
    // m-cube-d → diag、m-cube-s → metrics、m-space-d → coord、m-perp → perp
    const diag = htmlOf('cube', 'diag')
    const metrics = htmlOf('cube', 'metrics')
    const coord = htmlOf('cube', 'coord')
    const perp = htmlOf('cube', 'perp')
    expect(new Set([diag, metrics, coord, perp]).size).toBe(4)
  })

  it('正方体体对角线：换斜二测投影后 AG 不再是退化的一个点', () => {
    const { container } = render(<KnowledgeModel type="cube" accent="diag" />)
    const diagonal = container.querySelector('line.km-diag')
    expect(diagonal).toBeTruthy()
    const x1 = Number(diagonal.getAttribute('x1'))
    const y1 = Number(diagonal.getAttribute('y1'))
    const x2 = Number(diagonal.getAttribute('x2'))
    const y2 = Number(diagonal.getAttribute('y2'))
    // 等轴测下 A、G 会投影重合（x 与 y 都相等），这里必须都不相等
    expect(x1).not.toBe(x2)
    expect(y1).not.toBe(y2)
  })

  it('长方体体对角线同样落在真实线段上', () => {
    const { container } = render(<KnowledgeModel type="cuboid" accent="diag" />)
    const diagonal = container.querySelector('line.km-diag')
    expect(diagonal).toBeTruthy()
    expect(diagonal.getAttribute('x1')).not.toBe(diagonal.getAttribute('x2'))
  })
})

describe('KnowledgeModel（图内标注）', () => {
  it('正方体各知识点带专属公式', () => {
    const diag = textOf('cube', 'diag')
    expect(diag).toContain('AG = a√3')
    expect(diag).toContain('AF = a√2')
    expect(diag).toContain('Rt△AFG：AG² = AF² + FG²')

    const metrics = textOf('cube', 'metrics')
    expect(metrics).toContain('V = a³')
    expect(metrics).toContain('S = 6a²')

    const coord = textOf('cube', 'coord')
    expect(coord).toContain('以 A 为原点建系')
    expect(coord).toContain('G(a, a, a)')
    expect(coord).toContain('AG = √(a²+a²+a²) = a√3')

    const perp = textOf('cube', 'perp')
    expect(perp).toContain('平面 α')
    expect(perp).toContain('m∩n = O ⇒ l⊥α')
  })

  it('其它立体图形都带自己的公式标注', () => {
    const cases = [
      ['cuboid', 'AC = √(a²+b²)'],
      ['cuboid', '∴ AG = √(a²+b²+c²)'],
      ['pyramid', 'V = ⅓S底h'],
      ['cylinder', 'V = πr²h'],
      ['cylinder', 'S侧 = 2πrh'],
      ['cone', 'V = ⅓πr²h'],
      ['cone', 'S侧 = πrl'],
      ['sphere', 'V = 4/3·πr³'],
      ['sphere', 'S = 4πr²'],
      ['frustum', 'V = ⅓πh(R²+Rr+r²)'],
    ]
    for (const [type, label] of cases) {
      expect(textOf(type), `${type} 应包含「${label}」`).toContain(label)
    }
  })

  it('圆台母线只在需要时标注高度 h', () => {
    const height = textOf('frustum', 'height')
    expect(height).toContain('上底半径 r，下底半径 R，高 h')
    expect(height).toContain('h')
  })
})
