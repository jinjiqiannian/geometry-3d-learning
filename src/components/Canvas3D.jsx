import { useState, useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls, Html } from '@react-three/drei'
import './Canvas3D.css'
import { createGeometry, getVertexAndEdgeInfo } from '../engines/geometryEngine'

export default function Canvas3D({ geometry, showWireframe, showLabels }) {
  const orbitRef = useRef()
  const meshRef = useRef()
  const [vertexLabels, setVertexLabels] = useState([])
  const [edgeLabels, setEdgeLabels] = useState([])

  const geoData = useMemo(() => createGeometry(geometry.type, geometry.params), [geometry])

  // 顶点 & 棱边标签（仅文字标注，不画线）
  useEffect(() => {
    const info = getVertexAndEdgeInfo(geometry.type, geometry.params)
    const vl = info.vertices.map((pos, i) => ({
      pos,
      label: info.labels[i] || String.fromCharCode(65 + i)
    }))
    setVertexLabels(vl)

    const el = info.edges.map(([i, j]) => {
      const a = info.vertices[i], b = info.vertices[j]
      return {
        pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
        label: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]).toFixed(2)
      }
    })
    setEdgeLabels(el)
  }, [geometry])

  // 命令式切换材质：mesh 永不被销毁
  useEffect(() => {
    const m = meshRef.current
    if (!m) return
    if (m.material) m.material.dispose()
    m.material = showWireframe
      ? new THREE.MeshBasicMaterial({ wireframe: true, color: 0x000000 })
      : new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.5,
          metalness: 0.1,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1
        })
  }, [showWireframe])

  return (
    <>
      <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]} />

      {showWireframe ? (
        <>
          <ambientLight intensity={0.5} color={0xffffff} />
          <directionalLight position={[8, 8, 8]} intensity={0.7} color={0xffffff} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.85} color={0xffffff} />
          <directionalLight position={[8, 8, 8]} intensity={1} color={0xffffff} />
          <directionalLight position={[-8, -8, 5]} intensity={0.4} color={0xcccccc} />
          <gridHelper args={[20, 20, 0xdddddd, 0xeeeeee]} />
          <axesHelper args={[5]} />
        </>
      )}

      <mesh ref={meshRef}>
        <primitive attach="geometry" object={geoData} />
      </mesh>

      {showLabels && vertexLabels.map((v, idx) => (
        <Html key={`v-${idx}`} position={v.pos} center transform occlude={false} distanceFactor={1.4}>
          <div className="vertex-label" style={{ fontSize: 12, fontWeight: 'bold', color: '#e74c3c' }}>{v.label}</div>
        </Html>
      ))}
      {showLabels && edgeLabels.map((e, idx) => (
        <Html key={`e-${idx}`} position={e.pos} center transform occlude={false} distanceFactor={1.4}>
          <div className="edge-label" style={{ fontSize: 10, color: '#e74c3c' }}>{e.label}</div>
        </Html>
      ))}

      <OrbitControls ref={orbitRef} enableZoom enablePan enableRotate />
    </>
  )
}