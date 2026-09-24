import { useMemo, useCallback, useRef, useEffect, memo } from 'react';
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
// 飞镜兜底时长：动画期间每帧覆盖相机位置，一旦结束条件失效就会永久卡住
const CAMERA_FLY_TIMEOUT_MS = 1200;
// 命令式逐帧绑定的登记工具：把 r3f 元素实例登记进 Map，卸载时移除。
// 逐帧动画直接改 Three 对象属性，不再靠 setState 触发整棵子树重渲染。
function setMapRef(mapRef, key, value) {
 if (value)
 mapRef.current.set(key, value);
 else
 mapRef.current.delete(key);
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
 <meshBasicMaterial color={selected ? '#4D6BFE' : hovered ? '#4D6BFE' : '#000000'} transparent opacity={0} depthWrite={false}/>
 </mesh>);
}
function PlaneMesh({ points, color = '#4D6BFE', opacity = 0.2 }) {
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
function SectionPolygon({ points, color = '#4D6BFE', opacity = 0.3, renderOrder = 2, matRef }) {
 const geometry = useMemo(() => {
 if (points.length < 3)
 return null;
 const vertices = points.map(p => new THREE.Vector3(...p));
 const faces = [];
 for (let i = 1; i < vertices.length - 1; i++) {
 faces.push(0, i, i + 1);
 }
 // 用 setFromPoints：vertices 是 Vector3 对象数组，Array.flat() 只展开
 // 嵌套数组、不展开对象，配 Float32BufferAttribute 会整条变成 NaN
 // （Three.js 只报一条 computeBoundingSphere 的 warning，不抛错）。
 const geo = new THREE.BufferGeometry().setFromPoints(vertices);
 geo.setIndex(faces);
 return geo;
 }, [points]);
 if (!geometry)
 return null;
 return (<mesh geometry={geometry} renderOrder={renderOrder}>
 <meshBasicMaterial ref={matRef} color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false}/>
 </mesh>);
}
function PointMarker({ position, highlighted = false, size = 0.035, color = null, opacity = 1 }) {
 const core = color || (highlighted ? '#2F4BD6' : '#2A2A2A');
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
 highlightColor = '#4D6BFE',
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
 // 线的高亮视觉解析：渲染时取初值，useFrame 里逐帧复用同一份逻辑。
 // restingOpacity 是「不高亮」时的静态透明度，高亮动画结束后回落到它，
 // 这样无需额外重渲染即可收敛到静止态。
 const resolveLineVisual = (l, lineState) => {
 const isHL = lineState.highlighted || l.highlighted;
 const isAux = l.category === '辅助线' || l.category === '辅助构造线';
 const isStructural = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category);
 const style = getLineStyle(l.category);
 // 教材图：结构棱始终深墨色；高亮用强调色；勿在暗底用 #333
 const ink = '#1f2430';
 let color, restingOpacity, dashed = l.dashed || style.dash;
 if (isAux) {
 color = l.color || '#7c3aed';
 restingOpacity = hasHighlights ? 0.45 : 0.85;
 dashed = true;
 }
 else if (hasHighlights) {
 color = ink;
 restingOpacity = isStructural ? 0.55 : 0.12;
 }
 else if (l.category === '母线') {
 color = ink;
 restingOpacity = 0;
 }
 else {
 color = isStructural ? ink : (style.color === '#333333' || style.color === '#999999' ? ink : style.color);
 restingOpacity = Math.max(style.opacity ?? 1, 0.85);
 }
 if (l.visible === false)
 restingOpacity = 0;
 return {
 color: isHL ? (lineState.color || highlightColor || '#2563eb') : color,
 opacity: isHL ? (lineState.opacity ?? 1) : restingOpacity,
 restingOpacity,
 dashed,
 };
 };
 const sphereGeo = useMemo(() => {
 if (!sphereOverlay)
 return null;
 return new THREE.SphereGeometry(sphereOverlay.radius, 64, 32);
 }, [sphereOverlay?.radius]);
 const highlightEngine = useRef(new HighlightEngine());
const animating = useRef(false);
// 命令式动画注册表：useFrame 每帧直接写这些 Three 对象，替代逐帧 setState 重渲染
const faceMatRefs = useRef(new Map());
const pointScaleRefs = useRef(new Map());
const labelScaleRefs = useRef(new Map());
const lineMatRefs = useRef(new Map());
const planeMatRefs = useRef(new Map());
const auxMatRefs = useRef(new Map());
// 线 id → 线数据：useFrame 逐帧算高亮视觉时需要拿到原始线定义
const lineDataRef = useRef(new Map());
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
 const cameraAnimStart = useRef(0);
 const controlsRef = useRef(null);
 // 步骤切换不再夺镜头；仅重置/视角预设会飞镜

 const { camera } = useThree();
 const cameraRef = useRef(null);
 useEffect(() => {
 cameraRef.current = camera;
 }, [camera]);
 useFrame(() => {
 const engine = highlightEngine.current;
 engine.update();

 // 面透明度缓动：直接写材质，不再靠逐帧 setState 触发重渲染
 const faceMat = faceMatRefs.current.get('face');
 if (faceMat) {
 const diff = targetFaceOpacity.current - currentFaceOpacity.current;
 if (Math.abs(diff) > 0.002) {
 currentFaceOpacity.current += diff * 0.06;
 }
 else {
 currentFaceOpacity.current = targetFaceOpacity.current;
 }
 faceMat.opacity = currentFaceOpacity.current;
 }

 // 顶点脉冲：scale 随时间连续变化，必须逐帧写
 pointScaleRefs.current.forEach((group, id) => {
 const st = engine.getPointState(id);
 group.scale.setScalar(st.scale);
 });

 // 标签缩放：高亮 1.3，淡入淡出期间连续变化
 labelScaleRefs.current.forEach((mesh, id) => {
 const st = engine.getLabelState(id);
 mesh.scale.setScalar(st.scale);
 });

 // 高亮线：只在「正处于高亮或淡出动画」时接管，
 // 否则会覆盖 hover/选中/搜索在渲染期算出来的配色
 lineMatRefs.current.forEach((mat, id) => {
 const st = engine.getLineState(id);
 if (!st.highlighted && st.opacity == null)
 return;
 const line = lineDataRef.current.get(id);
 if (!line)
 return;
 const v = resolveLineVisual(line, st);
 mat.color.set(v.color);
 mat.opacity = v.opacity;
 mat.visible = v.opacity > 0.001;
 });

 // 截面平面
 planeMatRefs.current.forEach((mat, id) => {
 const st = engine.getPlaneState(id);
 mat.color.set(st.color);
 mat.opacity = st.opacity;
 });

 // 旧版辅助线淡入淡出
 auxAnimData.current.forEach((data, key) => {
 const mat = auxMatRefs.current.get(key);
 if (data.targetOpacity === 0 && data.opacity > 0.001) {
 data.opacity += (0 - data.opacity) * 0.08;
 if (data.opacity < 0.001) {
 auxAnimData.current.delete(key);
 if (mat)
 mat.opacity = 0;
 return;
 }
 }
 else if (data.targetOpacity > 0 && Math.abs(data.opacity - data.targetOpacity) > 0.005) {
 data.opacity += (data.targetOpacity - data.opacity) * 0.08;
 }
 else {
 data.opacity = data.targetOpacity;
 }
 if (mat)
 mat.opacity = data.opacity;
 });

 if (cameraAnimating.current && cameraRef.current) {
 const cam = cameraRef.current;
 const target = cameraTargetPos.current;
 const dx = target.x - cam.position.x;
 const dy = target.y - cam.position.y;
 const dz = target.z - cam.position.z;
 const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
 // 结束条件必须同时兜住 NaN：`NaN < 0.02` 恒为假，动画就永远停不下来，
 // 而动画期间每帧覆盖相机位置并 lookAt 原点 —— 表现就是"重置后相机卡死"。
 const reached = dist < 0.02;
 const invalid = !Number.isFinite(dist);
 const timedOut = performance.now() - cameraAnimStart.current > CAMERA_FLY_TIMEOUT_MS;
 if (reached || invalid || timedOut) {
 cameraAnimating.current = false;
 if (!invalid) cam.position.copy(target);
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
 }
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
 cameraAnimStart.current = performance.now();
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
 // 供 useFrame 逐帧查线定义（lineDataRef 只做缓存，不参与渲染）
 lineDataRef.current = new Map(resolvedLines.map(l => [l.id, l]));
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
 color = '#4D6BFE';
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
 return (<group key={key}>
 <line geometry={l._geo} visible={opacity > 0} raycast={() => { }}>
 <lineBasicMaterial ref={el => setMapRef(lineMatRefs, l.id, el)} color={color} transparent opacity={opacity} dashed={style.dash || l.dashed}/>
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
 {/* geoData 可能是 null —— SceneIR 没有顶点时不再兜底成正方体
     （见 createGeometryFromSceneIR）。没有图就不画，不拿替代形状顶上。 */}
 {showFaces && geoData && (<mesh renderOrder={1}>
 <primitive attach="geometry" object={geoData}/>
 <meshLambertMaterial ref={el => setMapRef(faceMatRefs, 'face', el)} color={'#d8dde6'} transparent opacity={currentFaceOpacity.current} depthWrite={false} side={THREE.DoubleSide}/>
 </mesh>)}
 {sceneIRPoints.map((point, i) => {
 const pointState = highlightEngine.current.getPointState(point.id);
 const labelState = highlightEngine.current.getLabelState(point.id);
 return (<group key={`ir-point-${i}`}>
 {point.visible !== false && point.position != null && (<group ref={el => setMapRef(pointScaleRefs, point.id, el)} scale={pointState.scale}>
 <PointMarker position={point.position} highlighted={pointState.highlighted} color={pointState.color} opacity={pointState.opacity}/>
 </group>)}
 {point.visible !== false && point.position != null && showLabels && (<Billboard key={`label-${i}`} position={labelPosition(point.position)} follow>
 <Text ref={el => setMapRef(labelScaleRefs, point.id, el)} fontSize={0.35} color={labelState.color || '#1a1a1a'} anchorX="center" anchorY="middle" outlineWidth={0.035} outlineColor={'#f4f6f8'} opacity={labelState.opacity} transparent depthTest={false} scale={labelState.scale}>
 {normalizeSubscripts(point.label)}
 </Text>
 </Billboard>)}
 </group>);
 })}
 {resolvedLines.map(l => {
          const key = lineKey(l);
          const hovered = hoveredLine === key;
          const selected = selectedEdge === key;
          const lineState = highlightEngine.current.getLineState(l.id);
          const isHL = lineState.highlighted || l.highlighted;
          const isAux = l.category === '辅助线' || l.category === '辅助构造线';
          const isStructural = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category);
          const style = getLineStyle(l.category);
          // 教材图：结构棱始终深墨色；高亮用强调色；勿在暗底用 #333
          const ink = '#1f2430';
          let color, opacity, dashed = l.dashed || style.dash;
          if (selected) {
            color = '#4D6BFE';
            opacity = 1;
          }
          else if (hovered) {
            color = '#2563eb';
            opacity = 1;
          }
          else if (isHL) {
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
 const isEdge = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) || l.custom;
          return (<group key={`ir-line-${l.id}`}>
            <line geometry={l._geo} visible={opacity > 0.001} renderOrder={3}>
              <lineBasicMaterial ref={el => setMapRef(lineMatRefs, l.id, el)} color={color} transparent opacity={opacity} dashed={dashed}/>
            </line>
            {isEdge && l.visible !== false && (<EdgeHitbox from={l.from} to={l.to} lineData={l} lineKey={key} visible selected={selected} hovered={hovered} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onSelect={handleSelect}/>)}
          </group>);
        })}
 {sceneIRSections.map((section, i) => {
 const planeState = highlightEngine.current.getPlaneState(section.label || `plane_${i}`);
 return (<SectionPolygon key={`section-${i}`} points={section.resolvedPoints} color={planeState.color} opacity={planeState.opacity} matRef={el => setMapRef(planeMatRefs, section.label || `plane_${i}`, el)}/>);
 })}
 <AnnotationRenderer annotations={sceneIR.annotations} points={sceneIR.points} lines={sceneIR.lines}/>
 </>)}

 {/* geoData 同样可能是 null：createGeometry 认不出类型时也返回 null（不再兜底） */}
 {!sceneIR && showFaces && geoData && (<mesh renderOrder={1}>
 <primitive attach="geometry" object={geoData}/>
 <meshLambertMaterial ref={el => setMapRef(faceMatRefs, 'face', el)} color={'#d8dde6'} transparent opacity={currentFaceOpacity.current} depthWrite={false} side={THREE.DoubleSide}/>
 </mesh>)}

 {!sceneIR && sphereOverlay && sphereGeo && (<mesh>
 <primitive attach="geometry" object={sphereGeo}/>
 <meshBasicMaterial color={sphereOverlay.color || '#4D6BFE'} transparent opacity={sphereOverlay.opacity ?? 0.15} depthWrite={false} wireframe={sphereOverlay.wireframe !== false}/>
 </mesh>)}

 {!sceneIR && resolvedAuxLines.map((al, i) => {
 const animData = auxAnimData.current.get(`aux-${al._origIndex}`);
 const lineOpacity = animData?.opacity ?? (effectiveAuxLines[al._origIndex] ? 0.7 : 0);
 return (<group key={`aux-${i}`}>
 <line geometry={new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(al.from[0], al.from[1], al.from[2]),
 new THREE.Vector3(al.to[0], al.to[1], al.to[2]),
 ])}>
 <lineBasicMaterial ref={el => setMapRef(auxMatRefs, `aux-${al._origIndex}`, el)} color={al.color || '#2563eb'} transparent opacity={lineOpacity} dashed={al.dashed !== false}/>
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
 enableRotate
 // 关掉平移：图形固定在原点、相机绕着它转。开着平移会把 target 拖走，
 // 图形跑出画面，而飞镜又强行 lookAt 原点，两边互相打架。
 enablePan={false}
 // 阻尼让拖动有收尾，不会一划就转过头；配合降速手感更可控
 enableDamping
 dampingFactor={0.08}
 rotateSpeed={0.7}
 zoomSpeed={0.8}
 minDistance={3}
 maxDistance={24}
 // 用户一上手就放弃飞镜：否则动画每帧把相机拽回目标点，手感像卡死
 onStart={() => { cameraAnimating.current = false; }}
/>
 </>);
});
export default Canvas3D;