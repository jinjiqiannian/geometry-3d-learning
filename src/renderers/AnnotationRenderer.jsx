// ═══════════════════════════════════════════════════════
//  AnnotationRenderer — SceneIR.annotations 可视化入口
//  各类型标注由独立组件渲染
// ═══════════════════════════════════════════════════════
import MidpointAnnotation from './MidpointAnnotation';
import ParallelAnnotation from './ParallelAnnotation';
import PerpendicularAnnotation from './PerpendicularAnnotation';
import IntersectionAnnotation from './IntersectionAnnotation';

export default function AnnotationRenderer({ annotations, points, lines }) {
  return (
    <>
      <MidpointAnnotation annotations={annotations} points={points} />
      <ParallelAnnotation annotations={annotations} points={points} lines={lines} />
      <PerpendicularAnnotation annotations={annotations} points={points} lines={lines} />
      <IntersectionAnnotation annotations={annotations} points={points} />
    </>
  );
}
