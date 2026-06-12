import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import { useSubscription } from '../contexts/SubscriptionContext'
import './AppNavigation.css'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/workspace', label: '工作台' },
  { path: '/history', label: '历史' },
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
  const { plan, isPro } = useSubscription()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const planLabel = () => {
    if (plan === 'teacher') return '教师版'
    if (plan === 'pro') return 'Pro'
    return '免费版'
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
        <Link
          to="/pricing"
          className={`app-nav-pricing ${isPro ? 'is-pro' : ''}`}
        >
          {planLabel()}
          {!isPro && <span className="app-nav-upgrade-dot" />}
        </Link>
        <UserMenu />
      </div>
    </nav>
  )
}
