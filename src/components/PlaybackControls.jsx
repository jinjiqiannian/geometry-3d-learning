import './PlaybackControls.css'

export default function PlaybackControls({
  currentStep = 0,
  totalSteps = 0,
  onNext,
  onPrev,
  onPlay,
  isPlaying = false,
  onStepClick,
}) {
  if (totalSteps === 0) return null

  return (
    <div className="playback-controls">
      <button
        className="pc-btn pc-btn--prev"
        onClick={onPrev}
        disabled={currentStep <= 0}
        aria-label="上一步"
      >
        <span className="pc-btn-icon">◀</span>
        <span className="pc-btn-label">上一步</span>
      </button>

      {onPlay && (
        <button
          className={`pc-btn pc-btn-play ${isPlaying ? 'active' : ''}`}
          onClick={onPlay}
          aria-label={isPlaying ? '暂停' : '自动回放'}
        >
          <span className="pc-btn-icon">{isPlaying ? '⏸' : '▶'}</span>
          <span className="pc-btn-label">{isPlaying ? '暂停' : '演示'}</span>
        </button>
      )}

      {/* 步奏圆点指示器 */}
      <div className="pc-dots-container">
        <div className="pc-dots">
          {totalSteps <= 10 && onStepClick
            ? /* 小规模：可点击圆点 */
              Array.from({ length: totalSteps }, (_, i) => (
                <button
                  key={i}
                  className={[
                    'pc-dot',
                    i === currentStep ? 'pc-dot--current' : '',
                    i < currentStep ? 'pc-dot--done' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onStepClick(i)}
                  aria-label={`第 ${i + 1} 步`}
                />
              ))
            : /* 大规模：简化指示 */
              Array.from({ length: Math.min(totalSteps, 10) }, (_, i) => {
                const ratio = i / Math.min(totalSteps - 1, 9)
                const stepIndex = Math.round(ratio * (totalSteps - 1))
                return (
                  <span
                    key={i}
                    className={[
                      'pc-dot',
                      stepIndex === currentStep ? 'pc-dot--current' : '',
                      stepIndex < currentStep ? 'pc-dot--done' : '',
                    ].filter(Boolean).join(' ')}
                  />
                )
              })}
        </div>
        <span className="pc-indicator">
          步骤 {currentStep + 1}/{totalSteps}
        </span>
      </div>

      <button
        className="pc-btn pc-btn--next"
        onClick={onNext}
        disabled={currentStep >= totalSteps - 1}
        aria-label="下一步"
      >
        <span className="pc-btn-label">下一步</span>
        <span className="pc-btn-icon">▶</span>
      </button>
    </div>
  )
}
