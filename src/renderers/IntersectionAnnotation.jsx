// ═══════════════════════════════════════════════════════
//  IntersectionAnnotation — intersection 标注渲染（× 符号）
//  坐标仅取 sceneIR.points 中 point 对应位置，无任何几何计算
// ═══════════════════════════════════════════════════════
import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';

export default function IntersectionAnnotation({ annotations, points }) {
  const markers = useMemo(() => {
    if (!Array.isArray(annotations) || annotations.length === 0) return [];
    const posById = new Map((points || []).map(p => [p.id, p.position]));
    return annotations
      .filter(a => a?.type === 'intersection')
      .map((a, i) => {
        const pos = posById.get(a.point);
        // position 明确为 null → 不渲染；真实原点 [0,0,0] 不过滤
        if (pos == null) return null;
        return { key: `anno-intersection-${a.point}-${i}`, position: pos };
      })
      .filter(Boolean);
  }, [annotations, points]);

  if (markers.length === 0) return null;

  return markers.map(m => (
    <Billboard key={m.key} position={m.position} follow>
      <Text fontSize={0.3} color="#22c55e" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#ffffff" depthTest={false}>
        ×
      </Text>
    </Billboard>
  ));
}
