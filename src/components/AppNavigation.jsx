import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import './AppNavigation.css'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/workspace', label: '工作台' },
  { path: '/mistakes', label: '错题本' },
  { path: '/progress', label: '进度' },
  { path: '/history', label: '历史' },
  { path: '/edumind', label: '考试分析' },
  { path: '/settings', label: '设置' },
]

function LogoIcon() {
  return (
    <svg className="app-nav-logo-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
      <path d="M3 9l13 7 13-7" />
      <path d="M16 23V9" />
      <path d="M8 13.5l8 4 8-4" />
      <path d="M8 18.5l8 4 8-4" />
    </svg>
  )
}

export default function AppNavigation() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-nav-logo">
          <LogoIcon />
          几何维度
        </Link>

        <nav className="app-nav-links" aria-label="主导航">
          {NAV_ITEMS.map(item => {
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
        </nav>
      </div>

      <div className="app-nav-right">
        <ThemeToggle />
        <UserMenu />
      </div>
    </nav>
  )
}
