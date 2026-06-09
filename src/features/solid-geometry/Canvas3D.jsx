import { useMemo, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Line, Billboard } from '@react-three/drei'
import { createGeometry, getVertexAndEdgeInfo } from '../../engines/geometryEngine'
import { getLineDefinitions, resolvePoint, getLineStyle } from '../../engines/lineDefinitions'
import { searchLines } from '../../engines/lineConnector'
import { CAMERA_PRESETS } from '../../engines/visualIntent'

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
    } else if (type === 'circularFrustum') {
      lines.push(ring(s, 'xz').map(p => [p[0], -s, p[2]]))
      lines.push(ring(s / 2, 'xz').map(p => [p[0], s, p[2]]))
      lines.push([[s, -s, 0], [s / 2, s, 0]])
      lines.push([[-s, -s, 0], [-s / 2, s, 0]])
    }
    return lines
  }, [type, s])
}

// ── 棱边隐形碰撞体 ──────────────────────────────────
/** 为一条线段生成沿其方向的细圆柱体（作点击检测） */
function EdgeHitbox({ from, to, lineData, lineKey, visible, selected, hovered,
  onPointerOver, onPointerOut, onSelect }) {
  const fromVec = useMemo(() => new THREE.Vector3(...from), [from])
  const toVec = useMemo(() => new THREE.Vector3(...to), [to])

  const { mid, length, quaternion } = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5)
    const len = fromVec.distanceTo(toVec)
    const dir = new THREE.Vector3().subVectors(toVec, fromVec).normalize()
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir
    )
    return { mid: mid.toArray(), length: len, quaternion: quat.toArray() }
  }, [fromVec, toVec])

  const pointerDownPos = useRef(null)

  return (
    <mesh
      position={mid}
      quaternion={quaternion}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver(lineData) }}
      onPointerOut={onPointerOut}
      onPointerDown={(e) => {
        e.stopPropagation()
        pointerDownPos.current = [e.clientX, e.clientY]
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        if (pointerDownPos.current) {
          const dx = e.clientX - pointerDownPos.current[0]
          const dy = e.clientY - pointerDownPos.current[1]
          // 移动距离 < 3px 视为点击（非拖拽旋转）
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
            onSelect(lineData)
          }
          pointerDownPos.current = null
        }
      }}
    >
      <cylinderGeometry args={[0.06, 0.06, length, 6]} />
      <meshBasicMaterial
        color={selected ? '#FF8C00' : hovered ? '#4A90E2' : '#000000'}
        transparent
        opacity={0}           // 完全透明，仅作碰撞体
        depthWrite={false}
      />
    </mesh>
  )
}

// ══════════════════ 主组件 ═══════════════════════════

export default function Canvas3D({
  geometry, showFaces = true, showLabels = true,
  visibleLines, hoveredLine, setHoveredLine,
  allLines, shownLengthLabels, searchedLine,
  selectedEdge, onEdgeClick, edgeColorOverrides,
  customVertices,
  // ── VisualIntent-driven props ──
  highlightEdgeIds = [],
  highlightColor = '#FF6B6B',
  auxLines = [],
  cameraPreset = null,
  faceOpacity = 0.42,
  nonHighlightOpacity = 0.25,
}) {
  const { type, params } = geometry
  const size = params.size ?? 2
  const s = size / 2

  const geoData = useMemo(
    () => createGeometry(type, params, customVertices),
    [type, size, customVertices]
  )
  const edgeInfo = useMemo(
    () => getVertexAndEdgeInfo(type, params, customVertices),
    [type, size, customVertices]
  )

  const { points: pts } = useMemo(
    () => getLineDefinitions(type, params, customVertices),
    [type, size, customVertices]
  )

  const curveLines = useCurveData(type, s)
  const isCurved = ['sphere', 'cylinder', 'cone', 'circularFrustum'].includes(type)

  // ── 搜索匹配集 ──
  const searchMatchSet = useMemo(() => {
    if (!searchedLine || !allLines) return new Set()
    const matches = searchLines(searchedLine, allLines)
    return new Set(matches)
  }, [searchedLine, allLines])

  // ── VisualIntent highlight set ──
  const highlightSet = useMemo(() => {
    return new Set(highlightEdgeIds)
  }, [highlightEdgeIds])

  const hasHighlights = highlightEdgeIds.length > 0

  // ── Aux lines (resolved from vertex labels) ──
  const resolvedAuxLines = useMemo(() => {
    if (!auxLines || auxLines.length === 0) return []
    return auxLines.map(al => {
      const from = resolvePoint(al.from, pts)
      const to = resolvePoint(al.to, pts)
      if (!from || !to) return null
      return { ...al, from, to }
    }).filter(Boolean)
  }, [auxLines, pts])

  // ── Camera preset lerp ──
  const cameraRef = useRef(null)
  const targetCamPos = useRef(null)
  const { camera } = useThree()

  // Keep cameraRef in sync
  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  // Update target when preset changes
  useEffect(() => {
    if (cameraPreset && CAMERA_PRESETS[cameraPreset]) {
      targetCamPos.current = CAMERA_PRESETS[cameraPreset]
    } else {
      targetCamPos.current = null
    }
  }, [cameraPreset])

  // Smooth camera lerp
  useFrame((_, delta) => {
    if (!targetCamPos.current || !cameraRef.current) return
    const target = targetCamPos.current
    const cam = cameraRef.current
    const lerpFactor = 1 - Math.exp(-4 * delta) // smooth exponential decay

    cam.position.x += (target[0] - cam.position.x) * lerpFactor
    cam.position.y += (target[1] - cam.position.y) * lerpFactor
    cam.position.z += (target[2] - cam.position.z) * lerpFactor

    // Stop lerping when close enough
    const dist = Math.hypot(
      target[0] - cam.position.x,
      target[1] - cam.position.y,
      target[2] - cam.position.z
    )
    if (dist < 0.02) {
      cam.position.set(target[0], target[1], target[2])
      targetCamPos.current = null
    }
  })

  // ── 解析线段坐标 ──
  const resolvedLines = useMemo(() => (allLines || []).map(l => {
    const from = resolvePoint(l.from, pts)
    const to = resolvePoint(l.to, pts)
    if (!from || !to) return null
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
    const len = Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2])
    return { ...l, from, to, mid, length: len }
  }).filter(Boolean), [allLines, pts])

  const lineKey = (l) => `${l.id}|${l.category}`

  // ── hover 处理 ──
  const handlePointerOver = useCallback((l) => {
    setHoveredLine?.(lineKey(l))
  }, [setHoveredLine])
  const handlePointerOut = useCallback(() => {
    setHoveredLine?.(null)
  }, [setHoveredLine])

  // ── 选中处理 ──
  const handleSelect = useCallback((l) => {
    const key = lineKey(l)
    onEdgeClick?.(key === selectedEdge ? null : key)
  }, [onEdgeClick, selectedEdge])

  // ── 渲染单条线段 ──
  const renderLine = (l, key) => {
    const visible = visibleLines.has(key)
    const hovered = hoveredLine === key
    const searched = searchMatchSet.has(key)
    const selected = selectedEdge === key
    const showLen = shownLengthLabels?.has(key) && visible

    const style = getLineStyle(l.category)

    // Determine if this edge is highlighted via VisualIntent
    const isVisualHighlight = hasHighlights && highlightSet.has(l.id)

    let color, opacity
    if (selected) {
      color = '#FF8C00'; opacity = 1
    } else if (hovered) {
      color = '#4A90E2'; opacity = 1
    } else if (searched) {
      color = '#2979ff'; opacity = 1
    } else if (isVisualHighlight) {
      color = highlightColor; opacity = 1
    } else if (hasHighlights && !isVisualHighlight) {
      // 有高亮时，与题目无关的线完全隐藏（不参与当前步骤的认知动作）
      color = style.color; opacity = 0
    } else if (l.colorOverride) {
      color = l.colorOverride; opacity = style.opacity
    } else if (edgeColorOverrides?.[key]) {
      color = edgeColorOverrides[key]; opacity = style.opacity
    } else if (visible) {
      color = style.color; opacity = style.opacity
    } else {
      color = style.color; opacity = 0
    }

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(l.from[0], l.from[1], l.from[2]),
      new THREE.Vector3(l.to[0], l.to[1], l.to[2]),
    ])

    // 仅棱和自定义边有碰撞体（对角线和辅助线太细不需要）
    const isEdge = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) || l.custom

    return (
      <group key={key}>
        {/* 可见线段 */}
        <line geometry={geo} visible={opacity > 0} raycast={() => {}}>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            dashed={style.dash || l.dashed}
          />
        </line>

        {/* 隐形碰撞体（仅棱边） */}
        {isEdge && (
          <EdgeHitbox
            from={l.from} to={l.to}
            lineData={l} lineKey={key}
            visible={visible} selected={selected} hovered={hovered}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onSelect={handleSelect}
          />
        )}

        {/* 长度标签 */}
        {showLen && visible && (
          <Billboard position={l.mid} follow>
            <Text
              fontSize={0.14} color="#666666"
              anchorX="center" anchorY="bottom"
              outlineWidth={0.015} outlineColor="#f0f0f3"
            >
              {l.id} = {l.length.toFixed(2)}
            </Text>
          </Billboard>
        )}
      </group>
    )
  }

  return (
    <>
      {/* 白色背景 */}
      <color attach="background" args={['#f8f9fb']} />

      <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]} />

      {/* 半透明灰色面 — opacity driven by VisualIntent */}
      {showFaces && (
        <mesh>
          <primitive attach="geometry" object={geoData} />
          <meshBasicMaterial color="#d0d0d8" transparent opacity={faceOpacity} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── VisualIntent Auxiliary Lines ── */}
      {resolvedAuxLines.map((al, i) => (
        <group key={`aux-${i}`}>
          <line geometry={
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(al.from[0], al.from[1], al.from[2]),
              new THREE.Vector3(al.to[0], al.to[1], al.to[2]),
            ])
          }>
            <lineBasicMaterial
              color={al.color || '#4A90E2'}
              transparent
              opacity={0.7}
              dashed={al.dashed !== false}
            />
          </line>
        </group>
      ))}

      {/* ── 多面体线段 ── */}
      {!isCurved && resolvedLines.map(l => renderLine(l, lineKey(l)))}

      {/* ── 曲面体线框 ── */}
      {isCurved && curveLines.map((pts, i) => (
        <Line key={`curve-${i}`} points={pts} color="#aaaaaa" lineWidth={1} />
      ))}

      {/* ── 曲面体线段 ── */}
      {isCurved && resolvedLines.map(l => renderLine(l, lineKey(l)))}

      {/* ── 顶点标签 ── */}
      {showLabels && edgeInfo.vertices.map((v, i) => (
        <Billboard key={`v-${i}`} position={v} follow>
          <Text fontSize={0.28} color="#1d1d1f" anchorX="center" anchorY="middle">
            {edgeInfo.labels[i] || String.fromCharCode(65 + i)}
          </Text>
        </Billboard>
      ))}

      <OrbitControls enableZoom enablePan enableRotate />
    </>
  )
}
