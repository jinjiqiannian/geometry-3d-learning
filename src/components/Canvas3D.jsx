import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls, Html } from '@react-three/drei'
import './Canvas3D.css'
import { createGeometry, getVertexAndEdgeInfo, isPolyhedral } from '../engines/geometryEngine'

export default function Canvas3D({ geometry, showWireframe, showLabels }) {
  const orbitRef = useRef()
  const [vertexLabels, setVertexLabels] = useState([])
  const [edgeLabels, setEdgeLabels] = useState([])

  // 顶点和棱边标签（geometry 变化时重新计算）
  useMemo(() => {
    const info = getVertexAndEdgeInfo(geometry.type, geometry.params)

    // 顶点标签：直接从 vertexMaps 提供
    const vl = info.vertices.map((pos, i) => ({
      pos,
      label: info.labels[i] || String.fromCharCode(65 + i)
    }))
    setVertexLabels(vl)

    // 棱边标签：线段中点 + 长度值
    if (info.edges.length > 0) {
      const el = info.edges.map(([i, j]) => {
        const a = info.vertices[i], b = info.vertices[j]
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
        return { pos: mid, label: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]).toFixed(2) }
      })
      setEdgeLabels(el)
    } else {
      setEdgeLabels([])
    }
  }, [geometry])

  const geoData = useMemo(() => createGeometry(geometry.type, geometry.params), [geometry])

  // 棱柱形几何体用 EdgesGeometry 画粗棱边
  const showEdges = isPolyhedral(geometry.type)
  const edgesData = useMemo(
    () => showEdges ? new THREE.EdgesGeometry(geoData) : null,
    [geoData, showEdges]
  )

  return (
    <>
      <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]} />

      {showWireframe ? (
        <>
          <ambientLight intensity={0.5} color={0xffffff} />
          <directionalLight position={[8, 8, 8]} intensity={0.7} color={0xffffff} />

          <mesh>
            <primitive attach="geometry" object={geoData} />
            <meshBasicMaterial wireframe color={0x000000} />
          </mesh>

          {showEdges && (
            <lineSegments>
              <primitive attach="geometry" object={edgesData} />
              <lineBasicMaterial color={0x000000} />
            </lineSegments>
          )}

          {showLabels && vertexLabels.map((v, idx) => (
            <Html key={`v-${idx}`} position={v.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="vertex-label" style={{ fontSize: 12, fontWeight: 'bold' }}>{v.label}</div>
            </Html>
          ))}

          {showLabels && edgeLabels.map((e, idx) => (
            <Html key={`e-${idx}`} position={e.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="edge-label" style={{ fontSize: 10 }}>{e.label}</div>
            </Html>
          ))}

          <OrbitControls ref={orbitRef} enableZoom enablePan enableRotate />
        </>
      ) : (
        <>
          <ambientLight intensity={0.85} color={0xffffff} />
          <directionalLight position={[8, 8, 8]} intensity={1} color={0xffffff} />
          <directionalLight position={[-8, -8, 5]} intensity={0.4} color={0xcccccc} />

          <gridHelper args={[20, 20, 0xdddddd, 0xeeeeee]} />
          <axesHelper args={[5]} />

          <mesh>
            <primitive attach="geometry" object={geoData} />
            <meshStandardMaterial color={0xffffff} roughness={0.5} metalness={0.1} />
          </mesh>

          {showEdges && (
            <lineSegments>
              <primitive attach="geometry" object={edgesData} />
              <lineBasicMaterial color={0x000000} />
            </lineSegments>
          )}

          {showLabels && vertexLabels.map((v, idx) => (
            <Html key={`v-${idx}`} position={v.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="vertex-label" style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{v.label}</div>
            </Html>
          ))}

          {showLabels && edgeLabels.map((e, idx) => (
            <Html key={`e-${idx}`} position={e.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="edge-label" style={{ fontSize: 10, color: '#666' }}>{e.label}</div>
            </Html>
          ))}

          <OrbitControls ref={orbitRef} enableZoom enablePan enableRotate />
        </>
      )}
    </>
  )
}