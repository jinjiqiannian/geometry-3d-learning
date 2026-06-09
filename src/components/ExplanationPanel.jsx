import ProgressHeader from './ProgressHeader'
import StepList from './StepList'
import AnswerPanel from './AnswerPanel'
import PlaybackControls from './PlaybackControls'
import './ExplanationPanel.css'

export default function ExplanationPanel({
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
}) {
  const currentStepData = steps[currentStep]
  const showAnswer = currentStepData?.type === 'conclusion' && !loading

  return (
    <div className="explanation-panel">
      {/* Progress / idle state */}
      <ProgressHeader
        loadingStage={loadingStage}
        parsedData={parsedData}
        loading={loading}
        error={error}
      />

      {/* ── 题目 ── */}
      {!loading && loadingStage === 'done' && problemText && (
        <div className="ep-problem">
          <div className="ep-problem-label">题目</div>
          <p className="ep-problem-text">{problemText}</p>
        </div>
      )}

      {/* ── 解析 ── */}
      {steps.length > 0 ? (
        <div className="ep-steps-wrap">
          <div className="ep-steps-label">解析</div>
          <StepList
            steps={steps}
            currentStep={currentStep}
            onStepClick={onStepClick}
          />

          {/* Final answer (only on conclusion step) */}
          {showAnswer && (
            <AnswerPanel
              step={currentStepData}
              parsedData={parsedData}
              steps={steps}
            />
          )}

          {/* Navigation controls */}
          <PlaybackControls
            currentStep={currentStep}
            totalSteps={steps.length}
            onNext={onNext}
            onPrev={onPrev}
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
}
