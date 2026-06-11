// ═══════════════════════════════════════════════════════
//  TeacherModePanel — Classroom presentation controls
//  Fullscreen 3D + auto-play + subtitles + PPT export
// ═══════════════════════════════════════════════════════
import { memo } from 'react'
import { useTeacher } from '../contexts/TeacherContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import './TeacherModePanel.css'

const TeacherModePanel = memo(function TeacherModePanel({
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
      {/* Floating classroom button */}
      {!classroomMode && (
        <button
          className="tmp-classroom-btn"
          onClick={toggleClassroomMode}
          title="课堂模式"
        >
          演示
        </button>
      )}

      {/* Fullscreen classroom overlay */}
      {classroomMode && (
        <div className={`tmp-overlay ${darkMode ? 'tmp-dark' : ''}`}>
          {/* Top bar */}
          <div className="tmp-topbar">
            <div className="tmp-topbar-left">
              <button className="tmp-btn" onClick={toggleClassroomMode} title="退出 (Esc)">
                退出
              </button>
              <span className="tmp-step-info">
                步骤 {currentStep + 1} / {totalSteps}
              </span>
            </div>

            <div className="tmp-topbar-center">
              <button
                className={`tmp-btn ${autoPlay ? 'tmp-active' : ''}`}
                onClick={() => toggleAutoPlay(totalSteps, onStepChange)}
                title="自动播放 (空格)"
              >
                {autoPlay ? '暂停' : '播放'}
              </button>

              <button className="tmp-btn" onClick={cycleSpeed} title="播放速度">
                {playSpeed}x
              </button>

              <button
                className={`tmp-btn ${showSubtitles ? 'tmp-active' : ''}`}
                onClick={() => setShowSubtitles(!showSubtitles)}
                title="字幕"
              >
                字幕
              </button>

              <button
                className={`tmp-btn ${darkMode ? 'tmp-active' : ''}`}
                onClick={() => setDarkMode(!darkMode)}
                title="深色模式"
              >
                深色
              </button>
            </div>

            <div className="tmp-topbar-right">
              <button
                className="tmp-btn tmp-export-btn"
                onClick={onExportPPT}
                disabled={pptLoading}
                title="导出 PPT"
              >
                {pptLoading ? '生成中…' : '导出 PPT'}
              </button>
            </div>
          </div>

          {/* Navigation — left/right */}
          <button
            className="tmp-nav tmp-nav-left"
            onClick={() => {
              const newStep = Math.max(0, currentStep - 1)
              onStepChange?.(newStep)
            }}
            disabled={currentStep <= 0}
            title="上一步"
          >
            ←
          </button>

          <button
            className="tmp-nav tmp-nav-right"
            onClick={() => {
              const newStep = Math.min(totalSteps - 1, currentStep + 1)
              onStepChange?.(newStep)
            }}
            disabled={currentStep >= totalSteps - 1}
            title="下一步"
          >
            →
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
                title={`Step ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
})
export default TeacherModePanel
