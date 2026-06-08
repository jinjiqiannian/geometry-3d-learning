import { useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import Canvas3D from '../features/solid-geometry/Canvas3D'
import ControlPanel from '../features/solid-geometry/ControlPanel'
import EdgePropertyPanel from '../features/solid-geometry/EdgePropertyPanel'
import { getLineDefinitions } from '../engines/lineDefinitions'
import { isPolyhedral } from '../engines/geometryEngine'
import { GEOMETRY_NAMES } from '../constants'
import { computeVerticesFromParams, getEdgeDirectionGroups, getDefaultEdgeLengths } from '../engines/constraintSolver'
import { useAppContext } from '../contexts/AppContext'
import './SolidGeometryPage.css'

// ── 默认约束参数（按类型）─────────────────────────────
function defaultConstraintParams(type) {
  if (type === 'cuboid') {
    return { constraintMode: 'cuboid', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
  }
  return { constraintMode: 'cube', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
}

export default function SolidGeometryPage() {
  const { apiKey, setApiKey } = useAppContext()

  const [geometry, setGeometry] = useState({
    type: 'cube',
    params: { size: 2 },
    ...defaultConstraintParams('cube'),
  })

  const [showFaces, setShowFaces] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [visibleLines, setVisibleLines] = useState(() => new Set())
  const [hoveredLine, setHoveredLine] = useState(null)

  // ── 线段相关状态 ──
  const [customLines, setCustomLines] = useState([])
  const [shownLengthLabels, setShownLengthLabels] = useState(() => new Set())
  const [searchedLine, setSearchedLine] = useState('')

  // ── 棱边属性 ──
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [edgeColorOverrides, setEdgeColorOverrides] = useState({})

  // ── 手机端 BottomSheet 状态 ──
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [mobileTab, setMobileTab] = useState('params')

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 767)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── 自由模式：计算自定义顶点 ──
  const customVertices = useMemo(() => {
    if (!isPolyhedral(geometry.type)) return null
    if (geometry.constraintMode === 'free') {
      const modeParams = {
        size: geometry.params.size ?? 2,
        freeEdgeLengths: geometry.freeEdgeLengths || {},
      }
      return computeVerticesFromParams(geometry.type, 'free', modeParams)
    }
    return null
  }, [geometry.type, geometry.constraintMode, geometry.params.size, geometry.freeEdgeLengths])

  // ── 切换几何体时，重置约束参数 ──
  useEffect(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
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
    setSelectedEdge(null)
    setEdgeColorOverrides({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry.type])

  // ── 更新单条棱长度 ──
  const handleEdgeLengthChange = useCallback((edgeId, newLength) => {
    setGeometry(prev => {
      const mode = prev.constraintMode

      if (mode === 'cube') {
        return { ...prev, cubeSize: newLength, params: { ...prev.params, size: newLength } }
      }

      if (mode === 'cuboid') {
        const groups = getEdgeDirectionGroups(prev.type)
        const updated = { ...prev }
        for (const [gName, edges] of Object.entries(groups)) {
          if (edges.includes(edgeId)) {
            if (gName === '长 (X)') updated.cuboidA = newLength
            else if (gName === '宽 (Z)') updated.cuboidB = newLength
            else if (gName === '高 (Y)') updated.cuboidC = newLength
            break
          }
        }
        return updated
      }

      return {
        ...prev,
        freeEdgeLengths: { ...prev.freeEdgeLengths, [edgeId]: newLength },
      }
    })
  }, [])

  // ── 更新棱边颜色 ──
  const handleEdgeColorChange = useCallback((edgeKey, color) => {
    setEdgeColorOverrides(prev => {
      if (color === null) {
        const next = { ...prev }
        delete next[edgeKey]
        return next
      }
      return { ...prev, [edgeKey]: color }
    })
  }, [])

  // ── 快速输入 "AB=8" ──
  const handleQuickInput = useCallback((input) => {
    const match = input.trim().match(/^([A-Za-z']+)\s*=\s*([\d.]+)$/)
    if (!match) return false
    const [, edgeId, valueStr] = match
    const value = parseFloat(valueStr)
    if (isNaN(value) || value <= 0) return false
    handleEdgeLengthChange(edgeId, value)
    return true
  }, [handleEdgeLengthChange])

  // ── 切换约束模式 ──
  const handleConstraintModeChange = useCallback((mode) => {
    setGeometry(prev => {
      const updated = { ...prev, constraintMode: mode }
      if (mode === 'cube') {
        updated.cubeSize = prev.cubeSize || 2
        updated.params = { ...prev.params, size: updated.cubeSize }
      }
      if (mode === 'cuboid') {
        updated.cuboidA = prev.cuboidA || 2
        updated.cuboidB = prev.cuboidB || 1.2
        updated.cuboidC = prev.cuboidC || 2
      }
      if (mode === 'free') {
        updated.freeEdgeLengths = getDefaultEdgeLengths(
          prev.type, 'cube', { cubeSize: prev.cubeSize || 2 }
        )
      }
      return updated
    })
  }, [])

  // 合并预定义线段 + 自定义线段
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
    const merged = [...lines, ...customLines]
    if (Object.keys(edgeColorOverrides).length > 0) {
      return merged.map(l => {
        const key = `${l.id}|${l.category}`
        return edgeColorOverrides[key] ? { ...l, colorOverride: edgeColorOverrides[key] } : l
      })
    }
    return merged
  }, [geometry.type, geometry.params.size, customLines, edgeColorOverrides, customVertices])

  // ── AI 解析结果 → 驱动图形生成 ──
  const handleGeometryGenerated = useCallback((result) => {
    if (!result || result.type === 'unknown') return

    setGeometry({
      type: result.type,
      params: { size: result.size || 2 },
      ...defaultConstraintParams(result.type),
    })

    if (result.highlightLines && result.highlightLines.length > 0) {
      const { lines: predefinedLines } = getLineDefinitions(result.type, { size: result.size || 2 })

      const newCustomLines = []
      result.highlightLines.forEach(hl => {
        const exists = predefinedLines.some(l =>
          l.id === hl.label && l.category === 'AI高亮'
        )
        if (!exists) {
          newCustomLines.push({
            id: hl.label,
            category: 'AI高亮',
            from: hl.from,
            to: hl.to,
            dashed: false,
            custom: true,
          })
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

  const polyhedral = isPolyhedral(geometry.type)

  // ── 选中的边数据 ──
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdge) return null
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
    const allLns = [...lines, ...customLines]
    return allLns.find(l => `${l.id}|${l.category}` === selectedEdge) || null
  }, [selectedEdge, geometry.type, geometry.params, customLines, customVertices])

  // ── 设置几何体（从 ControlPanel 回调）──
  const updateGeometry = useCallback((updates) => {
    setGeometry(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <div className="solid-geometry-page">
      {/* ── 手机端顶部标题栏 ── */}
      {isMobile && (
        <div className="sg-mobile-header">
          <span className="sg-mobile-header-icon">📐</span>
          <span className="sg-mobile-header-title">立体几何</span>
          <span className="sg-mobile-header-geo">{GEOMETRY_NAMES[geometry.type]}</span>
        </div>
      )}

      {/* ── 3D 画布 ── */}
      <div className={`sg-canvas-section ${isMobile ? 'mobile' : ''}`}>
        <Canvas style={{ width: '100%', height: '100%' }}>
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
            selectedEdge={selectedEdge}
            onEdgeClick={setSelectedEdge}
            edgeColorOverrides={edgeColorOverrides}
            customVertices={customVertices}
          />
        </Canvas>

        {/* 手机端：选中边的属性浮层 */}
        {isMobile && selectedEdge && selectedEdgeData && polyhedral && (
          <div className="sg-floating-edge-panel">
            <EdgePropertyPanel
              edgeKey={selectedEdge}
              edgeData={selectedEdgeData}
              geometry={geometry}
              edgeColorOverrides={edgeColorOverrides}
              onEdgeLengthChange={handleEdgeLengthChange}
              onEdgeColorChange={handleEdgeColorChange}
              onClose={() => setSelectedEdge(null)}
            />
          </div>
        )}
      </div>

      {/* ── 桌面端：右侧控制面板 ── */}
      {!isMobile && (
        <ControlPanel
          geometry={geometry}
          setGeometry={setGeometry}
          updateGeometry={updateGeometry}
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
          selectedEdge={selectedEdge}
          onEdgeClick={setSelectedEdge}
          edgeColorOverrides={edgeColorOverrides}
          onEdgeColorChange={handleEdgeColorChange}
          onEdgeLengthChange={handleEdgeLengthChange}
          onConstraintModeChange={handleConstraintModeChange}
          onQuickInput={handleQuickInput}
          customVertices={customVertices}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onGeometryGenerated={handleGeometryGenerated}
        />
      )}

      {/* ── 手机端：BottomSheet 面板 ── */}
      {isMobile && (
        <div className={`sg-bottom-sheet ${sheetExpanded ? 'expanded' : ''}`}>
          <div
            className="sg-sheet-handle-area"
            onClick={() => setSheetExpanded(prev => !prev)}
          >
            <div className="sg-sheet-handle" />
            <span className="sg-sheet-handle-label">
              {sheetExpanded ? '▼ 收起面板' : '▲ 展开面板'}
            </span>
          </div>

          {/* Tab 切换 */}
          <div className="sg-sheet-tabs">
            {[
              { key: 'params', label: '⚙️ 参数' },
              { key: 'lines', label: '📏 线段' },
              { key: 'ai', label: '🤖 AI' },
              { key: 'answer', label: '📋 答案' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`sg-sheet-tab ${mobileTab === tab.key ? 'active' : ''}`}
                onClick={() => setMobileTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="sg-sheet-content">
            <ControlPanel
              geometry={geometry}
              setGeometry={setGeometry}
              updateGeometry={updateGeometry}
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
              selectedEdge={selectedEdge}
              onEdgeClick={setSelectedEdge}
              edgeColorOverrides={edgeColorOverrides}
              onEdgeColorChange={handleEdgeColorChange}
              onEdgeLengthChange={handleEdgeLengthChange}
              onConstraintModeChange={handleConstraintModeChange}
              onQuickInput={handleQuickInput}
              customVertices={customVertices}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              onGeometryGenerated={handleGeometryGenerated}
              mobileTab={mobileTab}
            />
          </div>
        </div>
      )}
    </div>
  )
}
