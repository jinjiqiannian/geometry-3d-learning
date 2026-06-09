import './StepCard.css'

const TYPE_CONFIG = {
  observation: { label: '观察' },
  construction: { label: '作图' },
  calculation: { label: '计算' },
  conclusion: { label: '结论' },
}

export default function StepCard({ step, index, isCurrent, locked, onClick, onUpgrade }) {
  const config = TYPE_CONFIG[step.type] || TYPE_CONFIG.observation

  return (
    <div
      className={`step-card ${isCurrent ? 'current' : ''}`}
      onClick={onClick}
    >
      <div className="step-indicator">
        <span className="step-number">{index + 1}</span>
      </div>

      <div className="step-body">
        <div className="step-header">
          <span className="step-type-badge">
            {config.label}
          </span>
          <h4 className="step-title">{step.title}</h4>
        </div>

        <p className="step-content">{step.content}</p>
      </div>
    </div>
  )
}
