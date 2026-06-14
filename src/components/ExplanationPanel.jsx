import { useState, memo } from 'react'

// 题型名称映射
const PROBLEM_TYPE_NAMES = {
  skew_lines: '异面直线夹角',
  dihedral_angle: '二面角',
  line_plane_angle: '线面角',
  section: '截面问题',
  shortest_distance: '最短距离',
  volume: '体积计算',
  spatial_vector: '空间向量',
  distance_point_plane: '点到平面距离',
  inscribed_circumscribed: '内切外接',
}
import ProgressHeader from './ProgressHeader'
import StepList from './StepList'
import AnswerPanel from './AnswerPanel'
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
  const showAnswer = currentStepData?.type === 'validation' && !loading
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

      {/* ── 题型识别徽标 ── */}
      {parsedData?.problemType && parsedData.problemType !== 'general' && (
        <div className="ep-type-badge">
          <span className="ep-type-icon">📐</span>
          <span className="ep-type-label">识别题型</span>
          <span className="ep-type-name">
            {PROBLEM_TYPE_NAMES[parsedData.problemType] || parsedData.problemType}
          </span>
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
