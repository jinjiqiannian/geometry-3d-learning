import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './HeroInput.css'

export default function HeroInput() {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()
  const textareaRef = useRef(null)

  const handleGenerate = () => {
    const text = input.trim()
    if (text.length < 3) return
    navigate(`/workspace?q=${encodeURIComponent(text)}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className={`hero-input-wrap ${focused ? 'focused' : ''}`}>
      <div className="hero-input-inner">
        <textarea
          ref={textareaRef}
          className="hero-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="输入任意数学题..."
          rows={3}
          spellCheck={false}
        />
        <div className="hero-input-actions">
          <span className="hero-input-hint">
            {input.trim().length < 3 ? '至少输入3个字符' : '按 Enter 生成'}
          </span>
          <button
            className="hero-input-btn"
            onClick={handleGenerate}
            disabled={input.trim().length < 3}
          >
            👉 生成解题可视化
          </button>
        </div>
      </div>
    </div>
  )
}
