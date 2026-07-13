import { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import { createGeometry, getVertexAndEdgeInfo } from '../../engines/geometryEngine';
import { getLineDefinitions, resolvePoint, getLineStyle } from '../../engines/lineDefinitions';
import { CAMERA_PRESETS } from '../../engines/visualIntent';
import { normalizeSubscripts } from '../../engines/labelMapper';
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
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
function useCurveData(type, s) {
 return useMemo(() => {
 const lines = [];
 if (type === 'sphere') {
 lines.push(ring(s, 'xy'));
 lines.push(ring(s, 'xz'));
 lines.push(ring(s, 'yz'));
 }
 else if (type === 'cylinder') {
 lines.push(ring(s, 'xz').map(p => [p[0], s, p[2]]));
 lines.push(ring(s, 'xz').map(p => [p[0], -s, p[2]]));
 lines.push([[s, -s, 0], [s, s, 0]]);
 lines.push([[-s, -s, 0], [-s, s, 0]]);
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
 }, [type, s]);
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
function SectionPolygon({ points, color = '#FF6B6B', opacity = 0.3 }) {
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
 return (<mesh geometry={geometry}>
 <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide}/>
 </mesh>);
}
function PointMarker({ position, highlighted = false, size = 0.15 }) {
 return (<mesh position={position}>
 <sphereGeometry args={[size, 16, 16]}/>
 <meshBasicMaterial color={highlighted ? '#FF6B6B' : '#1a1a1a'}/>
 </mesh>);
}
const Canvas3D = memo(function Canvas3D({
 geometry, showFaces = true, showLabels = true,
 visibleLines, hoveredLine, setHoveredLine,
 allLines, shownLengthLabels, searchedLine,
 selectedEdge, onEdgeClick, edgeColorOverrides,
 customVertices,
 sceneIR = null,
 highlightEdgeIds = [],
 highlightColor = '#FF6B6B',
 auxLines = [],
 faceOpacity = 0.42,
 nonHighlightOpacity = 0.25,
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
 const geoData = useMemo(() => createGeometry(type, params, customVertices), [type, size, customVertices]);
 const edgeInfo = useMemo(() => getVertexAndEdgeInfo(type, params, customVertices, vertexLabels), [type, size, customVertices, vertexLabels]);
 const { points: pts } = useMemo(() => getLineDefinitions(type, params, customVertices, vertexLabels), [type, size, customVertices, vertexLabels]);
 const curveLines = useCurveData(type, s);
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
 const hasHighlights = effectiveHighlightIds.length > 0;
 const sphereGeo = useMemo(() => {
 if (!sphereOverlay)
 return null;
 return new THREE.SphereGeometry(sphereOverlay.radius, 64, 32);
 }, [sphereOverlay?.radius]);
 const prevHighlights = useRef(new Set());
 const highlightStartTimes = useRef(new Map());
 const fadeOutHighlights = useRef(new Map());
 const [transitionTick, setTransitionTick] = useState(0);
 const animating = useRef(false);
 useEffect(() => {
 const newSet = new Set(effectiveHighlightIds);
 const oldSet = prevHighlights.current;
 const now = performance.now();
 let hasNew = false;
 newSet.forEach(id => {
 if (!oldSet.has(id)) {
 highlightStartTimes.current.set(id, now);
 hasNew = true;
 }
 });
 oldSet.forEach(id => {
 if (!newSet.has(id) && !fadeOutHighlights.current.has(id)) {
 fadeOutHighlights.current.set(id, {
 startTime: now,
 fromOpacity: 1.0,
 });
 hasNew = true;
 }
 });
 highlightStartTimes.current.forEach((_, id) => {
 if (!newSet.has(id))
 highlightStartTimes.current.delete(id);
 });
 prevHighlights.current = newSet;
 if (hasNew)
 animating.current = true;
 }, [effectiveHighlightIds]);
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
 useEffect(() => {
 if (cameraTarget && cameraTarget.length === 3) {
 cameraTargetPos.current.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
 cameraAnimating.current = true;
 animating.current = true;
 }
 }, [cameraTarget]);
 const frameSkip = useRef(0);
 const { camera } = useThree();
 const cameraRef = useRef(null);
 useEffect(() => {
 cameraRef.current = camera;
 }, [camera]);
 useFrame(() => {
 let anyActive = false;
 const now = performance.now();
 highlightStartTimes.current.forEach((startTime, id) => {
 if (now - startTime < 500)
 anyActive = true;
 });
 let fadeOutChanged = false;
 fadeOutHighlights.current.forEach((data, id) => {
 if (now - data.startTime < 350)
 anyActive = true;
 else {
 fadeOutHighlights.current.delete(id);
 fadeOutChanged = true;
 }
 });
 if (fadeOutChanged)
 anyActive = true;
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
 useEffect(() => {
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
 const isVisualHighlight = hasHighlights && highlightSet.has(l.id);
 let color, opacity;
 if (selected) {
 color = '#FF8C00';
 opacity = 1;
 }
 else if (hovered) {
 color = '#4A90E2';
 opacity = 1;
 }
 else if (searched) {
 color = '#2979ff';
 opacity = 1;
 }
 else if (isVisualHighlight) {
 color = highlightColor;
 const fader = fadeOutHighlights.current.get(l.id);
 if (fader) {
 const t = Math.min(1, (performance.now() - fader.startTime) / 300);
 opacity = fader.fromOpacity * (1 - easeOutCubic(t));
 }
 else {
 const startTime = highlightStartTimes.current.get(l.id);
 if (startTime) {
 const elapsed = performance.now() - startTime;
 const t = Math.min(1, elapsed / 400);
 opacity = 0.3 + 0.7 * easeOutCubic(t);
 }
 else {
 opacity = 1;
 }
 }
 }
 else if (hasHighlights && !isVisualHighlight) {
 const isStructural = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category);
 color = style.color;
 opacity = isStructural ? 0.08 : 0;
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
 color = style.color;
 opacity = style.opacity;
 }
 else {
 color = style.color;
 opacity = 0;
 }
 if (!hasHighlights && !selected && !hovered && !searched && effectiveNonHighlightOpacity < 1.0) {
 opacity *= effectiveNonHighlightOpacity;
 }
 const isEdge = ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) || l.custom;
 return (<group key={key}>
 <line geometry={l._geo} visible={opacity > 0} raycast={() => { }}>
 <lineBasicMaterial color={color} transparent opacity={opacity} dashed={style.dash || l.dashed}/>
 </line>
 {isEdge && (<EdgeHitbox from={l.from} to={l.to} lineData={l} lineKey={key} visible={visible} selected={selected} hovered={hovered} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onSelect={handleSelect}/>)}
 {showLen && visible && (<Billboard position={l.mid} follow>
 <Text fontSize={0.14} color={isDark ? '#e8f4fc' : '#4a4a4a'} anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor={isDark ? '#0d0d0d' : '#ffffff'}>
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
 const sceneIRSections = useMemo(() => {
 if (!sceneIR || !sceneIR.sections)
 return [];
 const pointMap = new Map(sceneIR.points.map(p => [p.id, p.position]));
 return sceneIR.sections.map(section => {
 const points = section.points.map(p => pointMap.get(p) || [0, 0, 0]);
 return { ...section, resolvedPoints: points };
 });
 }, [sceneIR]);
 return (<>
 <color attach="background" args={[isDark ? '#0d0d0d' : '#ffffff']}/>

 <perspectiveCamera makeDefault fov={50} position={[4, 4, 6]}/>

 {showFaces && (<mesh>
 <primitive attach="geometry" object={geoData}/>
 <meshBasicMaterial color={isDark ? '#4a4a4a' : '#d0d0d8'} transparent opacity={currentFaceOpacity.current} depthWrite={false} side={THREE.DoubleSide}/>
 </mesh>)}

 {sphereOverlay && sphereGeo && (<mesh>
 <primitive attach="geometry" object={sphereGeo}/>
 <meshBasicMaterial color={sphereOverlay.color || '#4A90E2'} transparent opacity={sphereOverlay.opacity ?? 0.15} depthWrite={false} wireframe={sphereOverlay.wireframe !== false}/>
 </mesh>)}

 {resolvedAuxLines.map((al, i) => {
 const animData = auxAnimData.current.get(`aux-${al._origIndex}`);
 const lineOpacity = animData?.opacity ?? (effectiveAuxLines[al._origIndex] ? 0.7 : 0);
 return (<group key={`aux-${i}`}>
 <line geometry={new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(al.from[0], al.from[1], al.from[2]),
 new THREE.Vector3(al.to[0], al.to[1], al.to[2]),
 ])}>
 <lineBasicMaterial color={al.color || '#4A90E2'} transparent opacity={lineOpacity} dashed={al.dashed !== false}/>
 </line>
 </group>);
 })}

 {!isCurved && resolvedLines.map(l => renderLine(l, lineKey(l)))}

 {isCurved && curveLines.map((pts, i) => (<line key={`curve-${i}`} points={pts} color={isDark ? '#888888' : '#aaaaaa'} lineWidth={1}/>))}

 {isCurved && resolvedLines.map(l => renderLine(l, lineKey(l)))}

 {sceneIRSections.map((section, i) => (<SectionPolygon key={`section-${i}`} points={section.resolvedPoints} color={section.type === 'polygon' ? '#4A90E2' : '#FF6B6B'} opacity={0.3}/>))}

 {sceneIRPoints.map((point, i) => (<group key={`ir-point-${i}`}>
 {point.visible !== false && (<PointMarker position={point.position} highlighted={point.highlighted}/>)}
 {point.visible !== false && showLabels && (<Billboard key={`label-${i}`} position={point.position} follow>
 <Text fontSize={0.28} color={isDark ? '#f5f5f5' : '#1d1d1f'} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={isDark ? '#0d0d0d' : '#ffffff'} opacity={labelOpacity} transparent>
 {normalizeSubscripts(point.label)}
 </Text>
 </Billboard>)}
 </group>))}

 {!sceneIR && edgeInfo.vertices.map((v, i) => {
 const rawLabel = edgeInfo.labels[i] || String.fromCharCode(65 + i);
 const displayLabel = normalizeSubscripts(rawLabel);
 return (<Billboard key={`v-${i}`} position={v} follow>
 <Text fontSize={0.28} color={isDark ? '#f5f5f5' : '#1d1d1f'} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={isDark ? '#0d0d0d' : '#ffffff'} opacity={labelOpacity} transparent>
 {displayLabel}
 </Text>
 </Billboard>);
 })}

 <OrbitControls enableZoom enablePan enableRotate/>
 </>);
});
export default Canvas3D;