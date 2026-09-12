import { useRef, useEffect, useMemo, memo, useState } from 'react'
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
  streamingText = '',
}) {
  const currentStepData = steps[currentStep]
  const showAnswer = currentStepData?.type === 'conclusion' && !loading
  const stepsRef = useRef(null)
  const streamingRef = useRef(null)
  const [problemExpanded, setProblemExpanded] = useState(false)
  const isProblemLong = (problemText || '').length > 80

  const mergedGroups = useMemo(() => mergeConsecutiveSteps(steps), [steps])
  const mergedIndex = mapCurrentStepToMergedIndex(mergedGroups, currentStep)

  useEffect(() => {
    if (!stepsRef.current || !steps[currentStep]) return
    const stepEl = stepsRef.current.querySelector(`[data-step-index="${currentStep}"]`)
    if (stepEl) {
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep, steps])

  // 换题时收起展开的题目
  useEffect(() => {
    setProblemExpanded(false)
  }, [problemText])

  // AI 思考过程实时滚动到底部，让用户看到进度
  useEffect(() => {
    const el = streamingRef.current
    if (el && loading) {
      el.scrollTop = el.scrollHeight
    }
  }, [streamingText, loading])

  return (
    <div className="explanation-panel">
      <ProgressHeader
        loadingStage={loadingStage}
        parsedData={parsedData}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />

      {/* AI 流式推理过程：让用户看到进度，避免误以为卡住 */}
      {loading && streamingText && (
        <div className="wp-streaming-reasoning" ref={streamingRef} role="status">
          <div className="wp-streaming-header">
            <span>AI 正在推理，以下为实时思考过程</span>
            <span className="wp-streaming-cursor" />
          </div>
          {streamingText}
        </div>
      )}

      {!loading && loadingStage === 'done' && problemText && (
        <div className="ep-problem">
          <div className="ep-problem-label">题目</div>
          <p className={`ep-problem-text${!problemExpanded ? ' is-clamped' : ''}`}>
            {problemText}
          </p>
          {isProblemLong && (
            <button
              type="button"
              className="ep-problem-toggle"
              onClick={() => setProblemExpanded((v) => !v)}
            >
              {problemExpanded ? '收起 ▴' : '展开全文 ▾'}
            </button>
          )}
        </div>
      )}

      {!loading && steps.length > 0 && loadingStage === 'done' && (
        <CoreIdeaCard
          steps={steps}
          parsedData={parsedData}
          loading={loading}
          loadingStage={loadingStage}
        />
      )}

      {!loading && steps.length > 0 ? (
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
