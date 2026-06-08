import StepCard from './StepCard'
import { useSubscription } from '../contexts/SubscriptionContext'
import './ExplanationPanel.css'

export default function ExplanationPanel({
  steps = [],
  currentStep = 0,
  onStepClick,
  onNext,
  onPrev,
  onAutoPlay,
  onSave,
  loading = false,
  error = null,
}) {
  const { isPro, triggerPaywall } = useSubscription()

  const handleUpgrade = () => {
    triggerPaywall('AI完整讲解为Pro专属功能')
  }

  return (
    <div className="explanation-panel">
      <div className="ep-header">
        <h3 className="ep-title">📝 解题步骤</h3>
        {loading && <span className="ep-loading">AI 思考中...</span>}
      </div>

      {error && <div className="ep-error">{error}</div>}

      <div className="ep-steps">
        {steps.length === 0 && !loading && (
          <div className="ep-empty">
            <p>输入题目后，解题步骤将在这里显示</p>
            <p className="ep-empty-hint">支持：正方体、长方体、球体、圆柱、圆锥、棱锥、棱柱、棱台、圆台</p>
          </div>
        )}

        {steps.map((step, i) => {
          // Free users: first 2 steps visible, rest locked
          const locked = !isPro && i >= 2
          return (
            <StepCard
              key={i}
              step={step}
              index={i}
              isCurrent={i === currentStep}
              locked={locked}
              onClick={() => onStepClick?.(i)}
              onUpgrade={handleUpgrade}
            />
          )
        })}
      </div>

      {steps.length > 0 && (
        <div className="ep-controls">
          <button className="ep-ctrl-btn" onClick={onPrev} disabled={currentStep <= 0}>
            ← 上一步
          </button>
          <span className="ep-ctrl-indicator">
            {currentStep + 1} / {steps.length}
          </span>
          <button className="ep-ctrl-btn" onClick={onNext} disabled={currentStep >= steps.length - 1}>
            下一步 →
          </button>
          {onAutoPlay && (
            <button className="ep-ctrl-btn auto" onClick={onAutoPlay}>
              🎬 自动播放
            </button>
          )}
          {onSave && (
            <button className="ep-ctrl-btn save" onClick={onSave}>
              💾 保存
            </button>
          )}
        </div>
      )}
    </div>
  )
}
