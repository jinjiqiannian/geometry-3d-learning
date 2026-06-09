import './ProgressHeader.css'

// ── Stage config ──────────────────────────────────────
const STAGES = {
  idle: { label: '输入题目开始', icon: '○' },
  parsing: { label: '识别题目结构…', icon: '◌' },
  reasoning: { label: '生成推导步骤…', icon: '◌' },
  visualizing: { label: '构建3D可视化…', icon: '◌' },
  done: { label: '解析完成', icon: '●' },
}

export default function ProgressHeader({ loadingStage = 'idle', parsedData, loading, error, onRetry }) {
  const stage = STAGES[loadingStage] || STAGES.idle
  const isActive = loading || loadingStage === 'done'

  return (
    <div className="progress-header">
      {/* AI Stage indicator */}
      {loading && (
        <div className="ph-stage">
          <span className="ph-stage-icon">{stage.icon}</span>
          <span className="ph-stage-label">{stage.label}</span>
          <span className="ph-dot-pulse" />
        </div>
      )}

      {/* Done state: show explanation summary */}
      {!loading && loadingStage === 'done' && parsedData?.explanation && (
        <div className="ph-summary">
          <span className="ph-summary-icon">●</span>
          <p className="ph-summary-text">{parsedData.explanation}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="ph-error">
          <span className="ph-error-text">{error}</span>
          {onRetry && (
            <button className="ph-retry-btn" onClick={onRetry}>
              重试
            </button>
          )}
        </div>
      )}

      {/* Idle: prompt */}
      {!loading && loadingStage === 'idle' && !error && (
        <div className="ph-empty">
          <span className="ph-empty-text">输入题目，AI 将解析并生成3D讲解</span>
        </div>
      )}
    </div>
  )
}
