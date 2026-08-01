// ═══════════════════════════════════════════════════════
//  PerpendicularAnnotation — perpendicular 标注渲染（第一版：⊥ 符号提示）
//  坐标全部来自 sceneIR.points / sceneIR.lines，无几何重算
// ═══════════════════════════════════════════════════════
import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';

// 解析线段引用（"PC"/"AB"）→ { fromId, toId, p1, p2 }
function resolveLine(ref, posById, lines) {
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
  return { fromId, toId, p1, p2 };
}

export default function PerpendicularAnnotation({ annotations, points, lines }) {
  const markers = useMemo(() => {
    if (!Array.isArray(annotations) || annotations.length === 0) return [];
    const posById = new Map((points || []).map(p => [p.id, p.position]));
    const out = [];
    annotations
      .filter(a => a?.type === 'perpendicular')
      .forEach((a, i) => {
        if (a.line1 && a.line2) {
          const l1 = resolveLine(a.line1, posById, lines);
          const l2 = resolveLine(a.line2, posById, lines);
          if (!l1 || !l2) return;
          // 两线共点 → 垂足；否则退化为 line1 中点
          const shared = [l1.fromId, l1.toId].find(id => id === l2.fromId || id === l2.toId);
          const pos = shared
            ? posById.get(shared)
            : [(l1.p1[0] + l1.p2[0]) / 2, (l1.p1[1] + l1.p2[1]) / 2, (l1.p1[2] + l1.p2[2]) / 2];
          if (pos) out.push({ key: `anno-perp-${a.line1}-${a.line2}-${i}`, position: pos });
        } else if (a.line) {
          const l = resolveLine(a.line, posById, lines);
          if (!l) return;
          out.push({
            key: `anno-perp-${a.line}-${i}`,
            position: [(l.p1[0] + l.p2[0]) / 2, (l.p1[1] + l.p2[1]) / 2, (l.p1[2] + l.p2[2]) / 2],
          });
        }
      });
    return out;
  }, [annotations, points, lines]);

  if (markers.length === 0) return null;

  return markers.map(m => (
    <Billboard key={m.key} position={m.position} follow>
      <Text fontSize={0.3} color="#f59e0b" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#ffffff" depthTest={false}>
        ⊥
      </Text>
    </Billboard>
  ));
}
