import { memo, useState, useRef, useEffect } from 'react'
import './GeometryMiniControls.css'

const GeometryMiniControls = memo(function GeometryMiniControls({
  showFaces,
  onToggleFaces,
  onResetCamera,
  cameraHint,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="geo-mini-controls">
      <div className="gmc-bar">
        <button
          className={`gmc-btn ${showFaces ? 'active' : ''}`}
          onClick={onToggleFaces}
          title={showFaces ? '隐藏面' : '显示面'}
        >
          {showFaces ? '实体' : '线框'}
        </button>

        {onResetCamera && (
          <div className="gmc-more" ref={menuRef}>
            <button
              className="gmc-btn gmc-btn-more"
              onClick={() => setMenuOpen((v) => !v)}
              title="更多"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              ···
            </button>
            {menuOpen && (
              <div className="gmc-menu" role="menu">
                <button
                  className="gmc-menu-item"
                  role="menuitem"
                  onClick={() => {
                    onResetCamera()
                    setMenuOpen(false)
                  }}
                  title={cameraHint || '重置视角'}
                >
                  重置视角
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default GeometryMiniControls
