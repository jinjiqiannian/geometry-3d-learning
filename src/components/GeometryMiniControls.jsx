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
}) {
  const [open, setOpen] = useState(false)

  const currentGeo = GEOMETRIES.find(g => g.id === geometry?.type) || GEOMETRIES[0]

  return (
    <div className="geo-mini-controls">
      <div className="gmc-bar">
        <button
          className="gmc-btn"
          onClick={() => setOpen(!open)}
          title="切换几何体"
        >
          {currentGeo.icon} {currentGeo.name} {open ? '▲' : '▼'}
        </button>

        <button
          className={`gmc-btn ${showFaces ? 'active' : ''}`}
          onClick={onToggleFaces}
          title={showFaces ? '实体面' : '线框'}
        >
          {showFaces ? '🧊' : '🔲'}
        </button>

        <button
          className={`gmc-btn ${showLabels ? 'active' : ''}`}
          onClick={onToggleLabels}
          title={showLabels ? '显示标签' : '隐藏标签'}
        >
          {showLabels ? '🏷️' : '🏷️'}
        </button>
      </div>

      {open && (
        <div className="gmc-dropdown">
          {GEOMETRIES.map(geo => (
            <button
              key={geo.id}
              className={`gmc-dropdown-item ${geo.id === geometry?.type ? 'active' : ''}`}
              onClick={() => { onGeometryChange?.(geo.id, { size: geometry?.params?.size || 2 }); setOpen(false) }}
            >
              <span className="gmc-geo-icon">{geo.icon}</span>
              <span className="gmc-geo-name">{geo.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
