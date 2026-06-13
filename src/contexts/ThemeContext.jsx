// ═══════════════════════════════════════════════════════
//  ThemeContext — 全局主题 (light/dark) 状态管理
//  适配系统偏好 · localStorage 持久化 · 无闪烁
// ═══════════════════════════════════════════════════════
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'mathviz_theme'
const DATA_ATTR = 'data-theme'

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute(DATA_ATTR, theme)
  // 更新 theme-color meta 标签
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = theme === 'dark' ? '#12121a' : '#4A90E2'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // 1. 本地存储
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light') return stored
    } catch { /* */ }
    // 2. 系统偏好
    return getSystemTheme()
  })

  // ── Apply theme on mount & change ──
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* */ }
  }, [theme])

  // ── Listen for system preference changes ──
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored || stored === 'system') {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((t) => {
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeContext
