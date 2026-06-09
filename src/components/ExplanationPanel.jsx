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
  error = null,
}) {
  const currentStepData = steps[currentStep]
  const showAnswer = currentStepData?.type === 'conclusion' && !loading

  return (
    <div className="explanation-panel">
      {/* AI parsing progress */}
      <ProgressHeader
        loadingStage={loadingStage}
        parsedData={parsedData}
        loading={loading}
        error={error}
      />

      {/* Step cards */}
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
          geometryType={parsedData?.type || 'cube'}
        />
      )}

      {/* Navigation controls */}
      {steps.length > 0 && (
        <PlaybackControls
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={onNext}
          onPrev={onPrev}
        />
      )}
    </div>
  )
}
