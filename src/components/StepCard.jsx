import './StepCard.css'

const TYPE_CONFIG = {
  observation:  { label: '观察', color: '#0550ae' },
  construction: { label: '作图', color: '#563098' },
  calculation:  { label: '计算', color: '#954a00' },
  conclusion:   { label: '结论', color: '#0d6b2e' },
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
          <span
            className="step-type-badge"
            style={{ borderColor: config.color, color: config.color }}
          >
            {config.label}
          </span>
          <h4 className="step-title">{step.title}</h4>
        </div>

        <p className="step-content">{step.content}</p>
      </div>
    </div>
  )
}
