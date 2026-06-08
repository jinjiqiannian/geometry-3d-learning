import { useState, useEffect, useMemo } from 'react'
import GeometrySelector from './GeometrySelector'
import LineControlPanel from './LineControlPanel'
import ParamEditor from './ParamEditor'
import EdgePropertyPanel from './EdgePropertyPanel'
import ProblemInput from './ProblemInput'
import CameraCapture from './CameraCapture'
import ApiKeySettings from './ApiKeySettings'
import { calculateVolume, calculateSurfaceArea, isPolyhedral } from '../../engines/geometryEngine'
import { getLineDefinitions } from '../../engines/lineDefinitions'
import { formatNumber } from '../../engines/mathUtils'
import { GEOMETRY_NAMES, FORMULAS, GEOMETRIES } from '../../constants'
import './ControlPanel.css'

export default function ControlPanel({
  geometry, setGeometry, updateGeometry,
  showFaces, setShowFaces,
  showLabels, setShowLabels,
  visibleLines, setVisibleLines,
  hoveredLine, setHoveredLine,
  customLines, setCustomLines,
  shownLengthLabels, setShownLengthLabels,
  searchedLine, setSearchedLine,
  selectedEdge, onEdgeClick,
  edgeColorOverrides, onEdgeColorChange,
  onEdgeLengthChange, onConstraintModeChange, onQuickInput,
  customVertices,
  apiKey, onApiKeyChange,
  onGeometryGenerated,
  mobileTab,   // 手机端父级控制的 tab: 'params' | 'lines' | 'ai' | 'answer'
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [activeTab, setActiveTab] = useState('geometry')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const polyhedral = isPolyhedral(geometry.type)

  const handleGeometryChange = (type, params) => {
    // 为新类型设置默认约束参数
    const constraintDefaults = type === 'cuboid'
      ? { constraintMode: 'cuboid', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
      : { constraintMode: 'cube', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
    setGeometry({
      type,
      params: { size: params.size ?? 2 },
      ...constraintDefaults,
    })
  }

  const generateProblem = () => {
    const randomType = GEOMETRIES[Math.floor(Math.random() * GEOMETRIES.length)].id
    const constraintDefaults = randomType === 'cuboid'
      ? { constraintMode: 'cuboid', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
      : { constraintMode: 'cube', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
    setGeometry({
      type: randomType,
      params: { size: Math.random() * 3 + 1 },
      ...constraintDefaults,
    })
    setShowAnswer(false)
  }

  const volume = calculateVolume(geometry.type, geometry.params)
  const surface = calculateSurfaceArea(geometry.type, geometry.params)

  // ── 选中的边数据 ──
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdge) return null
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
    const allLns = [...lines, ...customLines]
    return allLns.find(l => `${l.id}|${l.category}` === selectedEdge) || null
  }, [selectedEdge, geometry.type, geometry.params, customLines, customVertices])

  // ── 手机端 Tab 配置 ──
  const tabs = [
    { key: 'geometry', label: '📐 图形', icon: '📐' },
    { key: 'lines', label: '📏 线段', icon: '📏' },
    { key: 'ai', label: '🤖 AI', icon: '🤖' },
  ]

  // 父级控制 tab（手机端 BottomSheet）vs 内部状态（旧手机端兼容）
  const effectiveTab = mobileTab
    ? ({ params: 'geometry', lines: 'lines', ai: 'ai', answer: 'answer' }[mobileTab] || 'geometry')
    : activeTab

  const showGeometry = !isMobile || effectiveTab === 'geometry'
  const showLines = !isMobile || effectiveTab === 'lines'
  const showAI = !isMobile || effectiveTab === 'ai'
  const showAnswerTab = !isMobile || effectiveTab === 'answer'

  return (
    <div className="control-panel">
      <h1>📐 3D立体几何</h1>

      {/* ── API Key 设置 ── */}
      <div className="panel-section">
        <ApiKeySettings apiKey={apiKey} onApiKeyChange={onApiKeyChange} />
      </div>

      {/* ── 手机端 Tab 导航（仅在无 mobileTab 时显示）── */}
      {isMobile && !mobileTab && (
        <div className="mobile-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`mobile-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="mobile-tab-icon">{t.icon}</span>
              <span className="mobile-tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 图形面板 ── */}
      {showGeometry && (
        <>
          <div className="panel-section">
            <h2>几何体</h2>
            <GeometrySelector
              onSelect={handleGeometryChange}
              currentType={geometry.type}
            />
          </div>

          {/* ── 参数：多面体用 ParamEditor，曲面体用旧滑块 ── */}
          <div className="panel-section">
            <h2>参数</h2>
            {polyhedral ? (
              <ParamEditor
                geometry={geometry}
                onConstraintModeChange={onConstraintModeChange}
                onEdgeLengthChange={onEdgeLengthChange}
                onQuickInput={onQuickInput}
              />
            ) : (
              <div className="param-group">
                <label>大小: {formatNumber(geometry.params.size)}</label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={geometry.params.size}
                  onChange={(e) => {
                    const newSize = parseFloat(e.target.value)
                    setGeometry(prev => ({ ...prev, params: { size: newSize } }))
                  }}
                  className="slider"
                />
              </div>
            )}
          </div>

          <div className="panel-section">
            <h2>显示</h2>
            <button
              className={`btn-toggle ${showFaces ? 'active' : ''}`}
              onClick={() => setShowFaces(!showFaces)}
            >
              {showFaces ? '✓ 实体面' : '◯ 纯线框'}
            </button>
            <div style={{height: 8}} />
            <label className="checkbox-label">
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> 显示标签
            </label>
          </div>

          {/* ── 边属性面板 ── */}
          {selectedEdge && selectedEdgeData && polyhedral && (
            <div className="panel-section">
              <EdgePropertyPanel
                edgeKey={selectedEdge}
                edgeData={selectedEdgeData}
                geometry={geometry}
                edgeColorOverrides={edgeColorOverrides}
                onEdgeLengthChange={onEdgeLengthChange}
                onEdgeColorChange={onEdgeColorChange}
                onClose={() => onEdgeClick?.(null)}
              />
            </div>
          )}
        </>
      )}

      {/* ── 线段面板 ── */}
      {showLines && (
        <div className="panel-section">
          <LineControlPanel
            geometry={geometry}
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
            onEdgeClick={onEdgeClick}
            edgeColorOverrides={edgeColorOverrides}
            onEdgeColorChange={onEdgeColorChange}
            customVertices={customVertices}
          />
        </div>
      )}

      {/* ── AI 面板 ── */}
      {showAI && (
        <>
          <div className="panel-section">
            <ProblemInput
              apiKey={apiKey}
              onGeometryGenerated={onGeometryGenerated}
            />
          </div>
          <div className="panel-section">
            <CameraCapture
              apiKey={apiKey}
              onGeometryGenerated={onGeometryGenerated}
            />
          </div>
        </>
      )}

      {/* ── 随机题目 + 答案 ── */}
      {(!isMobile || effectiveTab === 'answer') && (
      <>
      <div className="panel-section">
        <button className="btn-primary" onClick={generateProblem}>
          🎲 随机题目
        </button>
      </div>

      <div className="panel-section answer-section">
        <h3>{GEOMETRY_NAMES[geometry.type]}</h3>
        <p className="size-info">大小 = {formatNumber(geometry.params.size)}</p>
        <button
          className="btn-secondary"
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {showAnswer ? '隐藏答案' : '显示答案'}
        </button>
        {showAnswer && (
          <div className="answer-box">
            <div className="answer-item">
              <p className="answer-label">体积</p>
              <p className="formula">{FORMULAS[geometry.type].volume}</p>
              <p className="result">V = {formatNumber(volume)}</p>
            </div>
            <div className="answer-item">
              <p className="answer-label">表面积</p>
              <p className="formula">{FORMULAS[geometry.type].surface}</p>
              <p className="result">S = {formatNumber(surface)}</p>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
