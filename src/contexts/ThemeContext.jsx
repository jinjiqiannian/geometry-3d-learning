// ═══════════════════════════════════════════════════════
//  ThemeContext — 深色默认（ins 风冷调 + harness 渐变底）
// ═══════════════════════════════════════════════════════
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'jidong_theme'
const DATA_ATTR = 'data-theme'

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute(DATA_ATTR, theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = theme === 'dark' ? '#0E1830' : '#FFFBF7'
  }
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* */ }
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme())

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch { /* */ }
  }, [theme])

  const setTheme = useCallback((t) => {
    if (t !== 'dark' && t !== 'light') return
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
