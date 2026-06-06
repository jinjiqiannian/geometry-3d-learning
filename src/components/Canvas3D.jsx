import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls, Html } from '@react-three/drei'
import './Canvas3D.css'
import { createGeometry, getVertexAndEdgeInfo } from '../engines/geometryEngine'

export default function Canvas3D({ geometry, showWireframe, showLabels }) {
  const meshRef = useRef()
  const edgesRef = useRef()
  const orbitRef = useRef()
  const [geoData, setGeoData] = useState(null)
  const [vertexLabels, setVertexLabels] = useState([])
  const [edgeLabels, setEdgeLabels] = useState([])

  useEffect(() => {
    const newGeometry = createGeometry(geometry.type, geometry.params)
    setGeoData(newGeometry)

    // update meshRef
    if (meshRef.current) {
      if (meshRef.current.geometry) meshRef.current.geometry.dispose()
      meshRef.current.geometry = newGeometry
    }

    // remove old edges
    if (meshRef.current && edgesRef.current) {
      try {
        edgesRef.current.geometry.dispose()
        meshRef.current.remove(edgesRef.current)
      } catch (e) {}
      edgesRef.current = null
    }

    // add outline edges
    if (meshRef.current) {
      const edgesGeo = new THREE.EdgesGeometry(newGeometry)
      const edgesMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2.5 })
      const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat)
      meshRef.current.add(edgeLines)
      edgesRef.current = edgeLines
    }

    // use precise vertex/edge info for cube/prism/pyramid
    const vertexInfo = getVertexAndEdgeInfo(geometry.type, geometry.params)
    
    if (vertexInfo.vertices.length > 0) {
      // use precise vertex and edge data
      const vLabels = vertexInfo.vertices.map((pos, i) => ({
        pos,
        label: vertexInfo.labels[i] || String.fromCharCode(65 + i)
      }))
      setVertexLabels(vLabels)

      const edgeLabelsLocal = vertexInfo.edges.map(([i, j]) => {
        const a = vertexInfo.vertices[i]
        const b = vertexInfo.vertices[j]
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
        const length = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
        return { pos: mid, label: length.toFixed(2) }
      })
      setEdgeLabels(edgeLabelsLocal)
    } else {
      // fallback: extract from geometry
      const posAttr = newGeometry.attributes.position
      const verts = []
      for (let i = 0; i < posAttr.count; i++) {
        verts.push([posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)])
      }

      const map = new Map()
      verts.forEach(v => {
        const key = `${v[0].toFixed(3)}_${v[1].toFixed(3)}_${v[2].toFixed(3)}`
        if (!map.has(key)) map.set(key, v)
      })
      const unique = Array.from(map.values())
      unique.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])

      const vLabels = unique.map((p, i) => ({
        pos: p,
        label: String.fromCharCode(65 + i)
      }))
      setVertexLabels(vLabels)
      setEdgeLabels([])
    }

  }, [geometry])

  const resetView = () => {
    if (orbitRef.current) {
      orbitRef.current.reset()
    }
  }

  const { size = 2 } = geometry.params

  return (
    <>
      <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]} />

      {showWireframe ? (
        <>
          <ambientLight intensity={0.5} color={0xffffff} />
          <directionalLight position={[8, 8, 8]} intensity={0.7} color={0xffffff} />

          <mesh ref={meshRef}>
            {geoData && <primitive attach="geometry" object={geoData} />}
            <meshBasicMaterial wireframe={true} color={0x000000} linewidth={2} />
          </mesh>

          {showLabels && vertexLabels.map((v, idx) => (
            <Html key={`v-${idx}`} position={v.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="vertex-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{v.label}</div>
            </Html>
          ))}

          {showLabels && edgeLabels.map((e, idx) => (
            <Html key={`e-${idx}`} position={e.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="edge-label" style={{ fontSize: '10px' }}>{e.label}</div>
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

          <mesh ref={meshRef}>
            {geoData && <primitive attach="geometry" object={geoData} />}
            <meshStandardMaterial color={0xffffff} roughness={0.5} metalness={0.1} />
          </mesh>

          {showLabels && vertexLabels.map((v, idx) => (
            <Html key={`v-${idx}`} position={v.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="vertex-label" style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{v.label}</div>
            </Html>
          ))}

          {showLabels && edgeLabels.map((e, idx) => (
            <Html key={`e-${idx}`} position={e.pos} center transform occlude={false} distanceFactor={1.4}>
              <div className="edge-label" style={{ fontSize: '10px', color: '#666' }}>{e.label}</div>
            </Html>
          ))}

          <OrbitControls ref={orbitRef} enableZoom enablePan enableRotate />
        </>
      )}
    </>
  )
}
