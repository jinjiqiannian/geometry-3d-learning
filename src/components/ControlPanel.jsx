import { useState } from 'react'
import GeometrySelector from './GeometrySelector'
import LineControlPanel from './LineControlPanel'
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
}) {
  const [showAnswer, setShowAnswer] = useState(false)

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

  return (
    <div className="control-panel">
      <h1>📐 3D立体几何</h1>

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

      {/* ── 线条控制 ── */}
      <div className="panel-section">
        <LineControlPanel
          geometry={geometry}
          visibleLines={visibleLines}
          setVisibleLines={setVisibleLines}
          hoveredLine={hoveredLine}
          setHoveredLine={setHoveredLine}
        />
      </div>

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
