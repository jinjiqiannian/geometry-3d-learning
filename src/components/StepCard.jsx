import './StepCard.css'

// type 色值仅用于时间线圆点（内部逻辑），不再向用户展示标签
const TYPE_COLORS = {
  observation:  '#6366f1',
  construction: '#8b5cf6',
  calculation:  '#d97706',
  conclusion:   '#16a34a',
}

export default function StepCard({ step, index, isCurrent, locked, onClick, onUpgrade }) {
  const dotColor = TYPE_COLORS[step.type] || TYPE_COLORS.observation

  return (
    <div
      className={`step-card ${isCurrent ? 'current' : ''} ${locked ? 'locked' : ''}`}
      onClick={locked ? undefined : onClick}
    >
      {/* 左侧时间线指示器 */}
      <div className="step-timeline">
        <div
          className="step-dot"
          style={{ backgroundColor: isCurrent ? dotColor : undefined }}
        />
        {index > 0 && <div className="step-line" />}
      </div>

      {/* 卡片主体 */}
      <div className="step-body">
        <h4 className="step-title">{step.title}</h4>
        <p className="step-content">{step.content}</p>
      </div>
    </div>
  )
}
