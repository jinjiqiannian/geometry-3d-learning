// ═══════════════════════════════════════════════════════
//  CoreIdeaCard — 核心思路卡片
//  显示在答案之后，分步解析之前
// ═══════════════════════════════════════════════════════

import { useMemo } from 'react'

export default function CoreIdeaCard({ steps, parsedData, loading, loadingStage }) {
  const content = useMemo(() => {
    if (loading || loadingStage !== 'done' || !steps?.length) return null
    const first = steps[0]
    const idea = first?.why?.intuition || first?.content
    const trimmed = idea?.replace(/^[#*>\s]+/, '').slice(0, 200)
    return trimmed
  }, [steps, loading, loadingStage])

  if (!content) return null

  return (
    <div className="core-idea-card">
      <div className="core-idea-card-label">💡 核心思路</div>
      <p className="core-idea-card-text">{content}</p>
    </div>
  )
}
