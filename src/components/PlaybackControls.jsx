import './PlaybackControls.css'

export default function PlaybackControls({
  currentStep = 0,
  totalSteps = 0,
  onNext,
  onPrev,
  onPlay,
  isPlaying = false,
}) {
  if (totalSteps === 0) return null

  return (
    <div className="playback-controls">
      <button
        className="pc-btn"
        onClick={onPrev}
        disabled={currentStep <= 0}
        aria-label="上一步"
      >
        上一步
      </button>

      {onPlay && (
        <button
          className={`pc-btn pc-btn-play ${isPlaying ? 'active' : ''}`}
          onClick={onPlay}
          aria-label={isPlaying ? '暂停' : '自动回放'}
        >
          {isPlaying ? '暂停' : '回放'}
        </button>
      )}

      <span className="pc-indicator">
        {currentStep + 1} / {totalSteps}
      </span>

      <button
        className="pc-btn"
        onClick={onNext}
        disabled={currentStep >= totalSteps - 1}
        aria-label="下一步"
      >
        下一步
      </button>
    </div>
  )
}
