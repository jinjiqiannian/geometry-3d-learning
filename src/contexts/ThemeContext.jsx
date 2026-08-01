// ═══════════════════════════════════════════════════════
//  ThemeContext — MVP 教材风格：固定浅色
//  （深色模式入口已从产品导航移除）
// ═══════════════════════════════════════════════════════
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'mathviz_theme'
const DATA_ATTR = 'data-theme'

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute(DATA_ATTR, theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = theme === 'dark' ? '#12121a' : '#f7f9fc'
  }
}

export function ThemeProvider({ children }) {
  // MVP：教材风固定浅色；清理历史 dark 偏好，避免黑底看不清
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    applyTheme('light')
    try {
      localStorage.setItem(STORAGE_KEY, 'light')
    } catch { /* */ }
  }, [])

  const setTheme = useCallback((t) => {
    // 产品暂不开放深色；保留 API 以免其它调用报错
    if (t === 'dark') return
    setThemeState('light')
    applyTheme('light')
  }, [])

  const toggleTheme = useCallback(() => {
    // no-op：深色已下线
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
