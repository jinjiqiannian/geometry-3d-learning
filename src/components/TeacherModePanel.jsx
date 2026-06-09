// ═══════════════════════════════════════════════════════
//  TeacherModePanel — Classroom presentation controls
//  Fullscreen 3D + auto-play + subtitles + PPT export
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
      {/* Floating classroom button */}
      {!classroomMode && (
        <button
          className="tmp-classroom-btn"
          onClick={toggleClassroomMode}
          title="Classroom mode"
        >
          Present
        </button>
      )}

      {/* Fullscreen classroom overlay */}
      {classroomMode && (
        <div className={`tmp-overlay ${darkMode ? 'tmp-dark' : ''}`}>
          {/* Top bar */}
          <div className="tmp-topbar">
            <div className="tmp-topbar-left">
              <button className="tmp-btn" onClick={toggleClassroomMode} title="Exit (Esc)">
                Exit
              </button>
              <span className="tmp-step-info">
                Step {currentStep + 1} / {totalSteps}
              </span>
            </div>

            <div className="tmp-topbar-center">
              <button
                className={`tmp-btn ${autoPlay ? 'tmp-active' : ''}`}
                onClick={() => toggleAutoPlay(totalSteps, onStepChange)}
                title="Auto-play (Space)"
              >
                {autoPlay ? 'Pause' : 'Play'}
              </button>

              <button className="tmp-btn" onClick={cycleSpeed} title="Playback speed">
                {playSpeed}x
              </button>

              <button
                className={`tmp-btn ${showSubtitles ? 'tmp-active' : ''}`}
                onClick={() => setShowSubtitles(!showSubtitles)}
                title="Subtitles"
              >
                CC
              </button>

              <button
                className={`tmp-btn ${darkMode ? 'tmp-active' : ''}`}
                onClick={() => setDarkMode(!darkMode)}
                title="Dark mode"
              >
                Dark
              </button>
            </div>

            <div className="tmp-topbar-right">
              <button
                className="tmp-btn tmp-export-btn"
                onClick={onExportPPT}
                disabled={pptLoading}
                title="Export PPT"
              >
                {pptLoading ? 'Generating…' : 'Export PPT'}
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
            title="Previous"
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
            title="Next"
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
}
