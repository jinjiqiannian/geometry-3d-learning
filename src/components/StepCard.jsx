import './StepCard.css'

const TYPE_CONFIG = {
  observation:  { label: '观察', color: '#6366f1', icon: '◈' },
  construction: { label: '作图', color: '#8b5cf6', icon: '◇' },
  calculation:  { label: '计算', color: '#d97706', icon: '△' },
  conclusion:   { label: '结论', color: '#16a34a', icon: '▣' },
}

export default function StepCard({ step, index, isCurrent, locked, onClick, onUpgrade }) {
  const config = TYPE_CONFIG[step.type] || TYPE_CONFIG.observation

  return (
    <div
      className={`step-card ${isCurrent ? 'current' : ''} ${locked ? 'locked' : ''}`}
      onClick={locked ? undefined : onClick}
    >
      {/* 左侧时间线指示器 */}
      <div className="step-timeline">
        <div
          className="step-dot"
          style={{ backgroundColor: isCurrent ? config.color : undefined }}
        />
        {index > 0 && <div className="step-line" />}
      </div>

      {/* 卡片主体 */}
      <div className="step-body">
        <div className="step-header">
          <span
            className="step-type-badge"
            style={{ backgroundColor: `${config.color}14`, color: config.color }}
          >
            {config.icon} {config.label}
          </span>
          <span className="step-number">第{index + 1}步</span>
        </div>

        <h4 className="step-title">{step.title}</h4>
        <p className="step-content">{step.content}</p>
      </div>
    </div>
  )
}
