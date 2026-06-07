import { useMemo, useCallback } from 'react'
import AutoConnect from './AutoConnect'
import { getLineDefinitions, CATEGORY_NAMES, CATEGORY_ORDER, PRESETS } from '../engines/lineDefinitions'
import { detectLineType, generateOperationLines, searchLines } from '../engines/lineConnector'
import './LineControlPanel.css'
import './AutoConnect.css'

export default function LineControlPanel({
  geometry, visibleLines, setVisibleLines, hoveredLine, setHoveredLine,
  customLines, setCustomLines,
  shownLengthLabels, setShownLengthLabels,
  searchedLine, setSearchedLine,
}) {
  const { type, params } = geometry
  const size = params.size ?? 2

  // 获取当前几何体的所有预定义线段
  const { lines: predefinedLines } = useMemo(() => getLineDefinitions(type, params), [type, size])

  // 合并所有线段（预定义 + 自定义）
  const allLines = useMemo(() => [...predefinedLines, ...customLines], [predefinedLines, customLines])

  // 按自定义/预定义分组的线段
  const grouped = useMemo(() => {
    const map = {}
    // 先添加自定义线段组
    if (customLines.length > 0) {
      map['自定义线段'] = customLines
    }
    // 再添加预定义线段组
    allLines.forEach(l => {
      if (l.custom) return // 自定义线段已在上面
      if (!map[l.category]) map[l.category] = []
      map[l.category].push(l)
    })
    // 排序
    const ordered = {}
    if (map['自定义线段']) ordered['自定义线段'] = map['自定义线段']
    CATEGORY_ORDER.forEach(cat => {
      if (map[cat]) ordered[cat] = map[cat]
    })
    Object.keys(map).forEach(cat => {
      if (!ordered[cat]) ordered[cat] = map[cat]
    })
    return ordered
  }, [allLines, customLines])

  const lineKey = (l) => `${l.id}|${l.category}`

  // ── 搜索匹配 ──
  const searchMatches = useMemo(() => {
    if (!searchedLine) return new Set()
    const matches = searchLines(searchedLine, allLines)
    return new Set(matches)
  }, [searchedLine, allLines])

  // ── 分类全选/取消 ──
  const toggleCategory = (cat, catLines) => {
    setVisibleLines(prev => {
      const next = new Set(prev)
      const keys = catLines.map(l => lineKey(l))
      const allOn = keys.every(k => next.has(k))
      if (allOn) keys.forEach(k => next.delete(k))
      else keys.forEach(k => next.add(k))
      return next
    })
  }

  // ── 单线切换 ──
  const toggleLine = (l) => {
    setVisibleLines(prev => {
      const next = new Set(prev)
      const k = lineKey(l)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // ── 长度标签切换 ──
  const toggleLengthLabel = (l) => {
    setShownLengthLabels(prev => {
      const next = new Set(prev)
      const k = lineKey(l)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // ── 一键操作 ──
  const applyPreset = (name) => {
    const fn = PRESETS[name]
    if (fn) {
      const result = fn(type)
      const { lines: currentLines } = getLineDefinitions(type, params)
      const allCurrent = [...currentLines, ...customLines]
      const keys = allCurrent.map(l => lineKey(l))
      const filtered = new Set()
      keys.forEach(k => {
        const baseId = k.split('|')[0]
        const cat = k.split('|')[1]
        for (const rk of result) {
          if (rk.split('|')[0] === baseId && rk.split('|')[1] === cat) {
            filtered.add(k)
            break
          }
        }
      })
      setVisibleLines(filtered)
    }
  }

  // ── 添加自定义线段 ──
  const handleAddLine = useCallback(({ fromIdx, toIdx, id }) => {
    const { category, dashed } = detectLineType(fromIdx, toIdx, type, params)
    const customLine = {
      id,
      category,
      from: fromIdx,
      to: toIdx,
      dashed,
      custom: true,
    }
    setCustomLines(prev => {
      // 检查重复
      if (prev.some(l => l.id === id && l.category === category)) return prev
      return [...prev, customLine]
    })
    // 自动设为可见
    setVisibleLines(prev => {
      const next = new Set(prev)
      next.add(`${id}|${category}`)
      return next
    })
  }, [type, params, setCustomLines, setVisibleLines])

  // ── 删除自定义线段 ──
  const removeCustomLine = (l) => {
    const k = lineKey(l)
    setCustomLines(prev => prev.filter(cl => !(cl.id === l.id && cl.category === l.category)))
    setVisibleLines(prev => {
      const next = new Set(prev)
      next.delete(k)
      return next
    })
    setShownLengthLabels(prev => {
      const next = new Set(prev)
      next.delete(k)
      return next
    })
  }

  // ── 一键生成辅助线 ──
  const handleOperation = (operation) => {
    const generated = generateOperationLines(type, operation, params)
    const newLines = []
    const newKeys = []
    generated.forEach(gl => {
      const alreadyExists = customLines.some(l => l.id === gl.id && l.category === gl.category)
      if (!alreadyExists) {
        newLines.push({ ...gl, custom: true })
        newKeys.push(`${gl.id}|${gl.category}`)
      }
    })
    if (newLines.length > 0) {
      setCustomLines(prev => [...prev, ...newLines])
      setVisibleLines(prev => {
        const next = new Set(prev)
        newKeys.forEach(k => next.add(k))
        return next
      })
    }
  }

  // ── 删除所有自定义线段 ──
  const clearCustomLines = () => {
    const keys = customLines.map(l => lineKey(l))
    setCustomLines([])
    setVisibleLines(prev => {
      const next = new Set(prev)
      keys.forEach(k => next.delete(k))
      return next
    })
    setShownLengthLabels(prev => {
      const next = new Set(prev)
      keys.forEach(k => next.delete(k))
      return next
    })
  }

  // ── 分类部分选中状态 ──
  const catState = (catLines) => {
    const keys = catLines.map(l => lineKey(l))
    const on = keys.filter(k => visibleLines.has(k)).length
    if (on === 0) return 'none'
    if (on === keys.length) return 'all'
    return 'some'
  }

  // 已有的线段 keys（用于自动补全去重）
  const existingKeys = useMemo(() => new Set(allLines.map(l => lineKey(l))), [allLines])

  return (
    <div className="line-control-panel">
      <h2>📏 线条控制</h2>

      {/* ── 自动连线 ── */}
      <div className="panel-subsection">
        <h3 className="subsection-title">🔗 自动连线</h3>
        <AutoConnect
          geometry={geometry}
          existingKeys={existingKeys}
          onAddLine={handleAddLine}
        />
        {customLines.length > 0 && (
          <button className="clear-custom-btn" onClick={clearCustomLines}>
            清除自定义 ({customLines.length})
          </button>
        )}
      </div>

      {/* ── 快速工具 ── */}
      <div className="panel-subsection">
        <h3 className="subsection-title">⚡ 快速工具</h3>
        <div className="tool-buttons">
          <button className="tool-btn" onClick={() => handleOperation('diagonals')}>🔷 连接对角线</button>
          <button className="tool-btn" onClick={() => handleOperation('height')}>📐 作高</button>
          <button className="tool-btn" onClick={() => handleOperation('median')}>📏 作中线</button>
        </div>
      </div>

      {/* ── 搜索 ── */}
      <div className="panel-subsection">
        <h3 className="subsection-title">🔍 搜索</h3>
        <input
          className="search-input"
          type="text"
          placeholder="搜索线段，如 AC / 对角"
          value={searchedLine}
          onChange={(e) => setSearchedLine(e.target.value)}
          spellCheck={false}
        />
        {searchedLine && (
          <span className="search-count">
            {searchMatches.size > 0 ? `匹配 ${searchMatches.size} 条` : '无匹配'}
          </span>
        )}
      </div>

      {/* ── 一键操作 ── */}
      <div className="preset-row">
        {Object.keys(PRESETS).map(name => (
          <button key={name} className="preset-btn" onClick={() => applyPreset(name)}>
            {name}
          </button>
        ))}
      </div>

      {/* ── 分类列表 ── */}
      <div className="line-list">
        {Object.entries(grouped).map(([cat, catLines]) => {
          const state = catState(catLines)
          const isCustomCat = cat === '自定义线段'
          return (
            <div key={cat} className="line-category">
              <label
                className={`cat-label ${state === 'some' ? 'partial' : ''} ${isCustomCat ? 'custom-cat' : ''}`}
                onMouseEnter={() => setHoveredLine(null)}
              >
                <input
                  type="checkbox"
                  checked={state === 'all'}
                  ref={el => { if (el) el.indeterminate = state === 'some' }}
                  onChange={() => toggleCategory(cat, catLines)}
                />
                <span>{isCustomCat ? '✏️ 自定义线段' : (CATEGORY_NAMES[cat] || cat)}</span>
                <span className="cat-count">{catLines.length}</span>
              </label>

              {/* 单条线 */}
              <div className="line-items">
                {catLines.map(l => {
                  const k = lineKey(l)
                  const on = visibleLines.has(k)
                  const showLen = shownLengthLabels.has(k)
                  const hovered = hoveredLine === k
                  const searched = searchMatches.has(k)

                  return (
                    <label
                      key={k}
                      className={`line-item ${hovered ? 'hovered' : ''} ${searched ? 'searched' : ''}`}
                      onMouseEnter={() => setHoveredLine(k)}
                      onMouseLeave={() => setHoveredLine(null)}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleLine(l)}
                      />
                      <span className="line-id">{l.id}</span>
                      {l.dashed && <span className="dash-hint">┅</span>}
                      {/* 长度标签开关 */}
                      <button
                        className={`len-toggle ${showLen ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLengthLabel(l) }}
                        title={showLen ? '隐藏长度' : '显示长度'}
                      >
                        📏
                      </button>
                      {/* 自定义线删除按钮 */}
                      {l.custom && (
                        <button
                          className="line-remove"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeCustomLine(l) }}
                          title="删除此线段"
                        >
                          ✕
                        </button>
                      )}
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
