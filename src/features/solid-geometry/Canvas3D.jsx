import { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import { createGeometry, getVertexAndEdgeInfo, createGeometryFromSceneIR } from '../../engines/geometryEngine';
import { getLineDefinitions, resolvePoint, getLineStyle } from '../../engines/lineDefinitions';
import { CAMERA_PRESETS } from '../../engines/visualIntent';
import { normalizeSubscripts } from '../../engines/labelMapper';
import { HighlightEngine, HIGHLIGHT_COLORS_CONST } from '../../engines/highlightEngine';
import AnnotationRenderer from '../../renderers/AnnotationRenderer';
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const ANIMATION_DURATION = 600;

/** 按 drawProgress(0→1) 截取线段，呈现「画出」过程 */
function geometryWithDrawProgress(from, to, progress, fallbackGeo) {
  if (!from || !to || progress == null || progress >= 0.999) return fallbackGeo;
  const p = Math.max(0.001, Math.min(1, progress));
  const end = [
    from[0] + (to[0] - from[0]) * p,
    from[1] + (to[1] - from[1]) * p,
    from[2] + (to[2] - from[2]) * p,
  ];
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from[0], from[1], from[2]),
    new THREE.Vector3(end[0], end[1], end[2]),
  ]);
}
function ring(radius, plane, seg = 64) {
 const pts = [];
 for (let i = 0; i <= seg; i++) {
 const a = (i / seg) * Math.PI * 2;
 const x = Math.cos(a) * radius;
 const y = Math.sin(a) * radius;
 if (plane === 'xy')
 pts.push([x, y, 0]);
 else if (plane === 'xz')
 pts.push([x, 0, y]);
 else
 pts.push([0, x, y]);
 }
 return pts;
}
function useCurveData(type, s, sceneIRMode = false) {
 return useMemo(() => {
 const lines = [];
 if (type === 'sphere') {
 lines.push(ring(s, 'xy'));
 lines.push(ring(s, 'xz'));
 lines.push(ring(s, 'yz'));
 }
 else if (type === 'cylinder') {
 // sceneIR 网格半径 s/2（geometryEngine 分支），非 sceneIR 网格半径 s
 const cylR = sceneIRMode ? s / 2 : s;
 lines.push(ring(cylR, 'xz').map(p => [p[0], s, p[2]]));
 lines.push(ring(cylR, 'xz').map(p => [p[0], -s, p[2]]));
 lines.push([[cylR, -s, 0], [cylR, s, 0]]);
 lines.push([[-cylR, -s, 0], [-cylR, s, 0]]);
 }
 else if (type === 'cone') {
 lines.push(ring(s, 'xz').map(p => [p[0], -s, p[2]]));
 lines.push([[s, -s, 0], [0, s, 0]]);
 lines.push([[-s, -s, 0], [0, s, 0]]);
 lines.push([[0, -s, s], [0, s, 0]]);
 lines.push([[0, -s, -s], [0, s, 0]]);
 }
 else if (type === 'circularFrustum') {
 lines.push(ring(s, 'xz').map(p => [p[0], -s, p[2]]));
 lines.push(ring(s / 2, 'xz').map(p => [p[0], s, p[2]]));
 lines.push([[s, -s, 0], [s / 2, s, 0]]);
 lines.push([[-s, -s, 0], [-s / 2, s, 0]]);
 }
 return lines;
 }, [type, s, sceneIRMode]);
}
function EdgeHitbox({ from, to, lineData, lineKey, visible, selected, hovered, onPointerOver, onPointerOut, onSelect }) {
 const fromVec = useMemo(() => new THREE.Vector3(...from), [from]);
 const toVec = useMemo(() => new THREE.Vector3(...to), [to]);
 const { mid, length, quaternion } = useMemo(() => {
 const mid = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);
 const len = fromVec.distanceTo(toVec);
 const dir = new THREE.Vector3().subVectors(toVec, fromVec).normalize();
 const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
 return { mid: mid.toArray(), length: len, quaternion: quat.toArray() };
 }, [fromVec, toVec]);
 const pointerDownPos = useRef(null);
 return (<mesh position={mid} quaternion={quaternion} onPointerOver={(e) => { e.stopPropagation(); onPointerOver(lineData); }} onPointerOut={onPointerOut} onPointerDown={(e) => {
 e.stopPropagation();
 pointerDownPos.current = [e.clientX, e.clientY];
 }} onPointerUp={(e) => {
 e.stopPropagation();
 if (pointerDownPos.current) {
 const dx = e.clientX - pointerDownPos.current[0];
 const dy = e.clientY - pointerDownPos.current[1];
 if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
 onSelect(lineData);
 }
 pointerDownPos.current = null;
 }
 }}>
 <cylinderGeometry args={[0.06, 0.06, length, 6]}/>
 <meshBasicMaterial color={selected ? '#FF8C00' : hovered ? '#4A90E2' : '#000000'} transparent opacity={0} depthWrite={false}/>
 </mesh>);
}
function PlaneMesh({ points, color = '#4A90E2', opacity = 0.2 }) {
 const geometry = useMemo(() => {
 if (points.length < 3)
 return null;
 const shape = new THREE.Shape();
 shape.moveTo(points[0][0], points[0][2]);
 for (let i = 1; i < points.length; i++) {
 shape.lineTo(points[i][0], points[i][2]);
 }
 shape.closePath();
 const extrudeSettings = { depth: 0.01, bevelEnabled: false };
 return new THREE.ExtrudeGeometry(shape, extrudeSettings);
 }, [points]);
 if (!geometry)
 return null;
 return (<mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
 <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide}/>
 </mesh>);
}
function SectionPolygon({ points, color = '#FF6B6B', opacity = 0.3, renderOrder = 2 }) {
 const geometry = useMemo(() => {
 if (points.length < 3)
 return null;
 const vertices = points.map(p => new THREE.Vector3(...p));
 const faces = [];
 for (let i = 1; i < vertices.length - 1; i++) {
 faces.push(0, i, i + 1);
 }
 const geo = new THREE.BufferGeometry();
 geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
 geo.setIndex(faces);
 return geo;
 }, [points]);
 if (!geometry)
 return null;
 return (<mesh geometry={geometry} renderOrder={renderOrder}>
 <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false}/>
 </mesh>);
}
function PointMarker({ position, highlighted = false, size = 0.035, color = null, opacity = 1 }) {
 const core = color || (highlighted ? '#C2410C' : '#2A2A2A');
 return (<group position={position}>
 <mesh>
 <sphereGeometry args={[size, 12, 12]}/>
 <meshBasicMaterial color={core} transparent opacity={opacity}/>
 </mesh>
 </group>);
}
const Canvas3D = memo(function Canvas3D({
 geometry, showFaces = true, showLabels = true,
 visibleLines, hoveredLine, setHoveredLine,
 allLines, shownLengthLabels, searchedLine,
 selectedEdge, onEdgeClick, edgeColorOverrides,
 customVertices,
 sceneIR = null,
 highlightEdgeIds = [],
 highlightColor = '#4A90E2',
 auxLines = [],
 faceOpacity = 0.20,
 nonHighlightOpacity = 1.0,
 vertexLabels = null,
 cameraResetKey = 0,
 cameraTarget = null,
 sphereOverlay = null,
 isDark = false,
 measureMode = 'none',
 measurements = [],
 annotationMode = 'none',
 annotations = [],
 activeCut = null,
 viewPreset = 'default',
}) {
 const { type, params } = geometry;
 const size = params.size ?? 2;
 const s = size / 2;
 const geoData = useMemo(() => {
 if (sceneIR) {
 return createGeometryFromSceneIR(sceneIR);
 }
 return createGeometry(type, params, customVertices);
}, [type, size, customVertices, sceneIR]);
 const edgeInfo = useMemo(() => getVertexAndEdgeInfo(type, params, customVertices, vertexLabels), [type, size, customVertices, vertexLabels]);
 const { points: pts } = useMemo(() => getLineDefinitions(type, params, customVertices, vertexLabels), [type, size, customVertices, vertexLabels]);
 const curveLines = useCurveData(type, (sceneIR?.size ?? size) / 2, !!sceneIR);
 const isCurved = ['sphere', 'cylinder', 'cone', 'circularFrustum'].includes(type);
 const searchMatchSet = useMemo(() => {
 if (!searchedLine || !allLines)
 return new Set();
 const matches = allLines.filter(l => l.id.toLowerCase().includes(searchedLine.toLowerCase()) ||
 (l.from + l.to).toLowerCase().includes(searchedLine.toLowerCase()));
 return new Set(matches.map(l => `${l.id}|${l.category}`));
 }, [searchedLine, allLines]);
 const { effectiveHighlightIds, effectiveAuxLines, effectiveFaceOpacity, effectiveNonHighlightOpacity } = useMemo(() => {
 if (sceneIR) {
 return {
 effectiveHighlightIds: sceneIR.highlightEdges || [],
 effectiveAuxLines: [],
 effectiveFaceOpacity: faceOpacity ?? 0.42,
 effectiveNonHighlightOpacity: nonHighlightOpacity ?? 0.25,
 };
 }
 return {
 effectiveHighlightIds: (highlightEdgeIds && highlightEdgeIds.length > 0)
 ? highlightEdgeIds
 : (sceneIR?.highlightEdges || []),
 effectiveAuxLines: (auxLines && auxLines.length > 0)
 ? auxLines
 : (sceneIR?.auxLines || []),
 effectiveFaceOpacity: faceOpacity ?? sceneIR?.faceOpacity ?? 0.42,
 effectiveNonHighlightOpacity: nonHighlightOpacity ?? sceneIR?.nonHighlightOpacity ?? 0.25,
 };
 }, [sceneIR, highlightEdgeIds, auxLines, faceOpacity, nonHighlightOpacity]);
 const highlightSet = useMemo(() => new Set(effectiveHighlightIds), [effectiveHighlightIds]);
 const hasHighlights = effectiveHighlightIds.length > 0 || (sceneIR?.lines || []).some(l => l.highlighted);
 const sphereGeo = useMemo(() => {
 if (!sphereOverlay)
 return null;
 return new THREE.SphereGeometry(sphereOverlay.radius, 64, 32);
 }, [sphereOverlay?.radius]);
 const highlightEngine = useRef(new HighlightEngine());
const [transitionTick, setTransitionTick] = useState(0);
const animating = useRef(false);
const sceneIRAnim = useRef({ camera: null });
 useEffect(() => {
 highlightEngine.current.setColor(highlightColor);
 const highlightPoints = sceneIR?.highlightPoints || [];
 // 高亮线的真实来源：逐步更新的 per-line highlighted 标志 ∪ 基础 highlightEdges
 // （applySceneStateToIR 只更新 per-line 标志、不同步 highlightEdges，二者会发散，故取并集）
 const flaggedLines = (sceneIR?.lines || []).filter(l => l.highlighted).map(l => l.id);
 const highlightLines = [...new Set([...flaggedLines, ...(sceneIR?.highlightEdges || [])])];
 const highlightPlanes = sceneIR?.highlightPlanes || [];
 const highlightLabels = sceneIR?.highlightLabels || [];
 highlightEngine.current.setHighlights(highlightPoints, highlightLines, highlightPlanes, highlightLabels);
 }, [effectiveHighlightIds, sceneIR, highlightColor]);
 // 数据流验证：SceneIR.annotations 已到达 Canvas3D（第一阶段仅打印，不渲染）
 useEffect(() => {
 if (sceneIR?.annotations) {
 console.debug('annotations', sceneIR.annotations);
 }
 }, [sceneIR]);
 const currentFaceOpacity = useRef(effectiveFaceOpacity);
 const targetFaceOpacity = useRef(effectiveFaceOpacity);
 useEffect(() => {
 targetFaceOpacity.current = effectiveFaceOpacity;
 if (Math.abs(currentFaceOpacity.current - effectiveFaceOpacity) > 0.005) {
 animating.current = true;
 }
 }, [effectiveFaceOpacity]);
 const prevAuxLineKeys = useRef(new Set());
 const auxAnimData = useRef(new Map());
 const [auxTick, setAuxTick] = useState(0);
 useEffect(() => {
 const newKeys = new Set(effectiveAuxLines.map((_, i) => `aux-${i}`));
 const oldKeys = prevAuxLineKeys.current;
 const now = performance.now();
 let hasChange = false;
 effectiveAuxLines.forEach((_, i) => {
 const key = `aux-${i}`;
 if (!auxAnimData.current.has(key)) {
 auxAnimData.current.set(key, { opacity: 0, targetOpacity: 0.7, startTime: now });
 hasChange = true;
 }
 });
 oldKeys.forEach(key => {
 if (!newKeys.has(key)) {
 const existing = auxAnimData.current.get(key);
 if (existing && existing.targetOpacity !== 0) {
 auxAnimData.current.set(key, { ...existing, targetOpacity: 0, startTime: now });
 hasChange = true;
 }
 }
 });
 prevAuxLineKeys.current = newKeys;
 if (hasChange)
 animating.current = true;
 }, [effectiveAuxLines]);
 const currentLabelOpacity = useRef(showLabels ? 1 : 0);
 const targetLabelOpacity = useRef(showLabels ? 1 : 0);
 useEffect(() => {
 targetLabelOpacity.current = showLabels ? 1 : 0;
 if (Math.abs(currentLabelOpacity.current - targetLabelOpacity.current) > 0.01) {
 animating.current = true;
 }
 }, [showLabels]);
 const cameraTargetPos = useRef(new THREE.Vector3(4, 4, 6));
 const cameraAnimating = useRef(false);
 const controlsRef = useRef(null);
 // 步骤切换不再夺镜头；仅重置/视角预设会飞镜

 const frameSkip = useRef(0);
 const { camera } = useThree();
 const cameraRef = useRef(null);
 useEffect(() => {
 cameraRef.current = camera;
 }, [camera]);
 useFrame(() => {
 let anyActive = false;
 if (highlightEngine.current.update()) {
 anyActive = true;
 }
 if (Math.abs(currentFaceOpacity.current - targetFaceOpacity.current) > 0.002) {
 currentFaceOpacity.current += (targetFaceOpacity.current - currentFaceOpacity.current) * 0.06;
 anyActive = true;
 }
 else {
 currentFaceOpacity.current = targetFaceOpacity.current;
 }
 let auxChanged = false;
 auxAnimData.current.forEach((data, key) => {
 if (data.targetOpacity === 0 && data.opacity > 0.001) {
 data.opacity += (0 - data.opacity) * 0.08;
 if (data.opacity < 0.001) {
 auxAnimData.current.delete(key);
 auxChanged = true;
 }
 anyActive = true;
 }
 else if (data.targetOpacity > 0 && Math.abs(data.opacity - data.targetOpacity) > 0.005) {
 data.opacity += (data.targetOpacity - data.opacity) * 0.08;
 anyActive = true;
 }
 else {
 data.opacity = data.targetOpacity;
 }
 });
 if (auxChanged) {
 anyActive = true;
 setAuxTick(t => t + 1);
 }
 if (Math.abs(currentLabelOpacity.current - targetLabelOpacity.current) > 0.01) {
 currentLabelOpacity.current += (targetLabelOpacity.current - currentLabelOpacity.current) * 0.08;
 anyActive = true;
 }
 else {
 currentLabelOpacity.current = targetLabelOpacity.current;
 }
 if (cameraAnimating.current && cameraRef.current) {
 const cam = cameraRef.current;
 const target = cameraTargetPos.current;
 const dx = target.x - cam.position.x;
 const dy = target.y - cam.position.y;
 const dz = target.z - cam.position.z;
 const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
 if (dist < 0.02) {
 cameraAnimating.current = false;
 cam.position.copy(target);
 cam.lookAt(0, 0, 0);
 if (controlsRef.current) {
 controlsRef.current.target.set(0, 0, 0);
 controlsRef.current.update();
 }
 }
 else {
 cam.position.x += dx * 0.055;
 cam.position.y += dy * 0.055;
 cam.position.z += dz * 0.055;
 cam.lookAt(0, 0, 0);
 anyActive = true;
 }
 }

 if (anyActive) {
 frameSkip.current++;
 if (frameSkip.current % 3 === 0) {
 setTransitionTick(t => t + 1);
 }
 }
 else {
 animating.current = false;
 frameSkip.current = 0;
 }
 });
 const resolvedAuxLines = useMemo(() => {
 if (!effectiveAuxLines || effectiveAuxLines.length === 0)
 return [];
 return effectiveAuxLines.map((al, i) => {
 const from = resolvePoint(al.from, pts);
 const to = resolvePoint(al.to, pts);
 if (!from || !to)
 return null;
 return { ...al, from, to, _origIndex: i };
 }).filter(Boolean);
 }, [effectiveAuxLines, pts]);
 const cameraRef2 = useRef(null);
 useEffect(() => {
 cameraRef2.current = camera;
 cameraRef.current = camera;
 }, [camera]);
 const viewPresets = useMemo(() => ({
 default: CAMERA_PRESETS.overview,
 top: [0, 6, 0],
 front: [0, 0, 6],
 side: [6, 0, 0],
 back: [0, 0, -6],
 bottom: [0, -6, 0],
 isometric: [4, 4, 4],
 }), []);
 // 跳过首次挂载，避免与 Canvas 初始相机打架；仅手动重置/切预设时飞镜
 const cameraBootstrapped = useRef(false);
 useEffect(() => {
 if (!cameraBootstrapped.current) {
 cameraBootstrapped.current = true;
 return;
 }
 const target = viewPresets[viewPreset] || CAMERA_PRESETS.overview;
 if (cameraRef2.current) {
 cameraTargetPos.current.set(target[0], target[1], target[2]);
 cameraAnimating.current = true;
 animating.current = true;
 }
 }, [cameraResetKey, viewPreset, viewPresets]);
 const resolvedLines = useMemo(() => {
 if (sceneIR && sceneIR.lines) {
 const pointMap = new Map(sceneIR.points.map(p => [p.id, p.position]));
 return sceneIR.lines.map(l => {
 const from = pointMap.get(l.from) || resolvePoint(l.from, pts);
 const to = pointMap.get(l.to) || resolvePoint(l.to, pts);
 if (!from || !to)
 return null;
 const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
 const len = Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
 const geometry = new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(from[0], from[1], from[2]),
 new THREE.Vector3(to[0], to[1], to[2]),
 ]);
 return { ...l, from, to, mid, length: len, _geo: geometry };
 }).filter(Boolean);
 }
 return (allLines || []).map(l => {
 const from = resolvePoint(l.from, pts);
 const to = resolvePoint(l.to, pts);
 if (!from || !to)
 return null;
 const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
 const len = Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
 const geometry = new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(from[0], from[1], from[2]),
 new THREE.Vector3(to[0], to[1], to[2]),
 ]);
 return { ...l, from, to, mid, length: len, _geo: geometry };
 }).filter(Boolean);
 }, [allLines, pts, sceneIR]);
 const lineKey = (l) => `${l.id}|${l.category}`;
 const handlePointerOver = useCallback((l) => {
 setHoveredLine?.(lineKey(l));
 }, [setHoveredLine]);
 const handlePointerOut = useCallback(() => {
 setHoveredLine?.(null);
 }, [setHoveredLine]);
 const handleSelect = useCallback((l) => {
 const key = lineKey(l);
 onEdgeClick?.(key === selectedEdge ? null : key);
 }, [onEdgeClick, selectedEdge]);
 const renderLine = (l, key) => {
 const visible = visibleLines ? visibleLines.has(key) : true;
 const hovered = hoveredLine === key;
 const searched = searchMatchSet.has(key);
 const selected = selectedEdge === key;
 const showLen = shownLengthLabels?.has(key) && visible;
 const style = getLineStyle(l.category);
 const lineState = highlightEngine.current.getLineState(l.id);
 const ink = '#1f2430';
 let color, opacity;
 if (selected) {
 color = '#FF8C00';
 opacity = 1;
 }
 else if (hovered) {
 color = '#2563eb';
 opacity = 1;
 }
 else if (searched) {
 color = '#2563eb';
 opacity = 1;
 }
 else if (lineState.highlighted) {
 color = lineState.color || highlightColor || '#2563eb';
 opacity = lineState.opacity ?? 1;
 }
 else if (hasHighlights && !lineState.highlighted) {
 const isStructural = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category);
 color = ink;
 opacity = isStructural ? 0.5 : 0.08;
 }
 else if (l.colorOverride) {
 color = l.colorOverride;
 opacity = style.opacity;
 }
 else if (edgeColorOverrides?.[key]) {
 color = edgeColorOverrides[key];
 opacity = style.opacity;
 }
 else if (visible) {
 color = ink;
 opacity = Math.max(style.opacity ?? 1, 0.9);
 }
 else {
 color = ink;
 opacity = 0;
 }
 if (!hasHighlights && !selected && !hovered && !searched && effectiveNonHighlightOpacity < 1.0) {
 opacity *= effectiveNonHighlightOpacity;
 }
 const isEdge = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) || l.custom;
 const drawGeo = geometryWithDrawProgress(l.from, l.to, lineState.drawProgress, l._geo);
 return (<group key={key}>
 <line geometry={drawGeo} visible={opacity > 0} raycast={() => { }}>
 <lineBasicMaterial color={color} transparent opacity={opacity} dashed={style.dash || l.dashed}/>
 </line>
 {isEdge && (<EdgeHitbox from={l.from} to={l.to} lineData={l} lineKey={key} visible={visible} selected={selected} hovered={hovered} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onSelect={handleSelect}/>)}
 {showLen && visible && (<Billboard position={l.mid} follow>
 <Text fontSize={0.14} color={'#2a2a2a'} anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor={'#f4f6f8'}>
 {l.id} = {l.length.toFixed(2)}
 </Text>
 </Billboard>)}
 </group>);
 };
 const labelOpacity = currentLabelOpacity.current;
 const sceneIRPoints = useMemo(() => {
 if (!sceneIR || !sceneIR.points)
 return [];
 return sceneIR.points;
 }, [sceneIR]);
 const pointsCentroid = useMemo(() => {
 // position 为 null 的点不参与质心计算（安全跳过，不影响正常点）
 const validPoints = sceneIRPoints.filter(p => p.position != null);
 if (!validPoints.length)
 return [0, 0, 0];
 const sum = [0, 0, 0];
 validPoints.forEach(p => {
 sum[0] += p.position[0];
 sum[1] += p.position[1];
 sum[2] += p.position[2];
 });
 return [sum[0] / validPoints.length, sum[1] / validPoints.length, sum[2] / validPoints.length];
 }, [sceneIRPoints]);
 // 标签沿"质心→顶点"方向径向外移 + 轻微上移，避免压在几何体表面
 const labelPosition = (pos) => {
 if (pos == null)
 return null; // null 坐标不创建 label position
 const dx = pos[0] - pointsCentroid[0];
 const dy = pos[1] - pointsCentroid[1];
 const dz = pos[2] - pointsCentroid[2];
 const len = Math.hypot(dx, dy, dz) || 1;
 const out = 0.3;
 return [pos[0] + (dx / len) * out, pos[1] + (dy / len) * out + 0.12, pos[2] + (dz / len) * out];
 };
 const sceneIRSections = useMemo(() => {
 if (!sceneIR || !sceneIR.sections)
 return [];
 const pointMap = new Map(sceneIR.points.map(p => [p.id, p.position]));
 return sceneIR.sections.map(section => {
 // 明确为 null 的坐标安全跳过（不进入截面多边形）；未定义引用保持原 [0,0,0] 兜底
 const points = section.points
 .map(p => pointMap.get(p) === null ? null : (pointMap.get(p) || [0, 0, 0]))
 .filter(pos => pos !== null);
 return { ...section, resolvedPoints: points };
 });
 }, [sceneIR]);
 return (<>
 <color attach="background" args={['#f4f6f8']}/>

 <ambientLight intensity={0.9}/>
 <directionalLight position={[5, 8, 6]} intensity={1.05}/>
 <directionalLight position={[-6, -4, -5]} intensity={0.35}/>

 {sceneIR && (<>
 {showFaces && (<mesh renderOrder={1}>
 <primitive attach="geometry" object={geoData}/>
 <meshLambertMaterial color={'#d8dde6'} transparent opacity={currentFaceOpacity.current} depthWrite={false} side={THREE.DoubleSide}/>
 </mesh>)}
 {sceneIRPoints.map((point, i) => {
 const pointState = highlightEngine.current.getPointState(point.id);
 const labelState = highlightEngine.current.getLabelState(point.id);
 return (<group key={`ir-point-${i}`}>
 {point.visible !== false && point.position != null && (<group scale={pointState.scale}>
 <PointMarker position={point.position} highlighted={pointState.highlighted} color={pointState.color} opacity={pointState.opacity}/>
 </group>)}
 {point.visible !== false && point.position != null && showLabels && (<Billboard key={`label-${i}`} position={labelPosition(point.position)} follow>
 <Text fontSize={0.35 * labelState.scale} color={labelState.color || '#1a1a1a'} anchorX="center" anchorY="middle" outlineWidth={0.035} outlineColor={'#f4f6f8'} opacity={labelState.opacity} transparent depthTest={false}>
 {normalizeSubscripts(point.label)}
 </Text>
 </Billboard>)}
 </group>);
 })}
 {resolvedLines.map(l => {
 const lineState = highlightEngine.current.getLineState(l.id);
 const isHL = lineState.highlighted || l.highlighted;
 const isAux = l.category === '辅助线' || l.category === '辅助构造线';
 const isStructural = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category);
 const style = getLineStyle(l.category);
 // 教材图：结构棱始终深墨色；高亮用强调色；勿在暗底用 #333
 const ink = '#1f2430';
 let color, opacity, dashed = l.dashed || style.dash;
 if (isHL) {
 color = lineState.color || highlightColor || '#2563eb';
 opacity = lineState.opacity ?? 1;
 }
 else if (isAux) {
 color = l.color || '#7c3aed';
 opacity = hasHighlights ? 0.45 : 0.85;
 dashed = true;
 }
 else if (hasHighlights) {
 color = ink;
 opacity = isStructural ? 0.55 : 0.12;
 }
 else if (l.category === '母线') {
 color = ink;
 opacity = 0;
 }
 else {
 color = isStructural ? ink : (style.color === '#333333' || style.color === '#999999' ? ink : style.color);
 opacity = Math.max(style.opacity ?? 1, 0.85);
 }
 if (l.visible === false)
 opacity = 0;
 const drawGeo = geometryWithDrawProgress(l.from, l.to, lineState.drawProgress, l._geo);
 return (<line key={`ir-line-${l.id}`} geometry={drawGeo} visible={opacity > 0.001} renderOrder={3}>
 <lineBasicMaterial color={color} transparent opacity={opacity} dashed={dashed}/>
 </line>);
 })}
 {sceneIRSections.map((section, i) => {
 const planeState = highlightEngine.current.getPlaneState(section.label || `plane_${i}`);
 return (<SectionPolygon key={`section-${i}`} points={section.resolvedPoints} color={planeState.color} opacity={planeState.opacity}/>);
 })}
 <AnnotationRenderer annotations={sceneIR.annotations} points={sceneIR.points} lines={sceneIR.lines}/>
 </>)}

 {!sceneIR && showFaces && (<mesh renderOrder={1}>
 <primitive attach="geometry" object={geoData}/>
 <meshLambertMaterial color={'#d8dde6'} transparent opacity={currentFaceOpacity.current} depthWrite={false} side={THREE.DoubleSide}/>
 </mesh>)}

 {!sceneIR && sphereOverlay && sphereGeo && (<mesh>
 <primitive attach="geometry" object={sphereGeo}/>
 <meshBasicMaterial color={sphereOverlay.color || '#4A90E2'} transparent opacity={sphereOverlay.opacity ?? 0.15} depthWrite={false} wireframe={sphereOverlay.wireframe !== false}/>
 </mesh>)}

 {!sceneIR && resolvedAuxLines.map((al, i) => {
 const animData = auxAnimData.current.get(`aux-${al._origIndex}`);
 const lineOpacity = animData?.opacity ?? (effectiveAuxLines[al._origIndex] ? 0.7 : 0);
 return (<group key={`aux-${i}`}>
 <line geometry={new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(al.from[0], al.from[1], al.from[2]),
 new THREE.Vector3(al.to[0], al.to[1], al.to[2]),
 ])}>
 <lineBasicMaterial color={al.color || '#2563eb'} transparent opacity={lineOpacity} dashed={al.dashed !== false}/>
 </line>
 </group>);
 })}

 {!sceneIR && !isCurved && resolvedLines.map(l => renderLine(l, lineKey(l)))}

 {isCurved && curveLines.map((pts, i) => {
 const curveGeo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
 return (<line key={`curve-${i}`} geometry={curveGeo} renderOrder={3}>
 <lineBasicMaterial color={'#1f2430'} transparent opacity={0.9}/>
 </line>);
 })}

 {!sceneIR && isCurved && resolvedLines.map(l => renderLine(l, lineKey(l)))}

 {!sceneIR && edgeInfo.vertices.map((v, i) => {
 const rawLabel = edgeInfo.labels[i] || String.fromCharCode(65 + i);
 const displayLabel = normalizeSubscripts(rawLabel);
 return (<Billboard key={`v-${i}`} position={labelPosition(v)} follow>
 <Text fontSize={0.35} color={'#1a1a1a'} anchorX="center" anchorY="middle" outlineWidth={0.035} outlineColor={'#f4f6f8'} opacity={1.0} transparent depthTest={false}>
 {displayLabel}
 </Text>
 </Billboard>);
 })}

 <OrbitControls
 ref={controlsRef}
 makeDefault
 enableZoom
 enablePan
 enableRotate
/>
 </>);
});
export default Canvas3D;