import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { useTheme } from '../contexts/ThemeContext'
import './AppNavigation.css'

const NAV_ITEMS = [
  { path: '/teach', label: '教学' },
  { path: '/search', label: '搜题' },
  { path: '/history', label: '历史' },
]

export default function AppNavigation() {
  const location = useLocation()
  const { theme, toggleTheme, isDark } = useTheme()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

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
        <Link
          to="/settings"
          className={`app-nav-link app-nav-link--quiet${isActive('/settings') ? ' active' : ''}`}
        >
          设置
        </Link>
      </div>
    </nav>
  )
}
