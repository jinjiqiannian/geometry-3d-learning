import { NavLink, useLocation } from 'react-router-dom'
import { MODULES } from '../constants'
import './Sidebar.css'

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">📐</span>
            <span className="sidebar-logo-text">MathViz</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? '展开导航' : '折叠导航'}
        >
          {collapsed ? '☰' : '✕'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-nav-item home-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">🏠</span>
          {!collapsed && <span className="nav-label">首页</span>}
        </NavLink>

        <div className="nav-divider" />

        {MODULES.map(mod => (
          <NavLink
            key={mod.id}
            to={mod.available ? mod.path : '#'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''} ${!mod.available ? 'disabled' : ''}`
            }
            onClick={(e) => { if (!mod.available) e.preventDefault() }}
            style={{ '--mod-color': mod.color }}
          >
            <span className="nav-icon">{mod.icon}</span>
            {!collapsed && (
              <>
                <span className="nav-label">{mod.name}</span>
                {!mod.available && <span className="nav-badge">即将推出</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <span className="footer-text">数学可视化学习平台</span>
        </div>
      )}
    </aside>
  )
}
