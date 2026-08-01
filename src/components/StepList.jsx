import StepCard from './StepCard'
import { mergeConsecutiveSteps, mapCurrentStepToMergedIndex } from './mergeConsecutiveSteps'
import './StepList.css'

export default function StepList({ steps = [], currentStep = 0, onStepClick }) {
  if (steps.length === 0) return null

  const groups = mergeConsecutiveSteps(steps)
  const mergedCurrent = mapCurrentStepToMergedIndex(groups, currentStep)

  return (
    <div className="step-list">
      {groups.map((group, i) => (
        <div key={group.originalIndices.join('-')} className="step-list-item">
          {/* 原始步骤索引锚点：保持 ExplanationPanel 按 currentStep 滚动 */}
          {group.originalIndices.map((oi) => (
            <span
              key={oi}
              data-step-index={oi}
              className="step-index-anchor"
              aria-hidden="true"
            />
          ))}
          <StepCard
            step={group.step}
            index={i}
            isCurrent={i === mergedCurrent}
            currentStep={mergedCurrent}
            onClick={() => onStepClick?.(group.originalIndices[0])}
          />
        </div>
      ))}
    </div>
  )
}
