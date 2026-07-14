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
  const validated = validateAndCompleteSemantic(semantic);
  const labelToPosition = validated.pointPositions || {};
  
  const points = validated.points.map(point => ({
    id: point,
    label: point,
    position: labelToPosition[point] || [0, 0, 0],
    visible: true,
  }));
  
  const edgeSet = new Set();
  const lines = [];
  validated.edges.forEach(edge => {
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
        highlighted: validated.importantLines.includes(edge.label || key),
      });
    }
  });
  
  const sections = [];
  validated.planes.forEach((plane, i) => {
    sections.push({
      id: 'plane_' + i,
      type: 'polygon',
      points: plane.points,
      visible: validated.importantPlanes.includes(plane.label),
      label: plane.label,
    });
  });
  
  const highlightEdges = validated.importantLines || [];
  const highlightPlanes = validated.importantPlanes || [];
  
  return {
    points,
    lines,
    faces: undefined,
    sections,
    labelVisibility: {},
    highlightEdges,
    highlightPlanes,
    highlightTags: validated.highlight || [],
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
 if (sceneOps.showLabels) {
 const labelSet = new Set(sceneOps.showLabels);
 ir.points.forEach(p => {
 p.visible = labelSet.has(p.id);
 });
 if (ir.labelVisibility) {
 ir.points.forEach(p => {
 ir.labelVisibility[p.id] = labelSet.has(p.id);
 });
 }
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
export function buildSceneIRSequenceFromSemantic(semantic) {
 const baseIR = buildSceneIRFromSemantic(semantic);
 if (!semantic.animationSteps || semantic.animationSteps.length === 0) {
 return [baseIR];
 }
 const sequence = [baseIR];
 let currentIR = JSON.parse(JSON.stringify(baseIR));
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
 return sequence;
}