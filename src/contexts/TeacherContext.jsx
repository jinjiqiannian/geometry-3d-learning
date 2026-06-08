// ═══════════════════════════════════════════════════════
//  TeacherContext — 教师模式状态管理
//  - 课堂演示模式（全屏3D + 自动播放 + 讲稿字幕）
//  - 讲稿数据
//  - 播放控制
// ═══════════════════════════════════════════════════════
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useSubscription } from './SubscriptionContext'

const TeacherContext = createContext(null)

export function TeacherProvider({ children }) {
  const { isTeacher } = useSubscription()

  // ── Classroom state ────────────────────────────
  const [classroomMode, setClassroomMode] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1) // 0.5 | 1 | 1.5 | 2
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [darkMode, setDarkMode] = useState(false) // 投屏优化

  // ── Narration ──────────────────────────────────
  const [narration, setNarration] = useState([]) // NarrationPhrase[]
  const [currentPhrase, setCurrentPhrase] = useState('')
  const [narrationLoading, setNarrationLoading] = useState(false)

  // ── Playback timer ─────────────────────────────
  const timerRef = useRef(null)
  const stepRef = useRef(0)

  // ── Enter/Exit classroom mode ─────────────────
  const enterClassroomMode = useCallback(() => {
    if (!isTeacher) return false
    setClassroomMode(true)
    if (typeof document !== 'undefined') {
      document.documentElement.requestFullscreen?.()
    }
    return true
  }, [isTeacher])

  const exitClassroomMode = useCallback(() => {
    setClassroomMode(false)
    setAutoPlay(false)
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.()
    }
  }, [])

  const toggleClassroomMode = useCallback(() => {
    if (classroomMode) {
      exitClassroomMode()
    } else {
      enterClassroomMode()
    }
  }, [classroomMode, enterClassroomMode, exitClassroomMode])

  // ── Auto-play control ─────────────────────────
  const startAutoPlay = useCallback((totalSteps, onStepChange) => {
    setAutoPlay(true)
    stepRef.current = 0

    const advance = () => {
      stepRef.current++
      if (stepRef.current < totalSteps) {
        onStepChange?.(stepRef.current)
        // Get duration from current narration or default
        const phrase = narration[stepRef.current]
        const delay = phrase?.delay || 3000
        const adjustedDelay = delay / playSpeed
        timerRef.current = setTimeout(advance, adjustedDelay)
      } else {
        setAutoPlay(false)
        stepRef.current = 0
      }
    }

    // Start with step 0 immediately
    onStepChange?.(0)
    const firstDelay = narration[0]?.delay || 3000
    timerRef.current = setTimeout(advance, firstDelay / playSpeed)
  }, [narration, playSpeed])

  const stopAutoPlay = useCallback(() => {
    setAutoPlay(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const toggleAutoPlay = useCallback((totalSteps, onStepChange) => {
    if (autoPlay) {
      stopAutoPlay()
    } else {
      startAutoPlay(totalSteps, onStepChange)
    }
  }, [autoPlay, startAutoPlay, stopAutoPlay])

  // ── Speed cycle ───────────────────────────────
  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 1, 1.5, 2]
    const currentIdx = speeds.indexOf(playSpeed)
    const nextIdx = (currentIdx + 1) % speeds.length
    setPlaySpeed(speeds[nextIdx])
  }, [playSpeed])

  // ── Keyboard shortcuts ────────────────────────
  useEffect(() => {
    if (!classroomMode) return

    const handleKey = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggleAutoPlay(0, () => {})
          break
        case 'ArrowLeft':
          // prevStep — dispatched via custom event
          window.dispatchEvent(new CustomEvent('classroom:prevStep'))
          break
        case 'ArrowRight':
          // nextStep — dispatched via custom event
          window.dispatchEvent(new CustomEvent('classroom:nextStep'))
          break
        case 'Escape':
          exitClassroomMode()
          break
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) break // Don't override browser find
          setDarkMode(d => !d)
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [classroomMode, toggleAutoPlay, exitClassroomMode])

  // ── Cleanup timer on unmount ──────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const value = {
    // Classroom mode
    classroomMode,
    enterClassroomMode,
    exitClassroomMode,
    toggleClassroomMode,

    // Auto play
    autoPlay,
    startAutoPlay,
    stopAutoPlay,
    toggleAutoPlay,
    playSpeed,
    cycleSpeed,

    // Subtitles
    showSubtitles,
    setShowSubtitles,
    currentPhrase,
    setCurrentPhrase,

    // Dark mode
    darkMode,
    setDarkMode,

    // Narration
    narration,
    setNarration,
    narrationLoading,
    setNarrationLoading,
  }

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  )
}

export function useTeacher() {
  const ctx = useContext(TeacherContext)
  if (!ctx) throw new Error('useTeacher must be used within TeacherProvider')
  return ctx
}

export default TeacherContext
