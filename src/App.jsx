import { useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import Canvas3D from './components/Canvas3D'
import ControlPanel from './components/ControlPanel'
import { getLineDefinitions } from './engines/lineDefinitions'
import { GEOMETRY_NAMES } from './constants'
import './App.css'

// ── localStorage key ─────────────────────────────────
const API_KEY_STORAGE = 'geometry_api_key'

export default function App() {
  const [geometry, setGeometry] = useState({
    type: 'cube',
    params: { size: 2 }
  })
  const [showFaces, setShowFaces] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [visibleLines, setVisibleLines] = useState(() => new Set())
  const [hoveredLine, setHoveredLine] = useState(null)

  // ── 线段相关状态 ──
  const [customLines, setCustomLines] = useState([])
  const [shownLengthLabels, setShownLengthLabels] = useState(() => new Set())
  const [searchedLine, setSearchedLine] = useState('')

  // ── AI / 移动端状态 ──
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || '' }
    catch { return '' }
  })

  // 持久化 API Key
  const handleApiKeyChange = useCallback((key) => {
    setApiKey(key)
    try {
      if (key) localStorage.setItem(API_KEY_STORAGE, key)
      else localStorage.removeItem(API_KEY_STORAGE)
    } catch { /* localStorage 不可用 */ }
  }, [])

  // 切换几何体时，重置为教材模式默认可见线段
  useEffect(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params)
    const defaults = new Set(
      lines
        .filter(l => ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) && !l.dashed)
        .map(l => `${l.id}|${l.category}`)
    )
    setVisibleLines(defaults)
    setHoveredLine(null)
    setCustomLines([])
    setShownLengthLabels(new Set())
    setSearchedLine('')
  }, [geometry.type])

  // 合并预定义线段 + 自定义线段
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params)
    return [...lines, ...customLines]
  }, [geometry.type, geometry.params.size, customLines])

  // ── AI 解析结果 → 驱动图形生成 ──
  const handleGeometryGenerated = useCallback((result) => {
    if (!result || result.type === 'unknown') return

    // 设置几何体类型和大小
    setGeometry({
      type: result.type,
      params: { size: result.size || 2 },
    })

    // 添加高亮线段为自定义线
    if (result.highlightLines && result.highlightLines.length > 0) {
      const { lines: predefinedLines } = getLineDefinitions(result.type, { size: result.size || 2 })
      const pointData = getLineDefinitions(result.type, { size: result.size || 2 })

      const newCustomLines = []
      result.highlightLines.forEach(hl => {
        const fromIdx = pointData.points.labels.indexOf(hl.from)
        const toIdx = pointData.points.labels.indexOf(hl.to)
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          const key = `${hl.label}|AI高亮`
          const exists = predefinedLines.some(l => `${l.id}|${l.category}` === key)
          if (!exists) {
            newCustomLines.push({
              id: hl.label,
              category: '辅助构造线',
              from: fromIdx,
              to: toIdx,
              dashed: false,
              custom: true,
            })
          }
        }
      })

      if (newCustomLines.length > 0) {
        setCustomLines(newCustomLines)
        setVisibleLines(prev => {
          const next = new Set(prev)
          newCustomLines.forEach(l => next.add(`${l.id}|${l.category}`))
          return next
        })
      }
    }
  }, [])

  return (
    <div className="app">
      {/* ── 手机端顶部标题栏 ── */}
      <div className="mobile-header">
        <span className="mobile-header-icon">📐</span>
        <span className="mobile-header-title">3D立体几何</span>
        <span className="mobile-header-geo">{GEOMETRY_NAMES[geometry.type]}</span>
      </div>

      <div className="canvas-section">
        <Canvas
          style={{ width: '100%', height: '100%' }}
        >
          <Canvas3D
            geometry={geometry}
            showFaces={showFaces}
            showLabels={showLabels}
            visibleLines={visibleLines}
            hoveredLine={hoveredLine}
            setHoveredLine={setHoveredLine}
            allLines={mergedLines}
            shownLengthLabels={shownLengthLabels}
            searchedLine={searchedLine}
          />
        </Canvas>
      </div>
      <ControlPanel
        geometry={geometry}
        setGeometry={setGeometry}
        showFaces={showFaces}
        setShowFaces={setShowFaces}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        visibleLines={visibleLines}
        setVisibleLines={setVisibleLines}
        hoveredLine={hoveredLine}
        setHoveredLine={setHoveredLine}
        customLines={customLines}
        setCustomLines={setCustomLines}
        shownLengthLabels={shownLengthLabels}
        setShownLengthLabels={setShownLengthLabels}
        searchedLine={searchedLine}
        setSearchedLine={setSearchedLine}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onGeometryGenerated={handleGeometryGenerated}
      />
    </div>
  )
}
