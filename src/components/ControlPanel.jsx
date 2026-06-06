import { useState } from 'react'
import GeometrySelector from './GeometrySelector'
import { calculateVolume, calculateSurfaceArea } from '../engines/geometryEngine'
import { formatNumber } from '../engines/mathUtils'
import './ControlPanel.css'

const GEOMETRY_NAMES = {
  cube: '正方体',
  sphere: '球体',
  cylinder: '圆柱',
  cone: '圆锥',
  pyramid: '棱锥',
  prism: '棱柱'
}

const FORMULAS = {
  cube: {
    volume: 'V = a³',
    surface: 'S = 6a²'
  },
  sphere: {
    volume: 'V = (4/3)πr³',
    surface: 'S = 4πr²'
  },
  cylinder: {
    volume: 'V = πr²h',
    surface: 'S = 2πr(r+h)'
  },
  cone: {
    volume: 'V = (1/3)πr²h',
    surface: 'S = πr(r+l)'
  },
  pyramid: {
    volume: 'V = (1/3)Sh',
    surface: 'S = 底面积 + 侧面积'
  },
  prism: {
    volume: 'V = Sh',
    surface: 'S = 2×底面积 + 侧面积'
  }
}

export default function ControlPanel({ geometry, setGeometry, showWireframe, setShowWireframe, showLabels, setShowLabels }) {
  const [showAnswer, setShowAnswer] = useState(false)

  const handleGeometryChange = (type, params) => {
    setGeometry({ type, params })
  }

  const generateProblem = () => {
    const geometries = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'prism']
    const randomType = geometries[Math.floor(Math.random() * geometries.length)]
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
            defaultValue={geometry.params.size}
            onChange={(e) => handleGeometryChange(geometry.type, { size: parseFloat(e.target.value) })}
            className="slider"
          />
        </div>
      </div>

      <div className="panel-section">
        <h2>显示</h2>
        <button 
          className={`btn-toggle ${showWireframe ? 'active' : ''}`}
          onClick={() => setShowWireframe(!showWireframe)}
        >
          {showWireframe ? '✓ 线框' : '◯ 彩色'}
        </button>
        <div style={{height: 8}} />
        <label className="checkbox-label"> 
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> 显示标签
        </label>
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
