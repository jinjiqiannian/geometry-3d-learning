import { useNavigate, useLocation } from 'react-router-dom'
import { MODULES } from '../constants'
import './BottomNav.css'

export default function BottomNav({ onMoreClick }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">首页</span>
      </button>

      <button
        className={`bottom-nav-item ${isActive('/geometry-3d') ? 'active' : ''}`}
        onClick={() => navigate('/geometry-3d')}
      >
        <span className="bottom-nav-icon">📐</span>
        <span className="bottom-nav-label">立体几何</span>
      </button>

      <button
        className="bottom-nav-item"
        onClick={onMoreClick}
      >
        <span className="bottom-nav-icon">⋯</span>
        <span className="bottom-nav-label">更多</span>
      </button>
    </nav>
  )
}
