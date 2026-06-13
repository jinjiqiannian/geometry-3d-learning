// ═══════════════════════════════════════════════════════
//  AnswerPanel — 结论步骤展示面板
//
//  关键规则：不显示几何体通用公式（V=a³ 等）。
//  只显示当前题目实际使用的推导公式。
// ═══════════════════════════════════════════════════════

import './AnswerPanel.css'

/**
 * 从 steps 中提取实际使用的公式
 * 查找 calculation 类型步骤中的公式表达式
 */
function extractFormulaFromSteps(steps) {
  if (!steps || steps.length === 0) return null

  // 找最后一个 calculation 步骤
  const calcSteps = steps.filter(s => s.type === 'calculation')
  if (calcSteps.length === 0) return null

  const lastCalc = calcSteps[calcSteps.length - 1]

  // 从 content 中提取公式模式
  const content = lastCalc.content

  // 常见公式模式
  const patterns = [
    /cos[θθ]\s*=\s*[^。，.]+/i,
    /[余弦定理|勾股定理|向量]/,
    /[=＝]\s*[\d√π./()a-z^]+/,
    /[VSL]\s*[=＝]\s*[^，。]+/,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) return match[0].trim()
  }

  // 回退：返回整个 calculation 内容作为公式说明
  return content.length > 80 ? content.slice(0, 80) + '…' : content
}

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

export default function AnswerPanel({ step, parsedData, steps }) {
  // Only show when we're on the conclusion step
  if (!step || step.type !== 'conclusion') return null

  // 从步骤中提取实际使用的公式
  const formulaUsed = extractFormulaFromSteps(steps || [])

  // 提取数值结果
  const result = extractResult(step.content)

  // 获取题目类型的中文名
  const geomName = parsedData?.type || ''

  return (
    <div className="answer-panel">
      <div className="ap-divider" />

      {/* 所用公式（从推导过程提取，不是通用公式） */}
      {formulaUsed && (
        <div className="ap-section">
          <span className="ap-label">所用公式</span>
          <div className="ap-formula-row">
            <span className="ap-formula">{formulaUsed}</span>
          </div>
        </div>
      )}

      {/* 结果 */}
      <div className="ap-section">
        <span className="ap-label">结果</span>
        <div className="ap-result">
          {step.content.split('。')[0]}
          {result && <span className="ap-result-highlight">{result}</span>}
        </div>
      </div>

      {/* 完整推导摘要 */}
      <div className="ap-section">
        <span className="ap-label">推导过程</span>
        <p className="ap-summary">
          {steps?.filter(s => ['calculation', 'construction'].includes(s.type))
            .map(s => s.content)
            .join('；') || step.content}
        </p>
      </div>
    </div>
  )
}
