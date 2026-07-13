import { useState, useRef, useEffect, memo } from 'react'
import ProgressHeader from './ProgressHeader'
import StepList from './StepList'
import AnswerPanel from './AnswerPanel'
import CoreIdeaCard from './explanation/CoreIdeaCard'
import PlaybackControls from './PlaybackControls'
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
  // 追问
  onAskFollowUp,
  followUpLoading = false,
  followUpAnswer = null,
  // 自动回放
  onPlay,
  isPlaying = false,
  // 流式推理
  streamingReasoning = '',
  streamingDone = false,
  // 再来一题
  onPracticeMore,
}) {
  const currentStepData = steps[currentStep]
  const showAnswer = currentStepData?.type === 'conclusion' && !loading
  const [followUpInput, setFollowUpInput] = useState('')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const stepsRef = useRef(null)

  // Auto-scroll to current step on step change
  useEffect(() => {
    if (!stepsRef.current || !steps[currentStep]) return
    const stepEl = stepsRef.current.querySelector(`[data-step-index="${currentStep}"]`)
    if (stepEl) {
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep, steps])

  const handleFollowUpSubmit = () => {
    const q = followUpInput.trim()
    if (q.length < 2 || followUpLoading) return
    onAskFollowUp?.(q)
    setFollowUpInput('')
  }

  const handleFollowUpKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFollowUpSubmit()
    }
  }

  return (
    <div className="explanation-panel">
      {/* Progress / idle state */}
      <ProgressHeader
        loadingStage={loadingStage}
        parsedData={parsedData}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />

      {/* ── 题目 ── */}
      {!loading && loadingStage === 'done' && problemText && (
        <div className="ep-problem">
          <div className="ep-problem-label">📝 题目</div>
          <p className="ep-problem-text">{problemText}</p>
        </div>
      )}

      {/* ── 流式推理显示（AI 正在思考…） ── */}
      {loading && loadingStage === 'reasoning' && streamingReasoning && (
        <div className="wp-streaming-reasoning">
          <div className="wp-streaming-header">
            <span>🤖 AI 正在思考</span>
            {!streamingDone && <span className="wp-streaming-cursor" />}
          </div>
          <div className="wp-streaming-content">
            {streamingReasoning.split('[REASON]').filter(Boolean).map((line, i) => (
              <div key={i} className="wp-streaming-line">{line.trim()}</div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
         学生友好层级:
         1. 核心思路 (CoreIdeaCard)
         2. 分步解析 (StepList — 始终可见，核心视图)
         3. 答案 (AnswerPanel — 仅结论步奏)
         4. AI 推理 (折叠)
         5. 追问
         ════════════════════════════════════════════ */}
      {steps.length > 0 && loadingStage === 'done' && !loading && (
        <>
          {/* 核心思路 — 一句话概括 */}
          <CoreIdeaCard
            steps={steps}
            parsedData={parsedData}
            loading={loading}
            loadingStage={loadingStage}
          />
        </>
      )}

      {/* ── 步奏解析（始终可见，核心视图） ── */}
      {steps.length > 0 ? (
        <div className="ep-steps-wrap" ref={stepsRef}>
          {/* 步奏时间线 — 始终展开 */}
          <div className="ep-step-timeline-section">
            <StepList
              steps={steps}
              currentStep={currentStep}
              onStepClick={onStepClick}
            />
          </div>

          {/* 答案 (仅结论步奏) — 合并了 AnswerBanner + AnswerPanel */}
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
            onPlay={onPlay}
            isPlaying={isPlaying}
            onStepClick={onStepClick}
          />

          {/* AI 推理过程 (默认折叠) */}
          {parsedData?.aiReasoning && (
            <details className="ep-details">
              <summary className="ep-details-summary">🤖 AI 推理过程</summary>
              <div className="ep-ai-reasoning-content">
                {parsedData.aiReasoning}
              </div>
            </details>
          )}

          {/* ── 追问 AI ── */}
          <div className="ep-follow-up">
            {!showFollowUp ? (
              <button
                className="ep-follow-up-toggle"
                onClick={() => setShowFollowUp(true)}
              >
                有疑问？追问 AI
              </button>
            ) : (
              <div className="ep-follow-up-body">
                <div className="ep-follow-up-input-row">
                  <input
                    className="ep-follow-up-input"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    onKeyDown={handleFollowUpKey}
                    placeholder="例如：为什么这一步要用余弦定理？"
                    disabled={followUpLoading}
                    spellCheck={false}
                  />
                  <button
                    className="ep-follow-up-submit"
                    onClick={handleFollowUpSubmit}
                    disabled={followUpInput.trim().length < 2 || followUpLoading}
                  >
                    {followUpLoading ? '…' : '发送'}
                  </button>
                </div>

                {/* AI 回复 */}
                {followUpAnswer && (
                  <div className="ep-follow-up-answer">
                    <span className="ep-follow-up-answer-label">AI 回复</span>
                    <p className="ep-follow-up-answer-text">{followUpAnswer}</p>
                  </div>
                )}

                <button
                  className="ep-follow-up-close"
                  onClick={() => setShowFollowUp(false)}
                >
                  收起
                </button>
              </div>
            )}
          </div>

          {/* ── 再来一题 ── */}
          {onPracticeMore && showAnswer && (
            <div className="ep-practice-more">
              <button className="ep-practice-btn" onClick={onPracticeMore}>
                <span>再来一题</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
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
