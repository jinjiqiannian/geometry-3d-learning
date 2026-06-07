import { GEOMETRIES } from '../constants'
import './GeometrySelector.css'

export default function GeometrySelector({ onSelect, currentType }) {
  return (
    <div className="geometry-selector">
      {GEOMETRIES.map(geo => (
        <button
          key={geo.id}
          className={`geo-btn ${currentType === geo.id ? 'active' : ''}`}
          onClick={() => onSelect(geo.id, { size: 2 })}
          title={geo.name}
        >
          <span className="icon">{geo.icon}</span>
          <span className="label">{geo.name}</span>
        </button>
      ))}
    </div>
  )
}
