// ═══════════════════════════════════════════════════════
//  AnswerBanner — 答案横幅
//  学生进入页面后 15 秒内看到答案
// ═══════════════════════════════════════════════════════

import { useMemo } from 'react'

function extractAnswerText(steps) {
  if (!steps?.length) return null
  const answerStep = [...steps].reverse().find(
    s => s.type === 'validation' || s.type === 'conclusion'
  )
  if (answerStep) return answerStep.content?.trim()
  return steps[steps.length - 1]?.content?.trim() || null
}

function extractAnswerValue(text) {
  if (!text) return null
  const patterns = [
    /答案[：:]\s*([^。\n]+)/,
    /结果[：:]\s*([^。\n]+)/,
    /[=≈]\s*([0-9.°π√\s/]+)/,
    /为\s*([0-9.°π√\s/]+)/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1].trim()
  }
  return text.split(/[。\n]/)[0].trim()
}

export default function AnswerBanner({ steps, loading, loadingStage }) {
  const answer = useMemo(() => {
    if (loading || loadingStage !== 'done' || !steps?.length) return null
    return extractAnswerText(steps)
  }, [steps, loading, loadingStage])

  const short = useMemo(() => answer ? extractAnswerValue(answer) : null, [answer])

  if (!answer) return null

  return (
    <div className="answer-banner">
      <div className="answer-banner-label">答案</div>
      <div className="answer-banner-value">{short || answer}</div>
    </div>
  )
}
