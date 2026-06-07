import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Canvas3D from './components/Canvas3D'
import ControlPanel from './components/ControlPanel'
import './App.css'

export default function App() {
  const [geometry, setGeometry] = useState({ 
    type: 'cube', 
    params: { size: 2 } 
  })
  const [showWireframe, setShowWireframe] = useState(false)
  const [showLabels, setShowLabels] = useState(true)

  return (
    <div className="app">
      <div className="canvas-section">
        <Canvas
          style={{ width: '100%', height: '100%' }}
        >
          <Canvas3D geometry={geometry} showWireframe={showWireframe} showLabels={showLabels} />
        </Canvas>
      </div>
      <ControlPanel 
        geometry={geometry} 
        setGeometry={setGeometry}
        showWireframe={showWireframe}
        setShowWireframe={setShowWireframe}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
      />
    </div>
  )
}
