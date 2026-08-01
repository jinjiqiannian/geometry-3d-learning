// ═══════════════════════════════════════════════════════
//  ParallelAnnotation — parallel 标注渲染（第一版：∥ 符号提示）
//  坐标全部来自 sceneIR.points / sceneIR.lines，无几何重算
// ═══════════════════════════════════════════════════════
import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';

// 解析线段引用（"PC"/"AB"）→ 中点坐标
function resolveLineMidpoint(ref, posById, lines) {
  if (!ref) return null;
  const found = (lines || []).find(
    l => l.id === ref || `${l.from}${l.to}` === ref || `${l.to}${l.from}` === ref
  );
  let fromId, toId;
  if (found) {
    fromId = found.from;
    toId = found.to;
  } else {
    const m = ref.match(/^([A-Z][0-9]*'?)([A-Z][0-9]*'?)$/);
    if (!m) return null;
    fromId = m[1];
    toId = m[2];
  }
  const p1 = posById.get(fromId);
  const p2 = posById.get(toId);
  if (!p1 || !p2) return null;
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
}

export default function ParallelAnnotation({ annotations, points, lines }) {
  const markers = useMemo(() => {
    if (!Array.isArray(annotations) || annotations.length === 0) return [];
    const posById = new Map((points || []).map(p => [p.id, p.position]));
    const out = [];
    annotations
      .filter(a => a?.type === 'parallel')
      .forEach((a, i) => {
        const refs = a.target ? [a.target] : [a.line1, a.line2].filter(Boolean);
        refs.forEach(ref => {
          const mid = resolveLineMidpoint(ref, posById, lines);
          if (mid) out.push({ key: `anno-parallel-${ref}-${i}`, position: mid });
        });
      });
    return out;
  }, [annotations, points, lines]);

  if (markers.length === 0) return null;

  return markers.map(m => (
    <Billboard key={m.key} position={m.position} follow>
      <Text fontSize={0.3} color="#f59e0b" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#ffffff" depthTest={false}>
        ∥
      </Text>
    </Billboard>
  ));
}
