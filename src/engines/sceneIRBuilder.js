import { validateAndCompleteSemantic } from './geometryValidator';
const PROGRESSION_CONFIG = {
 conceptual: {
 faceOpacity: 0.38,
 nonHighlightOpacity: 0.12,
 showLabels: true,
 allowHighlights: true,
 allowAuxLines: false,
 },
 construction: {
 faceOpacity: 0.28,
 nonHighlightOpacity: 0.08,
 showLabels: true,
 allowHighlights: false,
 allowAuxLines: true,
 },
 calculation: {
 faceOpacity: 0.22,
 nonHighlightOpacity: 0.05,
 showLabels: true,
 allowHighlights: true,
 allowAuxLines: false,
 },
 validation: {
 faceOpacity: 0.40,
 nonHighlightOpacity: 1.0,
 showLabels: true,
 allowHighlights: true,
 allowAuxLines: false,
 },
};
const STEP_ZERO_CONFIG = {
 faceOpacity: 0.35,
 nonHighlightOpacity: 0.06,
 showLabels: false,
 allowHighlights: false,
 allowAuxLines: false,
};
function edgeId(a, b) {
 return a < b ? a + b : b + a;
}
// semantic.relations 字符串 → sceneIR.annotations 结构化对象
// 支持: "E midpoint AD" / "F on PA" / "PC parallel plane BEF"
function convertRelationsToAnnotations(relations) {
  if (!Array.isArray(relations)) return [];
  const annotations = [];
  relations.forEach(rel => {
    if (typeof rel !== 'string') return;
    let m = rel.match(/^([A-Z][0-9]*) midpoint ([A-Z][0-9]*?)([A-Z][0-9]*)$/);
    if (m) {
      annotations.push({ type: 'midpoint', point: m[1], segment: [m[2], m[3]] });
      return;
    }
    m = rel.match(/^([A-Z][0-9]*) on ([A-Z][0-9]*?)([A-Z][0-9]*)$/);
    if (m) {
      annotations.push({ type: 'on', point: m[1], segment: [m[2], m[3]] });
      return;
    }
    m = rel.match(/^([A-Z][0-9]*[A-Z][0-9]*) parallel plane ([A-Z][0-9]*[A-Z][0-9]*[A-Z][0-9]*)$/);
    if (m) {
      annotations.push({ type: 'parallel', target: m[1], plane: m[2] });
      return;
    }
    // 线线平行："AB parallel CD"
    m = rel.match(/^([A-Z][0-9]*'?[A-Z][0-9]*'?) parallel ([A-Z][0-9]*'?[A-Z][0-9]*'?)$/);
    if (m) {
      annotations.push({ type: 'parallel', line1: m[1], line2: m[2] });
      return;
    }
    // 线面垂直："PC perpendicular plane ABC"
    m = rel.match(/^([A-Z][0-9]*'?[A-Z][0-9]*'?) perpendicular plane ([A-Z][0-9]*'?[A-Z][0-9]*'?[A-Z][0-9]*'?)$/);
    if (m) {
      annotations.push({ type: 'perpendicular', line: m[1], plane: m[2] });
      return;
    }
    // 线线垂直："AB perpendicular CD"
    m = rel.match(/^([A-Z][0-9]*'?[A-Z][0-9]*'?) perpendicular ([A-Z][0-9]*'?[A-Z][0-9]*'?)$/);
    if (m) {
      annotations.push({ type: 'perpendicular', line1: m[1], line2: m[2] });
      return;
    }
    // 线面交点："G intersection PC BEF"
    m = rel.match(/^([A-Z][0-9]*'?) intersection ([A-Z][0-9]*'?[A-Z][0-9]*'?) ([A-Z][0-9]*'?[A-Z][0-9]*'?[A-Z][0-9]*'?)$/);
    if (m) {
      annotations.push({ type: 'intersection', point: m[1], line: m[2], plane: m[3] });
      return;
    }
    // 线线交点："G intersection AC BD"
    m = rel.match(/^([A-Z][0-9]*'?) intersection ([A-Z][0-9]*'?[A-Z][0-9]*'?) ([A-Z][0-9]*'?[A-Z][0-9]*'?)$/);
    if (m) {
      annotations.push({ type: 'intersection', point: m[1], line1: m[2], line2: m[3] });
      return;
    }
    annotations.push({ type: 'raw', text: rel });
  });
  return annotations;
}
export function buildBaseSceneIR(type, params, roleMap, pointPositions, edges) {
  const points = [];
  if (pointPositions) {
    Object.keys(pointPositions).forEach(label => {
      points.push({
        id: label,
        label: label,
        position: pointPositions[label],
        visible: true,
      });
    });
  }
  
  const lines = [];
  if (edges) {
    const edgeSet = new Set();
    edges.forEach(edge => {
      const key = edgeId(edge.from, edge.to);
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        lines.push({
          id: edge.label || key,
          from: edge.from,
          to: edge.to,
          category: edge.category || '棱',
          dashed: edge.dashed || false,
          visible: true,
          highlighted: false,
        });
      }
    });
  }
  
  return {
    points,
    lines,
    faces: undefined,
    labelVisibility: {},
  };
}
export function buildSceneIRFromSemantic(semantic) {
  const labelToPosition = semantic.pointPositions || {};

  const points = semantic.points.map(point => ({
    id: point,
    label: point,
    // 明确为 null（无法推导坐标）时保留 null，不再回退 [0,0,0] 污染原点；
    // 仅 undefined（未计算）走原兜底
    position: labelToPosition[point] === null ? null : (labelToPosition[point] || [0, 0, 0]),
    visible: labelToPosition[point] !== null,
  }));
  
  const edgeSet = new Set();
  const lines = [];
  semantic.edges.forEach(edge => {
    const key = edgeId(edge.from, edge.to);
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      const normalizedLabel = edge.label && edge.label.length === 2 
        ? (edge.label[0] < edge.label[1] ? edge.label : edge.label[1] + edge.label[0])
        : edge.label;
      lines.push({
        id: edge.label || key,
        from: edge.from,
        to: edge.to,
        category: edge.category || '棱',
        dashed: edge.dashed || false,
        visible: true,
        highlighted: semantic.importantLines.includes(normalizedLabel || key),
      });
    }
  });
  
  const sections = [];
  semantic.planes.forEach((plane, i) => {
    sections.push({
      id: 'plane_' + i,
      type: 'polygon',
      points: plane.points,
      visible: semantic.importantPlanes.includes(plane.label),
      label: plane.label,
    });
  });
  
  const highlightEdges = semantic.importantLines || [];
  const highlightPlanes = semantic.importantPlanes || [];
  const highlightPoints = semantic.highlightPoints || [];
  const highlightLabels = semantic.highlightLabels || [];

  return {
    type: semantic.shape,
    size: semantic.size,
    points,
    lines,
    faces: [],
    sections,
    annotations: convertRelationsToAnnotations(semantic.relations),
    labels: points.map(p => p.label),
    labelVisibility: {},
    highlightEdges,
    highlightPlanes,
    highlightPoints,
    highlightLabels,
    highlightTags: semantic.highlight || [],
  };
}
export function applyStepToSceneIR(stepIndex, stepType, sceneOps, baseIR) {
 if (!baseIR) {
 return { points: [], lines: [] };
 }
 const ir = JSON.parse(JSON.stringify(baseIR));
 if (stepIndex === 0 && !sceneOps) {
 const cfg = STEP_ZERO_CONFIG;
 ir.points.forEach(p => { p.visible = false; });
 ir.lines.forEach(l => {
 l.visible = true;
 l.highlighted = false;
 });
 if (ir.faces) {
 ir.faces.forEach(f => { f.opacity = cfg.faceOpacity; });
 }
 ir.labelVisibility = {};
 return ir;
 }
 const cfg = PROGRESSION_CONFIG[stepType] || PROGRESSION_CONFIG.conceptual;
 if (ir.faces) {
 ir.faces.forEach(f => { f.opacity = cfg.faceOpacity; });
 }
 ir.points.forEach(p => {
 p.visible = cfg.showLabels;
 });
 if (ir.labelVisibility) {
 ir.labelVisibility = {};
 if (cfg.showLabels) {
 ir.points.forEach(p => {
 ir.labelVisibility[p.id] = true;
 });
 }
 }
 ir.lines.forEach(l => {
 l.highlighted = false;
 l.visible = true;
 });
 if (sceneOps) {
 if (sceneOps.highlightLines && cfg.allowHighlights) {
 const hlSet = new Set(sceneOps.highlightLines.map(id => id.toUpperCase()));
 ir.lines.forEach(l => {
 if (hlSet.has(l.id.toUpperCase())) {
 l.highlighted = true;
 }
 });
 }
 if (sceneOps.addAuxLines && cfg.allowAuxLines) {
 for (const aux of sceneOps.addAuxLines) {
 const auxId = edgeId(aux.from.pointId, aux.to.pointId);
 if (!ir.lines.some(l => l.id === auxId)) {
 ir.lines.push({
 id: auxId,
 from: aux.from.pointId,
 to: aux.to.pointId,
 category: '辅助线',
 dashed: aux.dashed !== false,
 color: aux.color || '#8b5cf6',
 visible: true,
 highlighted: false,
 });
 }
 }
 }
 if (sceneOps.addAuxPoints) {
 for (const ap of sceneOps.addAuxPoints) {
 if (!ir.points.some(p => p.id === ap.id)) {
 let position = [0, 0, 0];
 if (ap.position === 'midpoint' && ap.refs.length >= 2) {
 const p1 = ir.points.find(p => p.id === ap.refs[0]);
 const p2 = ir.points.find(p => p.id === ap.refs[1]);
 if (p1 && p2) {
 position = [
 (p1.position[0] + p2.position[0]) / 2,
 (p1.position[1] + p2.position[1]) / 2,
 (p1.position[2] + p2.position[2]) / 2,
 ];
 }
 }
 ir.points.push({
 id: ap.id,
 label: ap.label,
 position,
 visible: true,
 });
 }
 }
 }
 if (sceneOps.fadeLines) {
 const fadeSet = new Set(sceneOps.fadeLines.map(id => id.toUpperCase()));
 ir.lines.forEach(l => {
 if (fadeSet.has(l.id.toUpperCase())) {
 l.highlighted = false;
 l.visible = true;
 }
 });
 }
 if (sceneOps.showLabels && sceneOps.showLabels.length > 0) {
 const labelSet = new Set(sceneOps.showLabels);
 // 只保证列出的标签可见，不隐藏其余点（避免结论步字母消失）
 ir.points.forEach(p => {
 if (labelSet.has(p.id) || labelSet.has(p.label)) {
 p.visible = true;
 if (ir.labelVisibility) ir.labelVisibility[p.id] = true;
 }
 });
 }
 if (sceneOps.planeHighlight) {
 if (!ir.sections)
 ir.sections = [];
 ir.sections.push({
 id: 'section_' + ir.sections.length,
 type: 'polygon',
 points: sceneOps.planeHighlight.vertices,
 visible: true,
 });
 }
 if (sceneOps.sectionCut) {
 if (!ir.sections)
 ir.sections = [];
 ir.sections.push({
 id: 'cut_' + ir.sections.length,
 type: 'plane',
 points: sceneOps.sectionCut.plane,
 visible: sceneOps.sectionCut.showSection !== false,
 });
 }
 }
 return ir;
}
export function buildSceneIRSequence(type, params, userLabels, steps) {
 if (!steps || steps.length === 0)
 return [];
 const semantic = {
 shape: type,
 size: params?.size || 2,
 points: userLabels || [],
 edges: [],
 faces: [],
 planes: [],
 relations: [],
 importantLines: [],
 importantPlanes: [],
 highlight: [],
 animationSteps: [],
 };
 const validated = validateAndCompleteSemantic(semantic);
 if (!validated.roleMap || !validated.pointPositions) {
 console.warn('[SceneIRBuilder] Invalid semantic data passed to buildSceneIRSequence');
 }
 const baseIR = buildBaseSceneIR(type, params, validated.roleMap, validated.pointPositions, validated.edges);
 const sequence = [];
 for (let i = 0; i < steps.length; i++) {
 const step = steps[i];
 const prevIR = i === 0 ? baseIR : sequence[i - 1];
 const ir = applyStepToSceneIR(i, step.type, step.sceneOps, prevIR);
 sequence.push(ir);
 }
 return sequence;
}
export function buildSceneIRSequenceFromSemantic(semantic, steps = []) {
  const baseIR = buildSceneIRFromSemantic(semantic);
  
  if (steps.length === 0 && (!semantic.animationSteps || semantic.animationSteps.length === 0)) {
    return [baseIR];
  }
  
  const sequence = [baseIR];
  let currentIR = JSON.parse(JSON.stringify(baseIR));
  
  if (steps.length > 0) {
    steps.forEach((step, index) => {
      const nextIR = JSON.parse(JSON.stringify(currentIR));
      applySceneStateToIR(nextIR, step.sceneState, semantic);
      sequence.push(nextIR);
      currentIR = nextIR;
    });
  } else {
    semantic.animationSteps.forEach((animStep, index) => {
      const nextIR = JSON.parse(JSON.stringify(currentIR));
      if (animStep.addElements) {
        if (animStep.addElements.points) {
          animStep.addElements.points.forEach(pointId => {
            const point = nextIR.points.find(p => p.id === pointId);
            if (point)
              point.visible = true;
          });
        }
        if (animStep.addElements.edges) {
          animStep.addElements.edges.forEach(edgeLabel => {
            const edge = nextIR.lines.find(l => l.id === edgeLabel);
            if (edge)
              edge.visible = true;
          });
        }
        if (animStep.addElements.highlightEdges) {
          animStep.addElements.highlightEdges.forEach(edgeLabel => {
            const edge = nextIR.lines.find(l => l.id === edgeLabel);
            if (edge)
              edge.highlighted = true;
          });
        }
        if (animStep.addElements.planes) {
          if (!nextIR.sections)
            nextIR.sections = [];
          animStep.addElements.planes.forEach(planeLabel => {
            if (!nextIR.sections.some(s => s.label === planeLabel)) {
              const plane = semantic.planes.find(p => p.label === planeLabel);
              if (plane) {
                nextIR.sections.push({
                  id: 'plane_' + nextIR.sections.length,
                  type: 'polygon',
                  points: plane.points,
                  visible: true,
                  label: planeLabel,
                });
              }
            }
          });
        }
        if (animStep.addElements.highlightPoints) {
          animStep.addElements.highlightPoints.forEach(pointId => {
            const point = nextIR.points.find(p => p.id === pointId);
            if (point)
              point.highlighted = true;
          });
        }
      }
      sequence.push(nextIR);
      currentIR = nextIR;
    });
  }
  
  return sequence;
}

function applySceneStateToIR(ir, sceneState, semantic) {
  if (!sceneState) return;
  
  // showLabels：只加可见，不隐藏已有字母（AI 常给残缺列表导致结论步丢标）
  if (Array.isArray(sceneState.showLabels) && sceneState.showLabels.length > 0) {
    const want = new Set(sceneState.showLabels);
    ir.points.forEach(point => {
      if (want.has(point.label) || want.has(point.id)) {
        point.visible = true;
      }
    });
  }
  
  if (sceneState.highlightEdges) {
    ir.lines.forEach(line => {
      const normalizedLineId = line.id.length === 2 
        ? (line.id[0] < line.id[1] ? line.id : line.id[1] + line.id[0])
        : line.id;
      line.highlighted = sceneState.highlightEdges.some(edge => {
        if (typeof edge === 'string') {
          const normalizedEdge = edge.length === 2 
            ? (edge[0] < edge[1] ? edge : edge[1] + edge[0])
            : edge;
          return normalizedLineId === normalizedEdge;
        }
        return line.from === edge.from && line.to === edge.to ||
               line.from === edge.to && line.to === edge.from;
      });
    });
  }
  
  if (sceneState.showAuxiliaryLines) {
    if (!ir.sections) ir.sections = [];
    sceneState.showAuxiliaryLines.forEach(auxLine => {
      if (!ir.sections.some(s => s.points && 
        s.points.length === 2 && 
        ((s.points[0] === auxLine.from && s.points[1] === auxLine.to) ||
         (s.points[0] === auxLine.to && s.points[1] === auxLine.from)))) {
        ir.sections.push({
          id: 'aux_' + ir.sections.length,
          type: 'polygon',
          points: [auxLine.from, auxLine.to],
          visible: true,
          label: 'aux_' + ir.sections.length,
        });
      }
    });
  }
  
  if (sceneState.highlightPlanes) {
    if (ir.sections) {
      ir.sections.forEach(section => {
        section.visible = sceneState.highlightPlanes.includes(section.label);
      });
    }
  }
  
  if (sceneState.camera) {
    ir.camera = {
      position: sceneState.camera.position || [4, 4, 6],
      target: sceneState.camera.target || [0, 0, 0],
      zoom: sceneState.camera.zoom || 1,
    };
  }
}