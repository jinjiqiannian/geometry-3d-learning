import { useNavigate } from 'react-router-dom'
import { EXAMPLES } from '../constants'
import './ExampleCards.css'

export default function ExampleCards() {
  const navigate = useNavigate()

  const handleClick = (example) => {
    navigate(`/workspace?q=${encodeURIComponent(example.text)}`)
  }

  return (
    <div className="example-cards-section">
      <h3 className="example-cards-heading">💡 试试这些例子（点击直接体验）</h3>
      <div className="example-cards-grid">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            className="example-card"
            onClick={() => handleClick(ex)}
            style={{ '--card-color': ex.color }}
          >
            <span className="example-card-icon">{ex.icon}</span>
            <div className="example-card-body">
              <h4 className="example-card-title">{ex.title}</h4>
              <span className="example-card-cat">{ex.category}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
