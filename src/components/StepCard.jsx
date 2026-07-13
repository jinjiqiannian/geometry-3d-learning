import './StepCard.css'

const TYPE_COLORS = {
  observation:  '#6366f1',
  construction: '#8b5cf6',
  calculation:  '#d97706',
  conclusion:   '#16a34a',
}

const TYPE_BADGES = {
  observation:  '观察',
  construction: '构造',
  calculation:  '计算',
  conclusion:   '结论',
}

export default function StepCard({ step, index, isCurrent, locked, onClick, onUpgrade, currentStep }) {
  const dotColor = TYPE_COLORS[step.type] || TYPE_COLORS.observation
  const badge = TYPE_BADGES[step.type] || ''

  // Determine state: completed / current / pending
  const isCompleted = currentStep != null && index < currentStep
  const isPending = currentStep != null && index > currentStep

  let stateClass = ''
  if (isCurrent) stateClass = 'current'
  else if (isCompleted) stateClass = 'completed'
  else if (isPending) stateClass = 'pending'

  return (
    <div
      className={`step-card ${stateClass} ${locked ? 'locked' : ''}`}
      data-step-index={index}
      onClick={locked ? undefined : onClick}
    >
      {/* 左侧时间线指示器 */}
      <div className="step-timeline">
        <div
          className={`step-dot ${isCompleted ? 'step-dot--done' : ''}`}
          style={{ backgroundColor: isCurrent ? dotColor : undefined }}
        >
          {isCompleted && <span className="step-dot-check">✓</span>}
        </div>
        {index > 0 && <div className="step-line" />}
      </div>

      {/* 卡片主体 */}
      <div className="step-body">
        <div className="step-header">
          {badge && <span className={`step-type-badge step-type-badge--${step.type}`}>{badge}</span>}
          {step.formula && <span className="step-formula-label">{step.formula}</span>}
        </div>
        <h4 className="step-title">{step.title}</h4>
        <p className={`step-content ${!isCurrent ? 'step-content--clamped' : ''}`}>
          {step.content}
        </p>
      </div>
    </div>
  )
}
