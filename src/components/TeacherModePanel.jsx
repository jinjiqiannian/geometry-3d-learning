// ═══════════════════════════════════════════════════════
//  TeacherModePanel — 课堂演示控制栏
//  全屏3D + 自动播放 + 讲稿字幕 + PPT导出
// ═══════════════════════════════════════════════════════
import { useTeacher } from '../contexts/TeacherContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import './TeacherModePanel.css'

export default function TeacherModePanel({
  totalSteps,
  currentStep,
  onStepChange,
  onExportPPT,
  pptLoading,
}) {
  const { isTeacher } = useSubscription()
  const {
    classroomMode,
    toggleClassroomMode,
    autoPlay,
    toggleAutoPlay,
    playSpeed,
    cycleSpeed,
    showSubtitles,
    setShowSubtitles,
    darkMode,
    setDarkMode,
    currentPhrase,
  } = useTeacher()

  if (!isTeacher) return null

  return (
    <>
      {/* ── Floating classroom button ──────────────── */}
      {!classroomMode && (
        <button
          className="tmp-classroom-btn"
          onClick={toggleClassroomMode}
          title="课堂演示模式"
        >
          🎓 课堂模式
        </button>
      )}

      {/* ── Fullscreen classroom overlay ────────────── */}
      {classroomMode && (
        <div className={`tmp-overlay ${darkMode ? 'tmp-dark' : ''}`}>
          {/* Top bar */}
          <div className="tmp-topbar">
            <div className="tmp-topbar-left">
              <button className="tmp-btn" onClick={toggleClassroomMode} title="退出课堂模式 (Esc)">
                ✕ 退出
              </button>
              <span className="tmp-step-info">
                步骤 {currentStep + 1} / {totalSteps}
              </span>
            </div>

            <div className="tmp-topbar-center">
              <button
                className={`tmp-btn ${autoPlay ? 'tmp-active' : ''}`}
                onClick={() => toggleAutoPlay(totalSteps, onStepChange)}
                title="自动播放 (空格键)"
              >
                {autoPlay ? '⏸ 暂停' : '▶ 播放'}
              </button>

              <button className="tmp-btn" onClick={cycleSpeed} title="切换播放速度">
                {playSpeed}x
              </button>

              <button
                className={`tmp-btn ${showSubtitles ? 'tmp-active' : ''}`}
                onClick={() => setShowSubtitles(!showSubtitles)}
                title="讲稿字幕"
              >
                💬
              </button>

              <button
                className={`tmp-btn ${darkMode ? 'tmp-active' : ''}`}
                onClick={() => setDarkMode(!darkMode)}
                title="投屏暗色模式"
              >
                🌙
              </button>
            </div>

            <div className="tmp-topbar-right">
              <button
                className="tmp-btn tmp-export-btn"
                onClick={onExportPPT}
                disabled={pptLoading}
                title="导出PPT"
              >
                {pptLoading ? '⏳ 生成中...' : '📥 导出PPT'}
              </button>
            </div>
          </div>

          {/* Step navigation — left/right */}
          <button
            className="tmp-nav tmp-nav-left"
            onClick={() => {
              const newStep = Math.max(0, currentStep - 1)
              onStepChange?.(newStep)
            }}
            disabled={currentStep <= 0}
            title="上一步 (←)"
          >
            ‹
          </button>

          <button
            className="tmp-nav tmp-nav-right"
            onClick={() => {
              const newStep = Math.min(totalSteps - 1, currentStep + 1)
              onStepChange?.(newStep)
            }}
            disabled={currentStep >= totalSteps - 1}
            title="下一步 (→)"
          >
            ›
          </button>

          {/* Bottom subtitle bar */}
          {showSubtitles && currentPhrase && (
            <div className="tmp-subtitle-bar">
              <p className="tmp-subtitle-text">{currentPhrase}</p>
            </div>
          )}

          {/* Step dots indicator */}
          <div className="tmp-step-dots">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                className={`tmp-dot ${i === currentStep ? 'tmp-dot-active' : ''} ${i < currentStep ? 'tmp-dot-done' : ''}`}
                onClick={() => onStepChange?.(i)}
                title={`步骤 ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
