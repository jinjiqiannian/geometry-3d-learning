import { useState, memo } from 'react'
import ProgressHeader from './ProgressHeader'
import StepList from './StepList'
import AnswerPanel from './AnswerPanel'
import AnswerBanner from './explanation/AnswerBanner'
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
}) {
  const currentStepData = steps[currentStep]
  const showAnswer = currentStepData?.type === 'conclusion' && !loading
  const [followUpInput, setFollowUpInput] = useState('')
  const [showFollowUp, setShowFollowUp] = useState(false)

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
          <div className="ep-problem-label">题目</div>
          <p className="ep-problem-text">{problemText}</p>
        </div>
      )}

      {/* ════════════════════════════════════════════
         P0: 答案优先层级
         优先级:
         1. 答案 (AnswerBanner)
         2. 核心思路 (CoreIdeaCard)
         3. 分步解析 (折叠)
         4. AI 完整推理 (折叠)
         ════════════════════════════════════════════ */}
      {steps.length > 0 && loadingStage === 'done' && !loading && (
        <>
          {/* 优先级 1: 答案 — 学生最关心 */}
          <AnswerBanner
            steps={steps}
            loading={loading}
            loadingStage={loadingStage}
          />

          {/* 优先级 2: 核心思路 + 知识点标签 */}
          <CoreIdeaCard
            steps={steps}
            parsedData={parsedData}
            loading={loading}
            loadingStage={loadingStage}
          />

          {/* 知识点标签 */}
          {parsedData?.knowledgePoints?.length > 0 && (
            <div className="ep-knowledge-points" style={{
              margin: '0 16px 8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
            }}>
              {parsedData.knowledgePoints.map((kp, i) => (
                <span key={i} style={{
                  fontSize: '0.75rem',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}>
                  {kp}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 解析 ── */}
      {steps.length > 0 ? (
        <div className="ep-steps-wrap">
          {/* 优先级 3: 分步解析 (默认折叠) */}
          <details className="ep-details">
            <summary className="ep-details-summary">📖 分步解析</summary>
            <StepList
              steps={steps}
              currentStep={currentStep}
              onStepClick={onStepClick}
            />
          </details>

          {/* AI 推理过程 (默认折叠) */}
          {parsedData?.aiReasoning && (
            <details className="ep-details" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <summary className="ep-details-summary">🤖 AI 推理过程</summary>
              <div style={{
                padding: '8px 16px 12px',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {parsedData.aiReasoning}
              </div>
            </details>
          )}

          {/* Final answer (only on conclusion step) — 保留原有 AnswerPanel */}
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
          />

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
