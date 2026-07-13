// ═══════════════════════════════════════════════════════
//  CoreIdeaCard — 核心思路卡片
//  显示在答案之后，分步解析之前
// ═══════════════════════════════════════════════════════

import { useMemo } from 'react'

export default function CoreIdeaCard({ steps, parsedData, loading, loadingStage }) {
  const content = useMemo(() => {
    if (loading || loadingStage !== 'done' || !steps?.length) return null
    const first = steps[0]
    // Priority: intuition field > first observation content > first step content
    const idea = first?.intuition ||
                 (first?.type === 'observation' ? first?.content : null) ||
                 first?.content
    if (!idea) return null
    // Extract first sentence or first 150 chars
    const firstSentence = idea.split(/[。！？\n]/)[0]
    return firstSentence?.length > 10 ? firstSentence : idea.slice(0, 150)
  }, [steps, loading, loadingStage])

  if (!content) return null

  return (
    <div className="core-idea-card">
      <div className="core-idea-card-label">💡 核心思路</div>
      <p className="core-idea-card-text">{content}</p>
    </div>
  )
}
