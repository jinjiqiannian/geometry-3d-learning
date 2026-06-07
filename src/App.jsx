import { useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import Canvas3D from './components/Canvas3D'
import ControlPanel from './components/ControlPanel'
import { getLineDefinitions } from './engines/lineDefinitions'
import './App.css'

export default function App() {
  const [geometry, setGeometry] = useState({
    type: 'cube',
    params: { size: 2 }
  })
  const [showFaces, setShowFaces] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [visibleLines, setVisibleLines] = useState(() => new Set())
  const [hoveredLine, setHoveredLine] = useState(null)

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
  }, [geometry.type])

  return (
    <div className="app">
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
      />
    </div>
  )
}
