import { Outlet, Link, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import './PageLayout.css'

export default function PageLayout() {
  const { user, signOut } = useSupabase()
  const location = useLocation()
  const isWorkspace = location.pathname === '/workspace'

  const handleAuth = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
  }

  return (
    <div className="page-layout">
      {/* Minimal top nav — hidden in workspace (toolbar takes over) */}
      {!isWorkspace && (
        <nav className="nav-bar">
          <Link to="/" className="nav-logo">
            MathViz
          </Link>

          <div className="nav-actions">
            <Link to="/pricing" className="nav-link">价格</Link>
            {user ? (
              <button className="nav-link" onClick={signOut}>
                {user.email?.split('@')[0]}
              </button>
            ) : (
              <button className="nav-link" onClick={handleAuth}>
                登录
              </button>
            )}
          </div>
        </nav>
      )}

      <main className="page-main">
        <Outlet />
      </main>
    </div>
  )
}
