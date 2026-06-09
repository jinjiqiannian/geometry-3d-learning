import { Link, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import './AppNavigation.css'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/workspace', label: '工作台' },
  { path: '/history', label: '历史' },
  { path: '/settings', label: '设置' },
]

export default function AppNavigation() {
  const location = useLocation()
  const { user, signOut } = useSupabase()

  const handleAuth = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-nav-logo">
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
        {user ? (
          <button className="app-nav-link" onClick={signOut}>
            {user.email?.split('@')[0]}
          </button>
        ) : (
          <button className="app-nav-link" onClick={handleAuth}>
            登录
          </button>
        )}
      </div>
    </nav>
  )
}
