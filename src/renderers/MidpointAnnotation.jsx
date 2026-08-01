// ═══════════════════════════════════════════════════════
//  MidpointAnnotation — midpoint 标注渲染
//  坐标全部来自 sceneIR.points，无几何重算
// ═══════════════════════════════════════════════════════
import { useMemo } from 'react';

export default function MidpointAnnotation({ annotations, points }) {
  const markers = useMemo(() => {
    if (!Array.isArray(annotations) || annotations.length === 0) return [];
    const posById = new Map((points || []).map(p => [p.id, p.position]));
    return annotations
      .filter(a => a?.type === 'midpoint')
      .map((a, i) => {
        let pos = posById.get(a.point);
        // point 不在 sceneIR.points 时退化为 segment 两端均值（坐标仍全部来自 sceneIR.points）
        if (!pos && Array.isArray(a.segment) && a.segment.length === 2) {
          const p1 = posById.get(a.segment[0]);
          const p2 = posById.get(a.segment[1]);
          if (p1 && p2) {
            pos = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
          }
        }
        return pos ? { key: `anno-midpoint-${a.point}-${i}`, position: pos } : null;
      })
      .filter(Boolean);
  }, [annotations, points]);

  if (markers.length === 0) return null;

  return markers.map(m => (
    <mesh key={m.key} position={m.position}>
      <octahedronGeometry args={[0.09, 0]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.95} depthTest={false} />
    </mesh>
  ));
}
