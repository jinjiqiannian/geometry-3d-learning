import { Link, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
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
    <svg className="app-nav-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" />
      <path d="M2 7l10 5 10-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

export default function AppNavigation() {
  const location = useLocation()
  const { user, signOut } = useSupabase()
  const { isPro, isTeacher, plan } = useSubscription()

  const handleAuth = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
  }

  const handleUpgrade = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-paywall'))
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const planBadge = () => {
    if (isTeacher) return { label: '教师版', className: 'teacher' }
    if (isPro) return { label: '专业版', className: 'pro' }
    return { label: '免费版', className: 'free' }
  }

  const badge = planBadge()

  return (
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-nav-logo">
          <LogoIcon />
          几何维度
        </Link>

        <div className="app-nav-links">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`app-nav-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="app-nav-right">
        <button
          className={`app-nav-plan-badge ${badge.className}`}
          onClick={handleUpgrade}
        >
          {badge.label}
        </button>

        {user ? (
          <button className="app-nav-auth-btn" onClick={signOut}>
            {user.email?.split('@')[0]}
          </button>
        ) : (
          <button className="app-nav-auth-btn" onClick={handleAuth}>
            登录
          </button>
        )}
      </div>
    </nav>
  )
}
