import './GeometrySelector.css'

const GEOMETRIES = [
  { id: 'cube', name: '正方体', icon: '' },
  { id: 'sphere', name: '球体', icon: '' },
  { id: 'cylinder', name: '圆柱', icon: '' },
  { id: 'cone', name: '圆锥', icon: '' },
  { id: 'pyramid', name: '棱锥', icon: '' },
  { id: 'prism', name: '棱柱', icon: '' },
]

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
