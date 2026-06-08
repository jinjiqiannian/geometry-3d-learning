import { Link } from 'react-router-dom'
import './ModuleCard.css'

export default function ModuleCard({ module }) {
  const { id, name, icon, description, path, color, available } = module

  const cardContent = (
    <div
      className={`module-card ${available ? '' : 'disabled'}`}
      style={{ '--mod-color': color }}
    >
      <div className="module-card-icon-wrap" style={{ backgroundColor: `${color}15` }}>
        <span className="module-card-icon">{icon}</span>
      </div>
      <h3 className="module-card-name">{name}</h3>
      <p className="module-card-desc">{description}</p>
      {!available && (
        <span className="module-card-badge">即将推出</span>
      )}
    </div>
  )

  if (available) {
    return <Link to={path} className="module-card-link">{cardContent}</Link>
  }

  return cardContent
}
