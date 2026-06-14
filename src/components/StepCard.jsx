import { useState } from 'react'
import './StepCard.css'

// 步骤类型色值（仅用于时间线圆点 + 类型标签）
const TYPE_COLORS = {
  conceptual:    '#6366f1', // indigo
  construction:  '#8b5cf6', // purple
  calculation:   '#d97706', // amber
  validation:    '#16a34a', // green
}

const TYPE_LABELS = {
  conceptual:    '概念理解',
  construction:  '构造转化',
  calculation:   '计算推导',
  validation:    '验证结论',
}

export default function StepCard({ step, index, isCurrent, locked, onClick, onUpgrade }) {
  const [showWhy, setShowWhy] = useState(false)
  const [showStuck, setShowStuck] = useState(false)
  const dotColor = TYPE_COLORS[step.type] || TYPE_COLORS.conceptual
  const typeLabel = TYPE_LABELS[step.type] || step.type

  const hasWhy = step.why?.intuition || step.why?.math_reason
  const hasStuck = step.stuck?.misconception || step.stuck?.correction

  const handleClick = () => {
    if (locked) return
    onClick?.()
  }

  const toggleWhy = (e) => {
    e.stopPropagation()
    setShowWhy(v => !v)
    if (showStuck) setShowStuck(false) // 不同时展开
  }

  const toggleStuck = (e) => {
    e.stopPropagation()
    setShowStuck(v => !v)
    if (showWhy) setShowWhy(false) // 不同时展开
  }

  return (
    <div
      className={`step-card ${isCurrent ? 'current' : ''} ${locked ? 'locked' : ''}`}
      onClick={handleClick}
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
        <div className="step-header">
          {step.type && (
            <span
              className="step-type-badge"
              style={{
                backgroundColor: dotColor + '18',
                color: dotColor,
              }}
            >
              {typeLabel}
            </span>
          )}
        </div>
        <h4 className="step-title">{step.title}</h4>
        <p className="step-content">{step.content}</p>

        {/* 底部操作按钮 */}
        {(hasWhy || hasStuck) && (
          <div className="step-actions">
            {hasWhy && (
              <button
                className={`step-action-btn ${showWhy ? 'active' : ''}`}
                onClick={toggleWhy}
              >
                <span className="action-icon">📖</span>
                <span>为什么这样做？</span>
                <span className={`action-arrow ${showWhy ? 'open' : ''}`}>▸</span>
              </button>
            )}
            {hasStuck && (
              <button
                className={`step-action-btn ${showStuck ? 'active' : ''}`}
                onClick={toggleStuck}
              >
                <span className="action-icon">💡</span>
                <span>学生常见疑问</span>
                <span className={`action-arrow ${showStuck ? 'open' : ''}`}>▸</span>
              </button>
            )}
          </div>
        )}

        {/* 为什么这样做 — 展开面板 */}
        {hasWhy && showWhy && (
          <div className="step-expandable why-panel">
            {step.why?.intuition && (
              <div className="why-section">
                <div className="why-label">
                  <span className="why-icon">💭</span> 直觉理解
                </div>
                <p className="why-text">{step.why.intuition}</p>
              </div>
            )}
            {step.why?.math_reason && (
              <div className="why-section">
                <div className="why-label">
                  <span className="why-icon">📐</span> 数学原理
                </div>
                <p className="why-text">{step.why.math_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* 学生常见疑问 — 展开面板 */}
        {hasStuck && showStuck && (
          <div className="step-expandable stuck-panel">
            {step.stuck?.misconception && (
              <div className="stuck-section">
                <div className="stuck-label">
                  <span className="stuck-icon">❌</span> 常见错误
                </div>
                <p className="stuck-text misconception">{step.stuck.misconception}</p>
              </div>
            )}
            {step.stuck?.correction && (
              <div className="stuck-section">
                <div className="stuck-label">
                  <span className="stuck-icon">✅</span> 正确理解
                </div>
                <p className="stuck-text correction">{step.stuck.correction}</p>
              </div>
            )}
          </div>
        )}

        {/* Lock overlay */}
        {locked && (
          <div className="locked-overlay" onClick={(e) => { e.stopPropagation(); onUpgrade?.() }}>
            <span>🔒 升级解锁</span>
          </div>
        )}
      </div>
    </div>
  )
}
