import StepCard from './StepCard'
import './ExplanationPanel.css'

export default function ExplanationPanel({
  steps = [],
  currentStep = 0,
  onStepClick,
  onNext,
  onPrev,
  loading = false,
  error = null,
}) {
  return (
    <div className="explanation-panel">
      <div className="ep-header">
        <h3 className="ep-title">解题步骤</h3>
        {loading && <span className="ep-loading">思考中…</span>}
      </div>

      {error && <div className="ep-error">{error}</div>}

      <div className="ep-steps">
        {steps.length === 0 && !loading && (
          <div className="ep-empty">
            <p className="ep-empty-main">输入题目开始</p>
            <p className="ep-empty-hint">
              输入一道几何题，AI 将生成分步解题讲解
            </p>
          </div>
        )}

        {steps.map((step, i) => (
          <StepCard
            key={i}
            step={step}
            index={i}
            isCurrent={i === currentStep}
            onClick={() => onStepClick?.(i)}
          />
        ))}
      </div>

      {steps.length > 0 && (
        <div className="ep-controls">
          <button className="ep-ctrl-btn" onClick={onPrev} disabled={currentStep <= 0}>
            上一步
          </button>
          <span className="ep-ctrl-indicator">
            {currentStep + 1} / {steps.length}
          </span>
          <button className="ep-ctrl-btn" onClick={onNext} disabled={currentStep >= steps.length - 1}>
            下一步
          </button>
        </div>
      )}
    </div>
  )
}
