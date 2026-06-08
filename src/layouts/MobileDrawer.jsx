import { useNavigate } from 'react-router-dom'
import { MODULES } from '../constants'
import './MobileDrawer.css'

export default function MobileDrawer({ open, onClose }) {
  const navigate = useNavigate()

  if (!open) return null

  const handleNavigate = (mod) => {
    if (mod.available) {
      navigate(mod.path)
      onClose()
    }
  }

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">全部模块</h2>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-modules">
          {MODULES.map(mod => (
            <button
              key={mod.id}
              className={`drawer-module ${mod.available ? '' : 'disabled'}`}
              onClick={() => handleNavigate(mod)}
              style={{ '--mod-color': mod.color }}
            >
              <span className="drawer-module-icon">{mod.icon}</span>
              <div className="drawer-module-info">
                <span className="drawer-module-name">{mod.name}</span>
                <span className="drawer-module-desc">{mod.description}</span>
              </div>
              {mod.available ? (
                <span className="drawer-arrow">→</span>
              ) : (
                <span className="drawer-badge">即将推出</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
