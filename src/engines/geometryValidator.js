import { VERTEX_TEMPLATES, getScaledTemplate, buildRoleMap, ROLE_DEFINITIONS } from './sceneIRTemplate';
const SHAPE_EDGE_TEMPLATES = {
 cube: {
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH'],
 requiredPoints: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
 },
 cuboid: {
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH'],
 requiredPoints: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
 },
 pyramid: {
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'PA', 'PB', 'PC', 'PD'],
 requiredPoints: ['A', 'B', 'C', 'D', 'P'],
 },
 prism: {
 requiredEdges: ['AB', 'BC', 'CA', "A'B'", "B'C'", "C'A'", "AA'", "BB'", "CC'"],
 requiredPoints: ['A', 'B', 'C', "A'", "B'", "C'"],
 },
 tetrahedron: {
 requiredEdges: ['AB', 'AC', 'AD', 'BC', 'BD', 'CD'],
 requiredPoints: ['A', 'B', 'C', 'D'],
 },
 octahedron: {
 requiredEdges: ['TR', 'TF', 'TL', 'TB', 'DR', 'DF', 'DL', 'DB', 'RF', 'FL', 'LB', 'BR'],
 requiredPoints: ['T', 'R', 'F', 'L', 'B', 'D'],
 },
 squareFrustum: {
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH'],
 requiredPoints: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
 },
 sphere: {
 requiredEdges: [],
 requiredPoints: ['N', 'S', 'E', 'W', 'F', 'B'],
 },
 cylinder: {
 requiredEdges: ["OO'"],
 requiredPoints: ['O', "O'", 'A', 'B', 'C', 'D'],
 },
 cone: {
 requiredEdges: ['OP'],
 requiredPoints: ['O', 'P', 'A', 'B', 'C', 'D'],
 },
 circularFrustum: {
 requiredEdges: ["OO'"],
 requiredPoints: ['O', "O'", 'A', 'B', 'C', 'D'],
 },
};
export function validateAndCompleteSemantic(semantic) {
 const result = { ...semantic };
 result.points = result.points || [];
 result.edges = result.edges || [];
 result.faces = result.faces || [];
 result.planes = result.planes || [];
 result.relations = result.relations || [];
 result.importantLines = result.importantLines || [];
 result.importantPlanes = result.importantPlanes || [];
 result.highlight = result.highlight || [];
 result.animationSteps = result.animationSteps || [];
 const basePoints = getBasePoints(result.shape);
 const pointSet = new Set(result.points);
 basePoints.forEach(p => pointSet.add(p));
 result.points = Array.from(pointSet);
 const edgeSet = new Set(result.edges.map(e => edgeKey(e)));
 const requiredEdges = SHAPE_EDGE_TEMPLATES[result.shape]?.requiredEdges || [];
 requiredEdges.forEach(edgeStr => {
 const [a, b] = parseEdgeString(edgeStr);
 if (pointSet.has(a) && pointSet.has(b)) {
 edgeSet.add(edgeKey({ from: a, to: b }));
 }
 });
 result.edges = Array.from(edgeSet).map(key => {
 const [a, b] = key.split(',');
 return { from: a, to: b, label: a + b };
 });
 completeRelations(result);
  completeImportantElements(result);
  
  result.roleMap = buildRoleMap(result.shape, result.points, basePoints, result.edges);
  
  computePointPositions(result);
  generateAnimationSteps(result);
  
  console.log('[validateAndCompleteSemantic] roleMap:', JSON.stringify(result.roleMap));
  
  return result;
}
function getBasePoints(shape) {
 return SHAPE_EDGE_TEMPLATES[shape]?.requiredPoints || [];
}
function edgeKey(edge) {
 const [a, b] = [edge.from, edge.to].sort();
 return `${a},${b}`;
}
function parseEdgeString(str) {
 const primeMatch = str.match(/^([A-Z])([A-Z])$/);
 if (primeMatch)
 return primeMatch.slice(1);
 const primePattern = str.match(/^([A-Z])'?([A-Z])'?$/);
 if (primePattern) {
 const [, a, b] = primePattern;
 return [a, b];
 }
 if (str.length === 2) {
 return [str[0], str[1]];
 }
 return [str[0], str[1]];
}
function completeRelations(semantic) {
 const relations = semantic.relations;
 const pointSet = new Set(semantic.points);
 const midpointPattern = /^([A-Z]) midpoint ([A-Z])([A-Z])$/;
 relations.forEach(rel => {
 const match = rel.match(midpointPattern);
 if (match) {
 const [, mid, a, b] = match;
 if (!pointSet.has(mid)) {
 semantic.points.push(mid);
 pointSet.add(mid);
 }
 }
 });
}
function completeImportantElements(semantic) {
 const edgeLabels = new Set(semantic.edges.map(e => e.label));
 const importantLines = semantic.importantLines || [];
 const importantPlanes = semantic.importantPlanes || [];
 importantLines.forEach(lineLabel => {
 if (!edgeLabels.has(lineLabel)) {
 const [a, b] = parseEdgeString(lineLabel);
 if (semantic.points.includes(a) && semantic.points.includes(b)) {
 semantic.edges.push({ from: a, to: b, label: lineLabel });
 }
 }
 });
 const planeLabels = new Set(semantic.planes.map(p => p.label));
 importantPlanes.forEach(planeLabel => {
 if (!planeLabels.has(planeLabel)) {
 const points = planeLabel.split('');
 if (points.length >= 3) {
 semantic.planes.push({
 label: planeLabel,
 points: points,
 });
 }
 }
 });
}
function computePointPositions(semantic) {
  const tpl = getScaledTemplate(semantic.shape, { size: semantic.size || 2 });
  const roleDef = ROLE_DEFINITIONS[semantic.shape];
  const roleMap = semantic.roleMap || {};
  
  const labelToPosition = {};
  
  if (roleDef && roleMap) {
    for (const [role, indices] of Object.entries(roleDef)) {
      const labels = roleMap[role];
      if (!labels) continue;
      
      if (Array.isArray(indices)) {
        indices.forEach((idx, i) => {
          if (tpl.vertices[idx] && labels[i]) {
            labelToPosition[labels[i]] = [...tpl.vertices[idx]];
          }
        });
      } else {
        if (tpl.vertices[indices] && labels) {
          labelToPosition[labels] = [...tpl.vertices[indices]];
        }
      }
    }
  }
  
  semantic.points.forEach(point => {
    if (!labelToPosition[point]) {
      labelToPosition[point] = findDerivedPosition(point, semantic, labelToPosition);
    }
  });
  semantic.pointPositions = labelToPosition;
  return labelToPosition;
}
function findDerivedPosition(point, semantic, knownPositions) {
 const midpointPattern = /^([A-Z]) midpoint ([A-Z])([A-Z])$/;
 for (const rel of semantic.relations) {
 const match = rel.match(midpointPattern);
 if (match) {
 const [, mid, a, b] = match;
 if (mid === point && knownPositions[a] && knownPositions[b]) {
 return [
 (knownPositions[a][0] + knownPositions[b][0]) / 2,
 (knownPositions[a][1] + knownPositions[b][1]) / 2,
 (knownPositions[a][2] + knownPositions[b][2]) / 2,
 ];
 }
 }
 }
 const onLinePattern = /^([A-Z]) on ([A-Z])([A-Z])$/;
 for (const rel of semantic.relations) {
 const match = rel.match(onLinePattern);
 if (match) {
 const [, p, a, b] = match;
 if (p === point && knownPositions[a] && knownPositions[b]) {
 return [
 (knownPositions[a][0] + knownPositions[b][0]) / 2,
 (knownPositions[a][1] + knownPositions[b][1]) / 2,
 (knownPositions[a][2] + knownPositions[b][2]) / 2,
 ];
 }
 }
 }
 return [0, 0, 0];
}
function generateAnimationSteps(semantic) {
 if (semantic.animationSteps && semantic.animationSteps.length > 0) {
 return;
 }
 const steps = [];
 let currentStep = 0;
 steps.push({
 step: currentStep++,
 title: '画出几何体',
 description: `画出${getShapeName(semantic.shape)}`,
 addElements: {
 points: [...semantic.points],
 edges: semantic.edges.map(e => e.label),
 },
 });
 const derivedPoints = semantic.points.filter(p => isDerivedPoint(p, semantic));
 if (derivedPoints.length > 0) {
 derivedPoints.forEach(point => {
 steps.push({
 step: currentStep++,
 title: `添加点${point}`,
 description: `标记${point}点`,
 addElements: {
 points: [point],
 },
 });
 });
 }
 const midpointEdges = semantic.relations.filter(r => r.includes('midpoint'));
 if (midpointEdges.length > 0) {
 midpointEdges.forEach(rel => {
 const match = rel.match(/^([A-Z]) midpoint ([A-Z])([A-Z])$/);
 if (match) {
 const [, mid, a, b] = match;
 steps.push({
 step: currentStep++,
 title: `连接${a}${b}并取中点`,
 description: `画出线段${a}${b}，找到中点${mid}`,
 addElements: {
 edges: [`${a}${b}`],
 highlightPoints: [mid],
 },
 });
 }
 });
 }
 if (semantic.planes && semantic.planes.length > 0) {
 semantic.planes.forEach(plane => {
 steps.push({
 step: currentStep++,
 title: `生成平面${plane.label}`,
 description: `画出平面${plane.label}`,
 addElements: {
 planes: [plane.label],
 },
 });
 });
 }
 if (semantic.importantLines && semantic.importantLines.length > 0) {
 steps.push({
 step: currentStep++,
 title: '高亮关键线段',
 description: `高亮${semantic.importantLines.join('、')}`,
 addElements: {
 highlightEdges: semantic.importantLines,
 },
 });
 }
 if (semantic.highlight && semantic.highlight.length > 0) {
 steps.push({
 step: currentStep++,
 title: '标记关系',
 description: `标记${semantic.highlight.join('、')}关系`,
 addElements: {
 highlight: semantic.highlight,
 },
 });
 }
 semantic.animationSteps = steps;
}
function isDerivedPoint(point, semantic) {
 const basePoints = getBasePoints(semantic.shape);
 if (basePoints.includes(point))
 return false;
 const midpointPattern = /^([A-Z]) midpoint/;
 for (const rel of semantic.relations) {
 if (rel.startsWith(point + ' midpoint')) {
 return true;
 }
 }
 return true;
}
function getShapeName(shape) {
 const names = {
 cube: '正方体',
 cuboid: '长方体',
 pyramid: '四棱锥',
 prism: '三棱柱',
 tetrahedron: '正四面体',
 octahedron: '正八面体',
 squareFrustum: '四棱台',
 sphere: '球体',
 cylinder: '圆柱',
 cone: '圆锥',
 circularFrustum: '圆台',
 };
 return names[shape] || shape;
}
function normalizeEdgeLabel(label) {
  if (typeof label === 'string' && label.length === 2) {
    const [a, b] = label.split('');
    return a < b ? label : `${b}${a}`;
  }
  return label;
}

function extractSceneState(steps = []) {
  const result = {
    importantLines: [],
    importantPlanes: [],
    highlightPoints: [],
    focusObject: null,
    camera: null,
    visibleObjects: [],
  };
  
  const seenLines = new Set();
  const seenPlanes = new Set();
  const seenPoints = new Set();
  
  steps.forEach(step => {
    const sceneState = step.sceneState;
    if (!sceneState) return;
    
    if (sceneState.highlightEdges) {
      sceneState.highlightEdges.forEach(line => {
        const rawId = typeof line === 'string' ? line : `${line.from}${line.to}`;
        const normalizedId = normalizeEdgeLabel(rawId);
        if (!seenLines.has(normalizedId)) {
          seenLines.add(normalizedId);
          result.importantLines.push(normalizedId);
        }
      });
    }
    
    if (sceneState.highlightPlanes) {
      sceneState.highlightPlanes.forEach(plane => {
        if (!seenPlanes.has(plane)) {
          seenPlanes.add(plane);
          result.importantPlanes.push(plane);
        }
      });
    }
    
    if (sceneState.highlightPoints) {
      sceneState.highlightPoints.forEach(point => {
        if (!seenPoints.has(point)) {
          seenPoints.add(point);
          result.highlightPoints.push(point);
        }
      });
    }
    
    if (sceneState.focusObject && !result.focusObject) {
      result.focusObject = sceneState.focusObject;
    }
    
    if (sceneState.camera && !result.camera) {
      result.camera = sceneState.camera;
    }
    
    if (sceneState.visibleObjects) {
      sceneState.visibleObjects.forEach(obj => {
        if (!result.visibleObjects.includes(obj)) {
          result.visibleObjects.push(obj);
        }
      });
    }
  });
  
  return result;
}

export function convertLegacyParsedToSemantic(parsedData, steps = []) {
 const semantic = {
 shape: parsedData.type || 'cube',
 size: parsedData.size || 2,
 points: parsedData.labels || parsedData.vertices || [],
 edges: [],
 faces: [],
 planes: [],
 relations: [],
 importantLines: [],
 importantPlanes: [],
 highlight: [],
 animationSteps: [],
 };
 
 const sceneState = extractSceneState(steps);
 semantic.importantLines = sceneState.importantLines;
 semantic.importantPlanes = sceneState.importantPlanes;
 semantic.highlightPoints = sceneState.highlightPoints;
 semantic.focusObject = sceneState.focusObject;
 semantic.camera = sceneState.camera;
 semantic.visibleObjects = sceneState.visibleObjects;
 
 const allContent = steps.map(s => s.content).join(' ');
 if (allContent) {
 semantic.relations = extractRelationsFromText(allContent);
 const textPlanes = extractImportantPlanes(allContent);
 textPlanes.forEach(plane => {
 if (!semantic.importantPlanes.includes(plane)) {
 semantic.importantPlanes.push(plane);
 }
 });
 semantic.highlight = extractHighlightTags(allContent);
 }
 console.log('[convertLegacyParsedToSemantic] relations:', JSON.stringify(semantic.relations, null, 2));
 return validateAndCompleteSemantic(semantic);
}
export function parseProblemToSemantic(problemText) {
 const t = problemText.toLowerCase();
 const shapePatterns = [
 { pattern: /正方体|立方体|cube/, shape: 'cube' },
 { pattern: /长方体|cuboid/, shape: 'cuboid' },
 { pattern: /四棱锥|棱锥|pyramid/i, shape: 'pyramid' },
 { pattern: /三棱锥|triangular pyramid/i, shape: 'pyramid' },
 { pattern: /棱柱|三棱柱|prism/i, shape: 'prism' },
 { pattern: /正四面体|四面体|tetrahedron/, shape: 'tetrahedron' },
 { pattern: /正八面体|八面体|octahedron/, shape: 'octahedron' },
 { pattern: /球体|球|sphere/, shape: 'sphere' },
 { pattern: /圆柱|cylinder/, shape: 'cylinder' },
 { pattern: /圆锥|cone/, shape: 'cone' },
 { pattern: /圆台|frustum/, shape: 'circularFrustum' },
 ];
 let shape = 'cube';
 for (const { pattern, shape: s } of shapePatterns) {
 if (pattern.test(t)) {
 shape = s;
 break;
 }
 }
 const sizeMatch = problemText.match(/(?:棱长|边长|半径|高)[为是]?\s*(\d+(?:\.\d+)?)/);
 const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;
 const points = extractPointsFromText(problemText, shape);
 const relations = extractRelationsFromText(problemText);
 const importantLines = extractImportantLines(problemText);
 const importantPlanes = extractImportantPlanes(problemText);
 const highlight = extractHighlightTags(problemText);
 const semantic = {
 shape,
 size,
 points,
 edges: [],
 faces: [],
 planes: [],
 relations,
 importantLines,
 importantPlanes,
 highlight,
 animationSteps: [],
 };
 return validateAndCompleteSemantic(semantic);
}
function extractPointsFromText(text, shape) {
 const basePoints = getBasePoints(shape);
 const pointSet = new Set(basePoints);
 const patterns = [
 /([A-Z])(?=[为的在是作连与和到使得且则或交属于]|，|,|。|；|：|:|、|\s)/g,
 /([A-Z]{2,})/g,
 ];
 patterns.forEach(pattern => {
 let match;
 while ((match = pattern.exec(text)) !== null) {
 if (match[1].length === 1) {
 pointSet.add(match[1]);
 }
 else {
 for (const ch of match[1]) {
 if (/[A-Z]/.test(ch)) {
 pointSet.add(ch);
 }
 }
 }
 }
 });
 return Array.from(pointSet);
}
function extractRelationsFromText(text) {
 const relations = [];
 const midpointPattern = /([A-Z])是?\s*([A-Z])([A-Z])\s*的?中点/g;
 let match;
 while ((match = midpointPattern.exec(text)) !== null) {
 relations.push(`${match[1]} midpoint ${match[2]}${match[3]}`);
 }
 const parallelPattern = /([A-Z][A-Z]?)\s*\/\/\s*([A-Z][A-Z]?)/g;
 while ((match = parallelPattern.exec(text)) !== null) {
 relations.push(`${match[1]} parallel ${match[2]}`);
 }
 const onLinePattern = /([A-Z])\s*在\s*([A-Z])([A-Z])\s*上/g;
 while ((match = onLinePattern.exec(text)) !== null) {
 relations.push(`${match[1]} on ${match[2]}${match[3]}`);
 }
 return relations;
}
function extractImportantLines(text) {
 const lines = [];
 const seen = new Set();
 const pairPattern = /([A-Z])([A-Z])/g;
 let match;
 while ((match = pairPattern.exec(text)) !== null) {
 const line = match[1] + match[2];
 if (!seen.has(line)) {
 seen.add(line);
 lines.push(line);
 }
 }
 return lines;
}
function extractImportantPlanes(text) {
 const planes = [];
 const seen = new Set();
 const planePattern = /平面([A-Z]{3,4})/g;
 let match;
 while ((match = planePattern.exec(text)) !== null) {
 const plane = match[1];
 if (!seen.has(plane)) {
 seen.add(plane);
 planes.push(plane);
 }
 }
 return planes;
}
function extractHighlightTags(text) {
 const tags = [];
 const patterns = [
 { pattern: /平行|\/\/|parallel/, tag: 'parallel' },
 { pattern: /垂直|perpendicular/, tag: 'perpendicular' },
 { pattern: /中点|midpoint/, tag: 'midpoint' },
 { pattern: /比例|ratio/, tag: 'ratio' },
 { pattern: /截面|section/, tag: 'section' },
 ];
 patterns.forEach(({ pattern, tag }) => {
 if (pattern.test(text.toLowerCase())) {
 tags.push(tag);
 }
 });
 return tags;
}