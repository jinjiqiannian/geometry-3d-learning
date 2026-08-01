// ═══════════════════════════════════════════════════════
//  AnswerPanel — 结论步骤展示面板
// ═══════════════════════════════════════════════════════

import './AnswerPanel.css'

/**
 * 从结论步骤 content 中提取数值结果
 */
function extractResult(content) {
  if (!content) return null

  // 模式: "余弦值为 1/3", "= 2√3", "≈ 0.333", "夹角为 60°"
  const patterns = [
    /(?:余弦值|正弦值|正切值|值为|结果[为是]?|等于|夹角[为是]?|长度为|面积为|体积为)\s*([^，。,\s]+)/,
    /[=≈＝]\s*([\d√π./\^°\sa-zβθα]+)/,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) return match[1].trim()
  }

  return null
}

export default function AnswerPanel({ step, parsedData, steps, finalAnswer }) {
  if (!step || step.type !== 'conclusion') return null

  const result = finalAnswer?.value || extractResult(step.content)

  return (
    <div className="answer-panel">
      <div className="ap-divider" />

      {/* 结果 */}
      <div className="ap-section">
        <span className="ap-label">结果</span>
        <div className="ap-result">
          {result && <span className="ap-result-highlight">{result}</span>}
        </div>
      </div>

      {/* 完整推导摘要 */}
      <div className="ap-section">
        <span className="ap-label">推导过程</span>
        <p className="ap-summary">
          {step.content}
        </p>
      </div>
    </div>
  )
}
