import { memo } from 'react';
import './StepControls.css';

const StepControls = memo(function StepControls({
  currentStep,
  totalSteps,
  stepTitles,
  onNext,
  onPrevious,
  onPlay,
  onPause,
  onSeek,
  isPlaying,
}) {
  return (
    <div className="step-controls">
      <button
        className="step-btn"
        onClick={onPrevious}
        disabled={currentStep === 0}
        title="上一步"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        className="step-btn play-btn"
        onClick={isPlaying ? onPause : onPlay}
        disabled={totalSteps === 0}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      <button
        className="step-btn"
        onClick={onNext}
        disabled={currentStep >= totalSteps - 1}
        title="下一步"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="step-progress">
        <div className="step-slider-container">
          <input
            type="range"
            min="0"
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => onSeek(parseInt(e.target.value))}
            className="step-slider"
            disabled={totalSteps === 0}
          />
          <div className="step-ticks">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`step-tick ${i === currentStep ? 'active' : ''}`}
                onClick={() => onSeek(i)}
              />
            ))}
          </div>
        </div>
        <span className="step-counter">
          第 {currentStep + 1} 步 / 共 {totalSteps} 步
        </span>
      </div>

      {stepTitles && stepTitles[currentStep] && (
        <div className="step-title">
          {stepTitles[currentStep]}
        </div>
      )}
    </div>
  );
});

export default StepControls;