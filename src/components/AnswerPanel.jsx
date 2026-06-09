import { FORMULAS } from '../constants'
import './AnswerPanel.css'

export default function AnswerPanel({ step, parsedData, geometryType }) {
  // Only show when we're on the conclusion step
  if (!step || step.type !== 'conclusion') return null

  const formula = FORMULAS[geometryType]
  const geomName = geometryType || ''

  // Extract probable numeric result from conclusion content
  const extractResult = (content) => {
    // Look for patterns like "= 2√3", "≈ 3.46", "= 6", etc.
    const matches = content.match(/[=＝]\s*([\d.]+[√3π]*[^\s，。,.]*)/)
    if (matches) return matches[1]
    return null
  }

  return (
    <div className="answer-panel">
      <div className="ap-divider" />

      {/* Formula */}
      {formula && (
        <div className="ap-section">
          <span className="ap-label">公式</span>
          <div className="ap-formula-row">
            {formula.volume && (
              <span className="ap-formula">{formula.volume}</span>
            )}
            {formula.surface && (
              <span className="ap-formula">{formula.surface}</span>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      <div className="ap-section">
        <span className="ap-label">结果</span>
        <div className="ap-result">
          {step.content}
        </div>
        {extractResult(step.content) && (
          <div className="ap-result-highlight">
            {extractResult(step.content)}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="ap-section">
        <span className="ap-label">摘要</span>
        <p className="ap-summary">
          {geomName}问题 — {step.title}：{step.content.slice(0, 120)}
          {step.content.length > 120 ? '…' : ''}
        </p>
      </div>
    </div>
  )
}
