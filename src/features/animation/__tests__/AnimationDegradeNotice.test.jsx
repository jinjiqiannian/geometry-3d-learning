import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnimationDegradeNotice from '../AnimationDegradeNotice'

describe('AnimationDegradeNotice（§4.3 降级提示）', () => {
  it('标题恒为「暂不支持动画」，不是错误弹窗', () => {
    render(<AnimationDegradeNotice />)
    expect(screen.getByText('暂不支持动画')).toBeInTheDocument()
  })

  it('无 reason 时使用兜底文案，并说明静态图与步骤不受影响', () => {
    render(<AnimationDegradeNotice />)
    expect(screen.getByText(/这道题的动画暂时生成不出来/)).toBeInTheDocument()
    expect(screen.getByText(/静态图与解题步骤不受影响/)).toBeInTheDocument()
  })

  it('有 reason 时展示具体原因', () => {
    render(<AnimationDegradeNotice reason="物理复算不通过：d 加倍但 C 未减半" />)
    expect(screen.getByText(/物理复算不通过/)).toBeInTheDocument()
    expect(screen.queryByText(/这道题的动画暂时生成不出来/)).not.toBeInTheDocument()
  })

  it('点「再试一次」触发 onRetry', () => {
    const onRetry = vi.fn()
    render(<AnimationDegradeNotice onRetry={onRetry} />)
    fireEvent.click(screen.getByText('再试一次'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('busy 时按钮禁用且显示「生成中…」', () => {
    const onRetry = vi.fn()
    render(<AnimationDegradeNotice busy onRetry={onRetry} />)
    const btn = screen.getByText('生成中…')
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('code 挂在重试按钮 title 上，便于人工排查', () => {
    render(<AnimationDegradeNotice code="PHYSICS" />)
    expect(screen.getByText('再试一次')).toHaveAttribute('title', '降级代码：PHYSICS')
  })

  it('点「这画得不对」把 reason 回传给共用反馈入口', () => {
    const onFeedback = vi.fn()
    render(<AnimationDegradeNotice reason="未注册的原语：capacitor" onFeedback={onFeedback} />)
    fireEvent.click(screen.getByText('这画得不对'))
    expect(onFeedback).toHaveBeenCalledWith('未注册的原语：capacitor')
  })

  it('feedbackState 为 sent 时按钮禁用并显示「已反馈，谢谢」', () => {
    const onFeedback = vi.fn()
    render(<AnimationDegradeNotice onFeedback={onFeedback} feedbackState="sent" />)
    const btn = screen.getByText('已反馈，谢谢')
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onFeedback).not.toHaveBeenCalled()
  })

  it('容器为 aria-live 状态区域，屏幕阅读器可感知', () => {
    render(<AnimationDegradeNotice reason="x" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})
