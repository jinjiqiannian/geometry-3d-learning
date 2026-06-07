import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { getVertexAndEdgeInfo } from '../engines/geometryEngine'
import { getAutocompleteSuggestions } from '../engines/lineConnector'
import { getLineDefinitions } from '../engines/lineDefinitions'
import './AutoConnect.css'

export default function AutoConnect({ geometry, existingKeys, onAddLine }) {
  const { type, params } = geometry
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { labels } = useMemo(() => getVertexAndEdgeInfo(type, params), [type, params.size])

  // 生成建议列表
  const suggestions = useMemo(() => {
    if (!input || input.length < 2) return []
    return getAutocompleteSuggestions(input, labels, existingKeys)
  }, [input, labels, existingKeys])

  // 重置状态
  useEffect(() => {
    setInput('')
    setActiveIdx(-1)
    setMessage('')
    setFocused(false)
  }, [type])

  // 键盘导航
  const handleKeyDown = useCallback((e) => {
    if (suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        handleSelect(suggestions[activeIdx])
      } else {
        handleSubmit()
      }
    } else if (e.key === 'Escape') {
      setFocused(false)
    }
  }, [suggestions, activeIdx])

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) { setMessage(''); return }

    // 先从建议列表中查找完全匹配
    const match = suggestions.find(s => s.label === trimmed)
    if (match) {
      handleSelect(match)
      return
    }

    // 尝试手动解析
    if (trimmed.length < 2) {
      setMessage('请输入至少两个顶点标签，如 AC')
      return
    }

    // 尝试逐字符匹配标签
    const { lines: existingLines } = getLineDefinitions(type, params)
    const allKeys = new Set([
      ...existingLines.map(l => `${l.id}|${l.category}`),
      ...existingKeys,
    ])

    // 找到完全匹配输入的有效顶点对
    let found = false
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const pair = labels[i] + labels[j]
        if (pair === trimmed) {
          // 检查是否已存在
          if ([...allKeys].some(k => k.startsWith(pair + '|'))) {
            setMessage(`线段 ${pair} 已存在`)
            return
          }
          onAddLine({ fromIdx: i, toIdx: j, id: pair })
          setInput('')
          setMessage(`已添加 ${pair}`)
          setActiveIdx(-1)
          found = true
          break
        }
      }
      if (found) break
    }

    if (!found) {
      setMessage(`无法识别 "${trimmed}"，请使用有效顶点标签`)
    }
  }, [input, suggestions, labels, existingKeys, onAddLine, type, params])

  const handleSelect = useCallback((suggestion) => {
    onAddLine({ fromIdx: suggestion.fromIdx, toIdx: suggestion.toIdx, id: suggestion.label })
    setInput('')
    setMessage(`已添加 ${suggestion.label}`)
    setActiveIdx(-1)
    setFocused(false)
  }, [onAddLine])

  // 自动清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 2500)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="auto-connect">
      <div className="ac-input-row">
        <input
          ref={inputRef}
          className="ac-input"
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setActiveIdx(-1); setMessage('') }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="输入顶点对，如 AC"
          spellCheck={false}
          autoComplete="off"
        />
        <button className="ac-btn" onClick={handleSubmit} title="添加连线">
          ＋
        </button>
      </div>

      {/* 自动补全下拉 */}
      {focused && suggestions.length > 0 && (
        <ul className="ac-suggestions" ref={listRef}>
          {suggestions.map((s, i) => (
            <li
              key={s.label}
              className={`ac-suggestion-item ${i === activeIdx ? 'active' : ''}`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="ac-sug-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 消息提示 */}
      {message && (
        <div className={`ac-message ${message.startsWith('已添加') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  )
}
