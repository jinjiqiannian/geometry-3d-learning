import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepList from '../StepList'
import { mergeConsecutiveSteps } from '../mergeConsecutiveSteps'

function planeStep(point, plane = 'PAC') {
  return {
    title: '平面归属判定',
    content: `∴ ${point} ∈ 平面${plane}。`,
    formula: '平面内的点属于该平面',
    rule: 'plane_membership',
    type: 'inference',
  }
}

describe('mergeConsecutiveSteps（同谓词归纳展示）', () => {
  it('仅合并连续相同 title+rule，不跨组', () => {
    const steps = [
      planeStep('F'),
      planeStep('O'),
      { title: '其它规则', content: 'B', rule: 'other' },
      planeStep('G'),
    ]
    const groups = mergeConsecutiveSteps(steps)
    expect(groups).toHaveLength(3)
    expect(groups[0].merged).toBe(true)
    expect(groups[0].step.content).toBe('F、O ∈ 平面 PAC')
    expect(groups[1].step.content).toBe('B')
    expect(groups[2].step.content).toBe('G ∈ 平面 PAC')
  })

  it('正文为教材数学式，无自然语言总结', () => {
    const steps = [planeStep('F'), planeStep('O'), planeStep('G')]
    const [group] = mergeConsecutiveSteps(steps)
    expect(group.step.content).toBe('F、O、G ∈ 平面 PAC')
    expect(group.step.content).not.toContain('得到')
    expect(group.step.content).not.toContain('根据')
    expect(group.step.content).not.toContain('这些点')
  })

  it('五个平面归属压缩为一句', () => {
    const steps = ['A', 'B', 'C', 'D', 'E'].map((p) => planeStep(p, 'ABCD'))
    const [group] = mergeConsecutiveSteps(steps)
    expect(group.step.content).toBe('A、B、C、D、E ∈ 平面 ABCD')
  })
})

describe('StepList UI Render', () => {
  it('连续平面归属合并为一卡，正文为归纳数学句', () => {
    const steps = [planeStep('F'), planeStep('O'), planeStep('G')]
    render(<StepList steps={steps} currentStep={0} />)

    expect(screen.getAllByText('平面归属判定')).toHaveLength(1)
    expect(screen.getByText('F、O、G ∈ 平面 PAC')).toBeInTheDocument()
  })

  it('中间插入其它步骤后，两侧不跨组合并', () => {
    const steps = [
      planeStep('F'),
      planeStep('O'),
      { title: '中点性质', content: 'M 为中点', rule: 'midpoint', type: 'inference' },
      planeStep('G'),
    ]
    const { container } = render(<StepList steps={steps} currentStep={0} />)

    expect(screen.getAllByText('平面归属判定')).toHaveLength(2)
    expect(screen.getByText('中点性质')).toBeInTheDocument()
    expect(screen.getByText('G ∈ 平面 PAC')).toBeInTheDocument()
    expect(container.querySelectorAll('.step-index-anchor[data-step-index]')).toHaveLength(4)
  })
})
