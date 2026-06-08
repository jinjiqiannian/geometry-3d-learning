import { useState, useEffect } from 'react'
import GeometrySelector from './GeometrySelector'
import LineControlPanel from './LineControlPanel'
import ProblemInput from './ProblemInput'
import CameraCapture from './CameraCapture'
import ApiKeySettings from './ApiKeySettings'
import { calculateVolume, calculateSurfaceArea } from '../engines/geometryEngine'
import { formatNumber } from '../engines/mathUtils'
import { GEOMETRY_NAMES, FORMULAS, GEOMETRIES } from '../constants'
import './ControlPanel.css'

export default function ControlPanel({
  geometry, setGeometry,
  showFaces, setShowFaces,
  showLabels, setShowLabels,
  visibleLines, setVisibleLines,
  hoveredLine, setHoveredLine,
  customLines, setCustomLines,
  shownLengthLabels, setShownLengthLabels,
  searchedLine, setSearchedLine,
  apiKey, onApiKeyChange,
  onGeometryGenerated,
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [activeTab, setActiveTab] = useState('geometry')  // 'geometry' | 'lines' | 'ai'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // 监听窗口大小
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleGeometryChange = (type, params) => {
    setGeometry({ type, params })
  }

  const generateProblem = () => {
    const randomType = GEOMETRIES[Math.floor(Math.random() * GEOMETRIES.length)].id
    setGeometry({ type: randomType, params: { size: Math.random() * 3 + 1 } })
    setShowAnswer(false)
  }

  const volume = calculateVolume(geometry.type, geometry.params)
  const surface = calculateSurfaceArea(geometry.type, geometry.params)

  // ── 手机端 Tab 配置 ──
  const tabs = [
    { key: 'geometry', label: '📐 图形', icon: '📐' },
    { key: 'lines', label: '📏 线段', icon: '📏' },
    { key: 'ai', label: '🤖 AI', icon: '🤖' },
  ]

  return (
    <div className="control-panel">
      <h1>📐 3D立体几何</h1>

      {/* ── API Key 设置 ── */}
      <div className="panel-section">
        <ApiKeySettings apiKey={apiKey} onApiKeyChange={onApiKeyChange} />
      </div>

      {/* ── 手机端 Tab 导航 ── */}
      {isMobile && (
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
      {(!isMobile || activeTab === 'geometry') && (
        <>
          <div className="panel-section">
            <h2>几何体</h2>
            <GeometrySelector
              onSelect={handleGeometryChange}
              currentType={geometry.type}
            />
          </div>

          <div className="panel-section">
            <h2>参数</h2>
            <div className="param-group">
              <label>大小: {formatNumber(geometry.params.size)}</label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={geometry.params.size}
                onChange={(e) => handleGeometryChange(geometry.type, { size: parseFloat(e.target.value) })}
                className="slider"
              />
            </div>
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
        </>
      )}

      {/* ── 线段面板 ── */}
      {(!isMobile || activeTab === 'lines') && (
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
          />
        </div>
      )}

      {/* ── AI 面板 ── */}
      {(!isMobile || activeTab === 'ai') && (
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

      {/* ── 随机题目 + 答案（所有 tab 都显示）── */}
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
    </div>
  )
}
