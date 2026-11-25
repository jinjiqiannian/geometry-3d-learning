import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { useTheme } from '../contexts/ThemeContext'
import './AppNavigation.css'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/search', label: '搜题' },
  { path: '/teach', label: '教学' },
  { path: '/materials', label: '素材' },
  { path: '/explore', label: '探索' },
]

export default function AppNavigation() {
  const location = useLocation()
  const { toggleTheme, isDark } = useTheme()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <nav className="app-nav" aria-label="主导航">
      <div className="app-nav-left">
        <Link to="/" className="app-nav-logo">
          <BrandLogo className="app-nav-logo-icon" size={22} />
          <span className="app-nav-brand">即懂</span>
        </Link>

        <div className="app-nav-links">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`app-nav-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="app-nav-right">
        {/* 设置页已随自用版摘除，主题切换挪到这里，否则深色模式没有入口 */}
        <button
          type="button"
          className="app-nav-link app-nav-link--quiet"
          onClick={toggleTheme}
          aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDark ? '浅色' : '深色'}
        </button>
      </div>
    </nav>
  )
}
