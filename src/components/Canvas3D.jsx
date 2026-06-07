import { useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls, Text, Line, Billboard } from '@react-three/drei'
import { createGeometry, getVertexAndEdgeInfo } from '../engines/geometryEngine'

// ── 圆采样 (64段，轻量高精度) ─────────────────────────
function ring(radius, plane, seg = 64) {
  const pts = []
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius
    if (plane === 'xy') pts.push([x, y, 0])
    else if (plane === 'xz') pts.push([x, 0, y])
    else pts.push([0, x, y]) // yz
  }
  return pts
}

// ── 线框数据 (纯数据，无几何体) ──────────────────────
function useWireData(type, s) {
  return useMemo(() => {
    const lines = []
    if (type === 'sphere') {
      lines.push(['xy', ring(s, 'xy')])
      lines.push(['xz', ring(s, 'xz')])
      lines.push(['yz', ring(s, 'yz')])
    } else if (type === 'cylinder') {
      lines.push(['top', ring(s, 'xz').map(p => [p[0], s, p[2]])])
      lines.push(['bot', ring(s, 'xz').map(p => [p[0], -s, p[2]])])
      lines.push(['r1', [[s, -s, 0], [s, s, 0]]])
      lines.push(['r2', [[-s, -s, 0], [-s, s, 0]]])
    } else if (type === 'cone') {
      lines.push(['base', ring(s, 'xz').map(p => [p[0], -s, p[2]])])
      lines.push(['l1', [[s, -s, 0], [0, s, 0]]])
      lines.push(['l2', [[-s, -s, 0], [0, s, 0]]])
      lines.push(['l3', [[0, -s, s], [0, s, 0]]])
      lines.push(['l4', [[0, -s, -s], [0, s, 0]]])
    }
    return lines
  }, [type, s])
}

// ── 多面体棱边几何体 ─────────────────────────────────
function usePolyGeo(info) {
  return useMemo(() => {
    const p = []
    if (!info || !info.edges) return new THREE.BufferGeometry()
    info.edges.forEach(([i, j]) => {
      p.push(...info.vertices[i], ...info.vertices[j])
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [info])
}

// ── 直角标记点 ─────────────────────────────────────
function useRightAngleData(type, s) {
  return useMemo(() => {
    const d = s * 0.24
    const result = []

    const L = (v, d1, d2) => {
      const m = [v[0] + d1[0] * d, v[1] + d1[1] * d, v[2] + d1[2] * d]
      const e = [m[0] + d2[0] * d, m[1] + d2[1] * d, m[2] + d2[2] * d]
      return [[v, m], [m, e]]
    }

    if (type === 'cube') {
      ;[
        { v: [s, s, s], d1: [-1, 0, 0], d2: [0, -1, 0] },
        { v: [-s, s, s], d1: [0, -1, 0], d2: [1, 0, 0] },
        { v: [-s, -s, s], d1: [1, 0, 0], d2: [0, 1, 0] },
        { v: [s, -s, s], d1: [0, 1, 0], d2: [-1, 0, 0] },
      ].forEach(({ v, d1, d2 }) => result.push(...L(v, d1, d2)))
    } else if (type === 'prism') {
      result.push(...L([-s, -s, -s], [1, 0, 0], [0, 0, 1]))
    } else if (type === 'pyramid') {
      ;[
        { v: [s, -s, s], d1: [-1, 0, 0], d2: [0, 0, -1] },
        { v: [-s, -s, s], d1: [0, 0, -1], d2: [1, 0, 0] },
        { v: [-s, -s, -s], d1: [1, 0, 0], d2: [0, 0, 1] },
        { v: [s, -s, -s], d1: [0, 0, 1], d2: [-1, 0, 0] },
      ].forEach(({ v, d1, d2 }) => result.push(...L(v, d1, d2)))
    }
    return result
  }, [type, s])
}

// ── 棱边长度标签（去重） ────────────────────────────
function useEdgeLabelData(info) {
  return useMemo(() => {
    if (!info || !info.edges) return []
    const { vertices, edges } = info
    const seen = new Set()
    const result = []
    edges.forEach(([i, j]) => {
      const a = vertices[i], b = vertices[j]
      const len = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      const key = len.toFixed(2)
      if (!seen.has(key)) {
        seen.add(key)
        result.push({
          pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
          label: len.toFixed(2),
        })
      }
    })
    return result
  }, [info])
}

// ══════════════════ 主组件 ═══════════════════════════

export default function Canvas3D({ geometry, showFaces = true, showLabels = true }) {
  const { type, params } = geometry
  const size = params.size ?? 2
  const s = size / 2

  const geoData = useMemo(() => createGeometry(type, params), [type, size])
  const edgeInfo = useMemo(() => getVertexAndEdgeInfo(type, params), [type, size])
  const wireLines = useWireData(type, s)
  const polyGeo = usePolyGeo(edgeInfo)
  const edgeLabels = useEdgeLabelData(edgeInfo)
  const raMarks = useRightAngleData(type, s)
  const isCurved = ['sphere', 'cylinder', 'cone'].includes(type)

  return (
    <>
      <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]} />
      <gridHelper args={[12, 12, '#e0e0e0', '#f0f0f0']} />

      {/* 可选半透明白色面 */}
      {showFaces && (
        <mesh>
          <primitive attach="geometry" object={geoData} />
          <meshBasicMaterial color="white" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 线框：曲面→drei Line，多面体→LineSegments */}
      {isCurved ? (
        wireLines.map(([key, pts]) => (
          <Line key={key} points={pts} color="black" lineWidth={1} />
        ))
      ) : (
        <lineSegments geometry={polyGeo}>
          <lineBasicMaterial color="black" />
        </lineSegments>
      )}

      {/* 顶点标签 — Billboard 确保始终朝向摄像机 */}
      {showLabels && edgeInfo.vertices.map((v, i) => (
        <Billboard key={`v-${i}`} position={v} follow>
          <Text fontSize={0.28} color="black" anchorX="center" anchorY="middle">
            {edgeInfo.labels[i] || String.fromCharCode(65 + i)}
          </Text>
        </Billboard>
      ))}

      {/* 棱边长度标签 */}
      {showLabels && edgeLabels.map((e, i) => (
        <Billboard key={`e-${i}`} position={e.pos} follow>
          <Text fontSize={0.18} color="black" anchorX="center" anchorY="middle">
            {e.label}
          </Text>
        </Billboard>
      ))}

      {/* 直角标记 */}
      {raMarks.length > 0 && (() => {
        const arr = new Float32Array(raMarks.flat(2))
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
        return (
          <lineSegments geometry={g}>
            <lineBasicMaterial color="black" />
          </lineSegments>
        )
      })()}

      <OrbitControls enableZoom enablePan enableRotate />
    </>
  )
}
