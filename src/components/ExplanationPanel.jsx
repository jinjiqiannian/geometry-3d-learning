import { useRef, useEffect, useMemo, memo } from 'react'
import ProgressHeader from './ProgressHeader'
import StepList from './StepList'
import AnswerPanel from './AnswerPanel'
import CoreIdeaCard from './explanation/CoreIdeaCard'
import PlaybackControls from './PlaybackControls'
import { mergeConsecutiveSteps, mapCurrentStepToMergedIndex } from './mergeConsecutiveSteps'
import './ExplanationPanel.css'

const ExplanationPanel = memo(function ExplanationPanel({
  steps = [],
  currentStep = 0,
  onStepClick,
  onNext,
  onPrev,
  loading = false,
  loadingStage = 'idle',
  parsedData = null,
  problemText = '',
  error = null,
  onRetry = null,
  onPlay,
  isPlaying = false,
}) {
  const currentStepData = steps[currentStep]
  const showAnswer = currentStepData?.type === 'conclusion' && !loading
  const stepsRef = useRef(null)

  const mergedGroups = useMemo(() => mergeConsecutiveSteps(steps), [steps])
  const mergedIndex = mapCurrentStepToMergedIndex(mergedGroups, currentStep)

  useEffect(() => {
    if (!stepsRef.current || !steps[currentStep]) return
    const stepEl = stepsRef.current.querySelector(`[data-step-index="${currentStep}"]`)
    if (stepEl) {
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep, steps])

  return (
    <div className="explanation-panel">
      <ProgressHeader
        loadingStage={loadingStage}
        parsedData={parsedData}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />

      {!loading && loadingStage === 'done' && problemText && (
        <div className="ep-problem">
          <div className="ep-problem-label">题目</div>
          <p className="ep-problem-text">{problemText}</p>
        </div>
      )}

      {steps.length > 0 && loadingStage === 'done' && !loading && (
        <CoreIdeaCard
          steps={steps}
          parsedData={parsedData}
          loading={loading}
          loadingStage={loadingStage}
        />
      )}

      {steps.length > 0 ? (
        <div className="ep-steps-wrap" ref={stepsRef}>
          <div className="ep-step-timeline-section">
            <StepList
              steps={steps}
              currentStep={currentStep}
              onStepClick={onStepClick}
            />
          </div>

          {showAnswer && (
            <AnswerPanel
              step={currentStepData}
              parsedData={parsedData}
              steps={steps}
              finalAnswer={steps[steps.length - 1]?.finalAnswer || parsedData?.finalAnswer}
            />
          )}

          <PlaybackControls
            currentStep={mergedIndex}
            totalSteps={mergedGroups.length}
            onNext={onNext}
            onPrev={onPrev}
            onPlay={onPlay}
            isPlaying={isPlaying}
            onStepClick={(i) => onStepClick?.(mergedGroups[i]?.originalIndices?.[0] ?? i)}
          />
        </div>
      ) : (
        !loading && loadingStage === 'done' && (
          <div className="ep-empty-steps">
            <p className="ep-empty-text">未能生成步骤，请尝试重新输入题目</p>
          </div>
        )
      )}
    </div>
  )
})
export default ExplanationPanel
