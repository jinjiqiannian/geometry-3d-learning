import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { getVertexAndEdgeInfo } from '../../engines/geometryEngine'
import { parseVertexChain, getAutocompleteSuggestions } from '../../engines/lineConnector'
import { getLineDefinitions } from '../../engines/lineDefinitions'
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

    if (trimmed.length < 2) {
      setMessage('请输入至少两个顶点标签，如 AC')
      return
    }

    // ── 顺序连线：尝试解析为顶点链 ──
    const chain = parseVertexChain(trimmed, labels)
    if (chain && chain.length >= 2) {
      const { lines: existingLines } = getLineDefinitions(type, params)
      const allKeys = new Set([
        ...existingLines.map(l => `${l.id}|${l.category}`),
        ...existingKeys,
      ])

      const added = []
      const skipped = []
      for (let i = 0; i < chain.length - 1; i++) {
        const a = chain[i]
        const b = chain[i + 1]
        const pairId = a.label + b.label
        if ([...allKeys].some(k => k.startsWith(pairId + '|'))) {
          skipped.push(pairId)
          continue
        }
        onAddLine({ fromIdx: a.idx, toIdx: b.idx, id: pairId })
        added.push(pairId)
        allKeys.add(pairId + '|') // 防止同次输入重复添加
      }

      setInput('')
      setActiveIdx(-1)
      if (added.length > 0) {
        setMessage(`已添加 ${added.join(' → ')}`)
      } else if (skipped.length > 0) {
        setMessage(`${skipped.join(', ')} 已存在`)
      } else {
        setMessage(`无法识别 "${trimmed}"`)
      }
      return
    }

    // ── 回退：尝试识别为单个顶点对 ──
    setMessage(`无法识别 "${trimmed}"，请输入有效顶点序列，如 AC 或 ACBD`)
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
          placeholder="输入顶点序列，如 AC 或 ACBD"
          spellCheck={false}
          autoComplete="off"
        />
        <button className="ac-btn" onClick={handleSubmit} title="顺序连线">
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
