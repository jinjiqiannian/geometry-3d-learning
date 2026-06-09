import { useState } from 'react'
import { GEOMETRIES } from '../constants'
import './GeometryMiniControls.css'

export default function GeometryMiniControls({
  geometry,
  onGeometryChange,
  showFaces,
  onToggleFaces,
  showLabels,
  onToggleLabels,
  onResetCamera,
  onScreenshot,
}) {
  const [open, setOpen] = useState(false)

  const currentGeo = GEOMETRIES.find(g => g.id === geometry?.type) || GEOMETRIES[0]

  return (
    <div className="geo-mini-controls">
      <div className="gmc-bar">
        <button
          className="gmc-btn"
          onClick={() => setOpen(!open)}
        >
          {currentGeo.name} {open ? '▲' : '▼'}
        </button>

        <button
          className={`gmc-btn ${showFaces ? 'active' : ''}`}
          onClick={onToggleFaces}
        >
          {showFaces ? '实体' : '线框'}
        </button>

        <button
          className={`gmc-btn ${showLabels ? 'active' : ''}`}
          onClick={onToggleLabels}
        >
          标签
        </button>

        {onResetCamera && (
          <button className="gmc-btn" onClick={onResetCamera} title="重置视角">
            重置
          </button>
        )}

        {onScreenshot && (
          <button className="gmc-btn" onClick={onScreenshot} title="截图保存">
            截图
          </button>
        )}
      </div>

      {open && (
        <div className="gmc-dropdown">
          {GEOMETRIES.map(geo => (
            <button
              key={geo.id}
              className={`gmc-dropdown-item ${geo.id === geometry?.type ? 'active' : ''}`}
              onClick={() => { onGeometryChange?.(geo.id, { size: geometry?.params?.size || 2 }); setOpen(false) }}
            >
              <span className="gmc-geo-name">{geo.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
