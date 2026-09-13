import { useRef, useEffect, useMemo, memo, useState } from 'react'
import ProgressHeader from './ProgressHeader'
import StepList from './StepList'
import AnswerPanel from './AnswerPanel'
import CoreIdeaCard from './explanation/CoreIdeaCard'
import PlaybackControls from './PlaybackControls'
import MathText from './MathText'
import { mergeConsecutiveSteps, mapCurrentStepToMergedIndex } from './mergeConsecutiveSteps'
import { groupStepsByPart, activeBlockIndex } from './subQuestions'
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

  // 多小问的题按小问分块；取不到小问信息时是 null，走原来的扁平列表
  const partBlocks = useMemo(() => groupStepsByPart(steps), [steps])
  // 当前小问由 currentStep 推导，不另存一份 state —— 否则切换时会不同步。
  // 展开的那一块就是当前小问，3D 因此永远跟着展开项走。
  const activePart = partBlocks ? activeBlockIndex(partBlocks, currentStep) : -1

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
            <MathText text={problemText} />
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
            {partBlocks ? (
              partBlocks.map((block, bi) => {
                // 共用步骤（part 0：开头是已知与构图，结尾常是答案汇总）
                // 不属于任何小问，直接平铺 —— 给它们也套小问外壳会出现
                // 两个都叫「共用」的分块，反而更乱。
                if (block.part === 0) {
                  return (
                    <StepList
                      key={`shared-${block.startIndex}`}
                      steps={block.steps}
                      currentStep={currentStep}
                      onStepClick={onStepClick}
                      indexOffset={block.startIndex}
                    />
                  )
                }
                const isOpen = bi === activePart
                return (
                  <section
                    key={`part-${block.part}-${block.startIndex}`}
                    className={`ep-part${isOpen ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="ep-part-head"
                      onClick={() => onStepClick?.(block.startIndex)}
                      aria-expanded={isOpen}
                    >
                      <span className="ep-part-label">({block.part})</span>
                      <span className="ep-part-title">
                        {block.title || `第 ${block.part} 问`}
                      </span>
                      {/* 收起时把该小问的答案露在标题上：三问的题不用翻到最后才知道答案 */}
                      {block.answer && !isOpen && (
                        <span className="ep-part-answer">{block.answer}</span>
                      )}
                    </button>
                    {isOpen && (
                      <StepList
                        steps={block.steps}
                        currentStep={currentStep}
                        onStepClick={onStepClick}
                        indexOffset={block.startIndex}
                      />
                    )}
                  </section>
                )
              })
            ) : (
              <StepList
                steps={steps}
                currentStep={currentStep}
                onStepClick={onStepClick}
              />
            )}
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
