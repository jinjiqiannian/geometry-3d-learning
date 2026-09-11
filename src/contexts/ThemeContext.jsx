// ═══════════════════════════════════════════════════════
//  ThemeContext — 全站固定浅色主题（深色模式已下线）
//  保留 useTheme 接口（theme/isDark/setTheme/toggleTheme），
//  isDark 恒为 false，避免消费组件改动；dark 相关 CSS 块永不生效。
// ═══════════════════════════════════════════════════════
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'jidong_theme'
const DATA_ATTR = 'data-theme'
const THEME = 'light'

function applyTheme() {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute(DATA_ATTR, THEME)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = '#F7F9FE'
  }
}

export function ThemeProvider({ children }) {
  const [theme] = useState(THEME)

  useEffect(() => {
    applyTheme()
    // 清掉老版本遗留的 dark 偏好，避免误用
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* */ }
  }, [])

  const setTheme = useCallback(() => { /* 深色模式已下线，仅保留接口 */ }, [])
  const toggleTheme = useCallback(() => { /* 深色模式已下线，仅保留接口 */ }, [])

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
