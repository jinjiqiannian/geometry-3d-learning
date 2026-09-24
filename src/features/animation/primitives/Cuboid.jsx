import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  CUBOID_EDGES,
  CUBOID_UNIT_VERTICES,
  CUBOID_VERTEX_NAMES,
  readCuboidParams,
  resolveCuboidAnchor,
} from './cuboidGeometry';

const FILL_COLOR = '#d8dde6';
const EDGE_COLOR = '#1f2430';
const VERTEX_COLOR = '#4D6BFE';

function toVector3(unit) {
  return new THREE.Vector3(unit[0], unit[1], unit[2]);
}

/**
 * 长方体原语 —— 人手写的可信几何代码（AI 永远碰不到它，只出 IR）。
 *
 * 渲染单位立方体，实际尺寸由 group.scale 逐帧命令式驱动：
 * 几何随帧变化**不进 React state**，否则播放时又回到每帧重渲染。
 *
 * params 变化走声明式（实时模式拖参数）；时间轴模式由渲染器每帧调用
 * 命令式句柄 applyParams，两者改的是同一份 scale，不会互相打架。
 */
const Cuboid = forwardRef(function Cuboid({ params, showFaces = true, showVertices = true }, ref) {
  const groupRef = useRef(null);
  const dimsRef = useRef(readCuboidParams(params));

  const initialScale = useRef(null);
  if (initialScale.current === null) {
    const d = dimsRef.current;
    initialScale.current = [d.a, d.c, d.b];
  }

  const edgeGeometry = useMemo(() => {
    const points = [];
    for (const [from, to] of CUBOID_EDGES) {
      points.push(toVector3(CUBOID_UNIT_VERTICES[from]));
      points.push(toVector3(CUBOID_UNIT_VERTICES[to]));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const vertexGeometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(CUBOID_VERTEX_NAMES.map((n) => toVector3(CUBOID_UNIT_VERTICES[n]))),
    [],
  );

  const applyParams = useCallback((next) => {
    const d = readCuboidParams(next);
    dimsRef.current = d;
    const group = groupRef.current;
    if (group) group.scale.set(d.a, d.c, d.b);
  }, []);

  useLayoutEffect(() => {
    applyParams(params);
  }, [params, applyParams]);

  useImperativeHandle(ref, () => ({
    applyParams,
    resolveAnchor: (anchor) => resolveCuboidAnchor(anchor, dimsRef.current),
  }), [applyParams]);

  return (
    <group ref={groupRef} scale={initialScale.current}>
      {showFaces && (
        <mesh renderOrder={1}>
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={FILL_COLOR} transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <lineSegments geometry={edgeGeometry} renderOrder={3}>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.9} />
      </lineSegments>
      {showVertices && (
        <points geometry={vertexGeometry} renderOrder={4}>
          <pointsMaterial color={VERTEX_COLOR} size={7} sizeAttenuation={false} />
        </points>
      )}
    </group>
  );
});

export default Cuboid;
