import { useMemo } from 'react'
import { getLineDefinitions, CATEGORY_NAMES, CATEGORY_ORDER, PRESETS } from '../engines/lineDefinitions'
import './LineControlPanel.css'

export default function LineControlPanel({
  geometry, visibleLines, setVisibleLines, hoveredLine, setHoveredLine
}) {
  const { type, params } = geometry
  const size = params.size ?? 2

  // 获取当前几何体的所有线段
  const { lines } = useMemo(() => getLineDefinitions(type, params), [type, size])

  // 按分类分组
  const grouped = useMemo(() => {
    const map = {}
    lines.forEach(l => {
      if (!map[l.category]) map[l.category] = []
      map[l.category].push(l)
    })
    // 按 CATEGORY_ORDER 排序
    const ordered = {}
    CATEGORY_ORDER.forEach(cat => {
      if (map[cat]) ordered[cat] = map[cat]
    })
    // 未在 order 中的追加
    Object.keys(map).forEach(cat => {
      if (!ordered[cat]) ordered[cat] = map[cat]
    })
    return ordered
  }, [lines])

  const lineKey = (l) => `${l.id}|${l.category}`

  // 分类全选/取消
  const toggleCategory = (cat, lines) => {
    setVisibleLines(prev => {
      const next = new Set(prev)
      const keys = lines.map(l => lineKey(l))
      const allOn = keys.every(k => next.has(k))
      if (allOn) keys.forEach(k => next.delete(k))
      else keys.forEach(k => next.add(k))
      return next
    })
  }

  // 单线切换
  const toggleLine = (l) => {
    setVisibleLines(prev => {
      const next = new Set(prev)
      const k = lineKey(l)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // 一键操作
  const applyPreset = (name) => {
    const fn = PRESETS[name]
    if (fn) {
      const result = fn(type)
      // 确保使用当前 size 重新生成 keys（size 可能不同）
      const { lines: currentLines } = getLineDefinitions(type, params)
      const keys = currentLines.map(l => lineKey(l))
      const filtered = new Set()
      keys.forEach(k => {
        // 用原始 line id 匹配（同一 line 在不同 size 下 id 相同）
        const baseId = k.split('|')[0]
        // 检查 result 中是否有该 id 的任一条目
        for (const rk of result) {
          if (rk.split('|')[0] === baseId && rk.split('|')[1] === k.split('|')[1]) {
            filtered.add(k)
            break
          }
        }
      })
      setVisibleLines(filtered)
    }
  }

  // 分类部分选中状态
  const catState = (cat, catLines) => {
    const keys = catLines.map(l => lineKey(l))
    const on = keys.filter(k => visibleLines.has(k)).length
    if (on === 0) return 'none'
    if (on === keys.length) return 'all'
    return 'some'
  }

  return (
    <div className="line-control-panel">
      <h2>📏 线条控制</h2>

      {/* 一键操作 */}
      <div className="preset-row">
        {Object.keys(PRESETS).map(name => (
          <button key={name} className="preset-btn" onClick={() => applyPreset(name)}>
            {name}
          </button>
        ))}
      </div>

      {/* 分类列表 */}
      <div className="line-list">
        {Object.entries(grouped).map(([cat, catLines]) => {
          const state = catState(cat, catLines)
          return (
            <div key={cat} className="line-category">
              <label
                className={`cat-label ${state === 'some' ? 'partial' : ''}`}
                onMouseEnter={() => setHoveredLine(null)}
              >
                <input
                  type="checkbox"
                  checked={state === 'all'}
                  ref={el => { if (el) el.indeterminate = state === 'some' }}
                  onChange={() => toggleCategory(cat, catLines)}
                />
                <span>{CATEGORY_NAMES[cat] || cat}</span>
                <span className="cat-count">{catLines.length}</span>
              </label>

              {/* 单条线 */}
              <div className="line-items">
                {catLines.map(l => {
                  const k = lineKey(l)
                  const on = visibleLines.has(k)
                  const v0 = l.from, v1 = l.to
                  const label = typeof v0 === 'number' && typeof v1 === 'number'
                    ? l.id
                    : l.id
                  return (
                    <label
                      key={k}
                      className={`line-item ${hoveredLine === k ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredLine(k)}
                      onMouseLeave={() => setHoveredLine(null)}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleLine(l)}
                      />
                      <span>{label}</span>
                      {l.dashed && <span className="dash-hint">┅</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
