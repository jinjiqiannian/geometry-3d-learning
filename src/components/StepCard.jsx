import { toTextbookMath } from './statementCompressor'
import './StepCard.css'

export default function StepCard({ step, index, isCurrent, locked, onClick, currentStep }) {
  // 展示层教材化：仅转换显示文本，不改动 step 原数据
  const displayTitle = toTextbookMath(step.title ?? '')
  let displayContent = toTextbookMath(step.content ?? '')
  displayContent = displayContent.replace(/^(得到|由此可知|由此可得|可知|于是|故)[：:]\s*/u, '')
  const displayFormula = step.formula ? toTextbookMath(step.formula) : ''

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
      onClick={locked ? undefined : onClick}
    >
      <div className="step-timeline">
        <div className={`step-dot ${isCompleted ? 'step-dot--done' : ''}`}>
          {isCompleted ? <span className="step-dot-check">✓</span> : <span className="step-dot-num">{index + 1}</span>}
        </div>
        {index > 0 && <div className="step-line" />}
      </div>

      <div className="step-body">
        <h4 className="step-title">{displayTitle}</h4>
        {displayFormula && (
          <p className="step-formula">{displayFormula}</p>
        )}
        <p className={`step-content ${!isCurrent ? 'step-content--clamped' : ''}`}>
          {displayContent}
        </p>
      </div>
    </div>
  )
}
