import './StepCard.css'

const TYPE_CONFIG = {
  observation: { label: '观察', color: '#4A90E2', bg: '#e8f0fc' },
  construction: { label: '作图', color: '#43A047', bg: '#e8f5e9' },
  calculation: { label: '计算', color: '#FB8C00', bg: '#fff8e1' },
  conclusion: { label: '结论', color: '#8E24AA', bg: '#f3e5f5' },
}

export default function StepCard({ step, index, isCurrent, locked, onClick, onUpgrade }) {
  const config = TYPE_CONFIG[step.type] || TYPE_CONFIG.observation

  return (
    <div
      className={`step-card ${isCurrent ? 'current' : ''} ${locked ? 'locked' : ''}`}
      onClick={onClick}
      style={{ '--step-color': config.color, '--step-bg': config.bg }}
    >
      <div className="step-indicator">
        {locked ? (
          <span className="step-lock">🔒</span>
        ) : (
          <span className="step-number">{index + 1}</span>
        )}
      </div>

      <div className="step-body">
        <div className="step-header">
          <span className={`step-type-badge type-${step.type}`}>
            {config.label}
          </span>
          <h4 className="step-title">{step.title}</h4>
        </div>

        {!locked && (
          <p className="step-content">{step.content}</p>
        )}

        {locked && (
          <div className="step-locked-content">
            <p className="step-content blurred">{step.content}</p>
            <button className="step-upgrade-btn" onClick={(e) => { e.stopPropagation(); onUpgrade?.() }}>
              🔒 升级 Pro 查看完整讲解
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
