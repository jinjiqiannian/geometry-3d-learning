import { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls, Text, Line, Billboard } from '@react-three/drei'
import { createGeometry, getVertexAndEdgeInfo } from '../engines/geometryEngine'
import { getLineDefinitions, resolvePoint } from '../engines/lineDefinitions'

// ── 圆采样 ──────────────────────────────────────────
function ring(radius, plane, seg = 64) {
  const pts = []
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius
    if (plane === 'xy') pts.push([x, y, 0])
    else if (plane === 'xz') pts.push([x, 0, y])
    else pts.push([0, x, y])
  }
  return pts
}

// ── 曲面线框数据 ────────────────────────────────────
function useCurveData(type, s) {
  return useMemo(() => {
    const lines = []
    if (type === 'sphere') {
      lines.push(ring(s, 'xy'))
      lines.push(ring(s, 'xz'))
      lines.push(ring(s, 'yz'))
    } else if (type === 'cylinder') {
      lines.push(ring(s, 'xz').map(p => [p[0], s, p[2]]))
      lines.push(ring(s, 'xz').map(p => [p[0], -s, p[2]]))
      lines.push([[s, -s, 0], [s, s, 0]])
      lines.push([[-s, -s, 0], [-s, s, 0]])
    } else if (type === 'cone') {
      lines.push(ring(s, 'xz').map(p => [p[0], -s, p[2]]))
      lines.push([[s, -s, 0], [0, s, 0]])
      lines.push([[-s, -s, 0], [0, s, 0]])
      lines.push([[0, -s, s], [0, s, 0]])
      lines.push([[0, -s, -s], [0, s, 0]])
    }
    return lines
  }, [type, s])
}

// ── 直角标记 ────────────────────────────────────────
function useRightAngleData(type, s) {
  return useMemo(() => {
    const d = s * 0.24
    const result = []
    const L = (v, d1, d2) => {
      const m = [v[0] + d1[0] * d, v[1] + d1[1] * d, v[2] + d1[2] * d]
      const e = [m[0] + d2[0] * d, m[1] + d2[1] * d, m[2] + d2[2] * d]
      result.push([v, m], [m, e])
    }
    if (type === 'cube') {
      [ { v: [s, s, s], d1: [-1, 0, 0], d2: [0, -1, 0] },
        { v: [-s, s, s], d1: [0, -1, 0], d2: [1, 0, 0] },
        { v: [-s, -s, s], d1: [1, 0, 0], d2: [0, 1, 0] },
        { v: [s, -s, s], d1: [0, 1, 0], d2: [-1, 0, 0] },
      ].forEach(({ v, d1, d2 }) => L(v, d1, d2))
    } else if (type === 'prism') {
      L([-s, -s, -s], [1, 0, 0], [0, 0, 1])
    } else if (type === 'pyramid') {
      [ { v: [s, -s, s], d1: [-1, 0, 0], d2: [0, 0, -1] },
        { v: [-s, -s, s], d1: [0, 0, -1], d2: [1, 0, 0] },
        { v: [-s, -s, -s], d1: [1, 0, 0], d2: [0, 0, 1] },
        { v: [s, -s, -s], d1: [0, 0, 1], d2: [-1, 0, 0] },
      ].forEach(({ v, d1, d2 }) => L(v, d1, d2))
    }
    return result
  }, [type, s])
}

// ══════════════════ 主组件 ═══════════════════════════

export default function Canvas3D({
  geometry, showFaces = true, showLabels = true,
  visibleLines, hoveredLine, setHoveredLine,
}) {
  const { type, params } = geometry
  const size = params.size ?? 2
  const s = size / 2

  const geoData = useMemo(() => createGeometry(type, params), [type, size])
  const edgeInfo = useMemo(() => getVertexAndEdgeInfo(type, params), [type, size])
  const { points: pts, lines: allLines } = useMemo(() => getLineDefinitions(type, params), [type, size])
  const curveLines = useCurveData(type, s)
  const raMarks = useRightAngleData(type, s)
  const isCurved = ['sphere', 'cylinder', 'cone'].includes(type)

  // 解析线段坐标
  const resolvedLines = useMemo(() => allLines.map(l => {
    const from = resolvePoint(l.from, pts)
    const to = resolvePoint(l.to, pts)
    if (!from || !to) return null
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
    const len = Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2])
    return { ...l, from, to, mid, length: len }
  }).filter(Boolean), [allLines, pts])

  const lineKey = (l) => `${l.id}|${l.category}`

  // 处理 hover
  const handlePointerOver = useCallback((l) => {
    setHoveredLine?.(lineKey(l))
  }, [setHoveredLine])
  const handlePointerOut = useCallback(() => {
    setHoveredLine?.(null)
  }, [setHoveredLine])

  return (
    <>
      <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]} />
      <gridHelper args={[12, 12, '#e0e0e0', '#f0f0f0']} />

      {/* 半透明白色面 */}
      {showFaces && (
        <mesh>
          <primitive attach="geometry" object={geoData} />
          <meshBasicMaterial color="white" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── 自定义线段（多面体）── */}
      {!isCurved && resolvedLines.map(l => {
        const k = lineKey(l)
        const visible = visibleLines.has(k)
        const hovered = hoveredLine === k
        if (!visible && !hovered) return null

        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(l.from[0], l.from[1], l.from[2]),
          new THREE.Vector3(l.to[0], l.to[1], l.to[2]),
        ])

        return (
          <group key={k}>
            <line
              geometry={geo}
              onPointerOver={(e) => { e.stopPropagation(); handlePointerOver(l) }}
              onPointerOut={handlePointerOut}
            >
              <lineBasicMaterial
                color={hovered ? '#4A90E2' : 'black'}
                linewidth={hovered ? 2 : 1}
                transparent={!visible}
                opacity={visible ? 1 : 0.15}
                dashed={l.dashed}
              />
            </line>
            {/* hover 标签 */}
            {hovered && (
              <Billboard position={l.mid} follow>
                <Text fontSize={0.18} color="#4A90E2" anchorX="center" anchorY="bottom"
                  outlineWidth={0.02} outlineColor="white">
                  {l.id} = {l.length.toFixed(2)}
                </Text>
              </Billboard>
            )}
          </group>
        )
      })}

      {/* ── 曲面体基础线框 ── */}
      {isCurved && curveLines.map((pts, i) => (
        <Line key={`curve-${i}`} points={pts} color="black" lineWidth={1} />
      ))}

      {/* ── 曲面体自定义线段 ── */}
      {isCurved && resolvedLines.map(l => {
        const k = lineKey(l)
        const visible = visibleLines.has(k)
        const hovered = hoveredLine === k
        if (!visible && !hovered) return null

        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(l.from[0], l.from[1], l.from[2]),
          new THREE.Vector3(l.to[0], l.to[1], l.to[2]),
        ])

        return (
          <group key={k}>
            <line
              geometry={geo}
              onPointerOver={(e) => { e.stopPropagation(); handlePointerOver(l) }}
              onPointerOut={handlePointerOut}
            >
              <lineBasicMaterial
                color={hovered ? '#4A90E2' : 'black'}
                transparent={!visible}
                opacity={visible ? 1 : 0.15}
                dashed={l.dashed}
              />
            </line>
            {hovered && (
              <Billboard position={l.mid} follow>
                <Text fontSize={0.18} color="#4A90E2" anchorX="center" anchorY="bottom"
                  outlineWidth={0.02} outlineColor="white">
                  {l.id} = {l.length.toFixed(2)}
                </Text>
              </Billboard>
            )}
          </group>
        )
      })}

      {/* ── 顶点标签 ── */}
      {showLabels && edgeInfo.vertices.map((v, i) => (
        <Billboard key={`v-${i}`} position={v} follow>
          <Text fontSize={0.28} color="black" anchorX="center" anchorY="middle">
            {edgeInfo.labels[i] || String.fromCharCode(65 + i)}
          </Text>
        </Billboard>
      ))}

      {/* ── 直角标记 ── */}
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
