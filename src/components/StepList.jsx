import StepCard from './StepCard'
import './StepList.css'

export default function StepList({ steps = [], currentStep = 0, onStepClick }) {
  if (steps.length === 0) return null

  return (
    <div className="step-list">
      {steps.map((step, i) => (
        <StepCard
          key={i}
          step={step}
          index={i}
          isCurrent={i === currentStep}
          onClick={() => onStepClick?.(i)}
        />
      ))}
    </div>
  )
}
