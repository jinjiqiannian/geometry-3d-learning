import { VERTEX_TEMPLATES, getScaledTemplate, ROLE_DEFINITIONS } from './sceneIRTemplate';
import { computeVerticesFromParams, relaxVertices } from './constraintSolver';
import { extractVerticesFromText } from './labelMapper';
import { extractEdgeRefs, extractGivenRelations, extractProofGoals } from './problemParser';
const SHAPE_EDGE_TEMPLATES = {
 cube: {
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH', 'A1B1', 'B1C1', 'C1D1', 'D1A1', 'AA1', 'BB1', 'CC1', 'DD1', "A'B'", "B'C'", "C'D'", "D'A'", "AA'", "BB'", "CC'", "DD'"],
 requiredPoints: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
 },
 cuboid: {
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH', 'A1B1', 'B1C1', 'C1D1', 'D1A1', 'AA1', 'BB1', 'CC1', 'DD1', "A'B'", "B'C'", "C'D'", "D'A'", "AA'", "BB'", "CC'", "DD'"],
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
 requiredEdges: ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH', "A'B'", "B'C'", "C'D'", "D'A'", "AA'", "BB'", "CC'", "DD'"],
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
 requiredPoints: ['O', "O'", 'A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"],
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
  result.constraints = result.constraints || {};
  const basePoints = getBasePoints(result.shape);
  // 尊重题目自身的标记体系（"根据题目来"）：空则用默认顶点；
  // 部分顶点（0 < n < basePoints.length）时按默认顶点集补齐缺失点（如圆台只给 O,O',A-D，缺 A'-D'）
  if (result.points.length === 0) {
    result.points = [...basePoints];
  } else if (result.points.length < basePoints.length) {
    const partialSet = new Set(result.points);
    basePoints.forEach(p => partialSet.add(p));
    result.points = Array.from(partialSet);
  }
  const pointSet = new Set(result.points);
  
  if (!result.edges || result.edges.length === 0) {
    const edgeSet = new Set();
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
  }
  
  completeRelations(result);
  completeImportantElements(result);
  
  if (!result.roleMap || Object.keys(result.roleMap).length === 0) {
    const roleMap = buildRoleMap(result.shape, result.points, basePoints, result.edges);
    result.roleMap = roleMap;
  }
  
  if (!result.planes || result.planes.length === 0) {
    completePlanes(result);
  }
  
  if (!result.pointPositions || Object.keys(result.pointPositions).length === 0) {
    computePointPositions(result);
  }
  
  if (result.constraints && result.constraints.mode) {
    const currentVertices = Object.values(result.pointPositions);
    const updatedVertices = computeVerticesFromParams(
      result.shape,
      result.constraints.mode,
      result.constraints.params || {},
      currentVertices
    );
    if (updatedVertices && updatedVertices.length > 0) {
      const labels = Object.keys(result.pointPositions);
      updatedVertices.forEach((pos, i) => {
        if (labels[i]) {
          result.pointPositions[labels[i]] = pos;
        }
      });
    }
  }
  
  generateAnimationSteps(result);
  
  console.log('[validateAndCompleteSemantic] roleMap:', JSON.stringify(result.roleMap));
  
  console.log('==========================================');
  console.log('[STEP1] GeometryValidator Semantic Debug');
  console.log('==========================================');
  console.log('shape:', result.shape);
  console.log('points:', result.points, `(count: ${result.points.length})`);
  console.log('edges:', result.edges, `(count: ${result.edges.length})`);
  console.log('planes:', result.planes, `(count: ${result.planes.length})`);
  console.log('roleMap:', JSON.stringify(result.roleMap, null, 2));
  console.log('pointPositions:', JSON.stringify(result.pointPositions, null, 2));
  
  if (result.shape === 'cube') {
    const basePoints = getBasePoints('cube');
    const derivedPoints = result.points.filter(p => !basePoints.includes(p));
    const expectedBasePoints = 8;
    const expectedEdges = 12;
    const expectedPlanes = 6;
    console.log('--- Cube Validation ---');
    console.log(`Base Points: ${basePoints.length} / ${expectedBasePoints} [${basePoints.length === expectedBasePoints ? 'PASS' : 'FAIL'}]`);
    console.log(`Derived Points: ${derivedPoints.length}`);
    console.log(`Edges: ${result.edges.length} / ${expectedEdges} [${result.edges.length === expectedEdges ? 'PASS' : 'FAIL'}]`);
    console.log(`Planes: ${result.planes.length} / ${expectedPlanes} [${result.planes.length === expectedPlanes ? 'PASS' : 'FAIL'}]`);
  }
  
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
 // 单字母+可选撇号组合："AB" / "A'B'" / "AA'" / "A'B"
 const primePattern = str.match(/^([A-Z]'?)([A-Z]'?)$/);
 if (primePattern) {
 return primePattern.slice(1);
 }
 const numberedPattern = str.match(/^([A-Z][0-9]*)([A-Z][0-9]*)$/);
 if (numberedPattern) {
 return numberedPattern.slice(1);
 }
 const mixedPattern = str.match(/^([A-Z])([A-Z][0-9]+)$/);
 if (mixedPattern) {
 return mixedPattern.slice(1);
 }
 const mixedPattern2 = str.match(/^([A-Z][0-9]+)([A-Z])$/);
 if (mixedPattern2) {
 return mixedPattern2.slice(1);
 }
 if (str.length === 2) {
 return [str[0], str[1]];
 }
 return [str[0], str[1]];
}
function completeRelations(semantic) {
 const relations = semantic.relations;
 const pointSet = new Set(semantic.points);
 const midpointPattern = /^([A-Z]) midpoint ([A-Z][0-9]*?)([A-Z][0-9]*)$/;
 const intersectionPattern = /^([A-Z][0-9]*'?) intersection /;
 const onPattern = /^([A-Z][0-9]*) on ([A-Z][0-9]*?)([A-Z][0-9]*)$/;
 relations.forEach(rel => {
 const match = rel.match(midpointPattern);
 if (match) {
 const [, mid, a, b] = match;
 if (!pointSet.has(mid)) {
 semantic.points.push(mid);
 pointSet.add(mid);
 }
 }
 // "F on PA" 关系的首个标签为线上点，与 midpoint/intersection 一样必须进入 points，
 // 否则 computePointPositions 不会计算其坐标，Scene IR 中该点缺失
 const om = rel.match(onPattern);
 if (om && !pointSet.has(om[1])) {
 semantic.points.push(om[1]);
 pointSet.add(om[1]);
 }
 // intersection 关系的首个标签为交点（如 "G intersection PC BEF"），确保进入 points
 const im = rel.match(intersectionPattern);
 if (im && !pointSet.has(im[1])) {
 semantic.points.push(im[1]);
 pointSet.add(im[1]);
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
function completePlanes(semantic) {
 const tpl = VERTEX_TEMPLATES[semantic.shape];
 if (!tpl || !tpl.faces) {
 return;
 }
 const roleMap = semantic.roleMap || {};
 const roleDef = ROLE_DEFINITIONS[semantic.shape];
 if (!roleDef) {
 return;
 }
 const indexToLabel = {};
 for (const [role, indices] of Object.entries(roleDef)) {
 const labels = roleMap[role];
 if (!labels) continue;
 if (Array.isArray(indices)) {
 indices.forEach((idx, i) => {
 if (labels[i]) {
 indexToLabel[idx] = labels[i];
 }
 });
 } else {
 indexToLabel[indices] = labels;
 }
 }
 const planeLabels = new Set(semantic.planes.map(p => p.label));
 tpl.faces.forEach((face, i) => {
 const faceLabels = face.vertices.map(idx => indexToLabel[idx]);
 if (faceLabels.every(Boolean)) {
 const label = faceLabels.join('');
 if (!planeLabels.has(label)) {
 semantic.planes.push({
 label: label,
 points: faceLabels,
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
  
  // 先落实 PA⊥底面 等约束（移动锥顶），再推中点/线上点，避免 E 等辅助点相对旧 P 漂出棱外
  applyPerpendicularPlaneConstraints(semantic, labelToPosition);

  semantic.points.forEach(point => {
    if (!labelToPosition[point]) {
      const pos = findDerivedPosition(point, semantic, labelToPosition);
      labelToPosition[point] = pos;
    }
  });
  semantic.pointPositions = labelToPosition;
  return labelToPosition;
}

/** 将「线 ⊥ 面」落到坐标：垂足端点在面上，另一端沿法向抬高 */
function applyPerpendicularPlaneConstraints(semantic, labelToPosition) {
  const height = Number(semantic.size) > 0 ? Number(semantic.size) : 2;
  for (const rel of semantic.relations || []) {
    const m = rel.match(
      /^([A-Z][0-9]*'?)([A-Z][0-9]*'?)\s+perpendicular\s+plane\s+([A-Z0-9']+)$/
    );
    if (!m) continue;
    const segA = m[1];
    const segB = m[2];
    const planePts = m[3].match(/[A-Z][0-9]*'?/g) || [];
    if (planePts.length < 3) continue;

    const planeSet = new Set(planePts);
    let foot = null;
    let apex = null;
    if (planeSet.has(segA) && !planeSet.has(segB)) {
      foot = segA;
      apex = segB;
    } else if (planeSet.has(segB) && !planeSet.has(segA)) {
      foot = segB;
      apex = segA;
    } else {
      continue;
    }

    const p0 = labelToPosition[planePts[0]];
    const p1 = labelToPosition[planePts[1]];
    const p2 = labelToPosition[planePts[2]];
    const footPos = labelToPosition[foot];
    if (!p0 || !p1 || !p2 || !footPos) continue;

    const u = vecSub(p1, p0);
    const v = vecSub(p2, p0);
    let n = vecCross(u, v);
    const nLen = Math.hypot(n[0], n[1], n[2]);
    if (nLen < 1e-9) continue;
    n = [n[0] / nLen, n[1] / nLen, n[2] / nLen];
    // 法向朝向原锥顶一侧，避免翻到下方
    const oldApex = labelToPosition[apex];
    if (oldApex) {
      const toOld = vecSub(oldApex, footPos);
      if (vecDot(toOld, n) < 0) n = [-n[0], -n[1], -n[2]];
    } else if (n[1] < 0) {
      n = [-n[0], -n[1], -n[2]];
    }

    labelToPosition[apex] = [
      footPos[0] + n[0] * height,
      footPos[1] + n[1] * height,
      footPos[2] + n[2] * height,
    ];
  }
}
function findDerivedPosition(point, semantic, knownPositions) {
 const midpointPattern = /^([A-Z]) midpoint ([A-Z][0-9]*?)([A-Z][0-9]*)$/;
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
 const onLinePattern = /^([A-Z]) on ([A-Z][0-9]?)([A-Z][0-9]?)$/;
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
 // intersection 交点推导："G intersection AC BD"（线线）/ "G intersection PC BEF"（线面）
 const intersectionPattern = /^([A-Z][0-9]*'?) intersection ([A-Z][0-9]*'?[A-Z][0-9]*'?) ([A-Z][0-9]*'?(?:[A-Z][0-9]*'?){1,2})$/;
 for (const rel of semantic.relations) {
 const match = rel.match(intersectionPattern);
 if (!match || match[1] !== point) continue;
 const linePts = splitLabels(match[2]).map(id => knownPositions[id]);
 const otherPts = splitLabels(match[3]).map(id => knownPositions[id]);
 if (linePts.length !== 2 || linePts.some(p => !p) || otherPts.some(p => !p)) {
 return null; // 数据不足，安全返回
 }
 if (otherPts.length === 2) {
 return lineLineIntersection(linePts[0], linePts[1], otherPts[0], otherPts[1]);
 }
 if (otherPts.length === 3) {
 return linePlaneIntersection(linePts[0], linePts[1], otherPts[0], otherPts[1], otherPts[2]);
 }
 return null;
 }
 return [0, 0, 0];
}
// ── intersection 坐标推导工具（纯向量运算，不依赖 GeometryEngine）──
function splitLabels(str) {
 return str.match(/[A-Z][0-9]*'?/g) || [];
}
const vecSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vecDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vecCross = (a, b) => [
 a[1] * b[2] - a[2] * b[1],
 a[2] * b[0] - a[0] * b[2],
 a[0] * b[1] - a[1] * b[0],
];
const vecAddScaled = (a, d, t) => [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
// 两线交点：取 line1 上与 line2 最近的点（真正相交时即为交点）；平行 → null
function lineLineIntersection(p1, p2, p3, p4) {
 const d1 = vecSub(p2, p1), d2 = vecSub(p4, p3), r = vecSub(p1, p3);
 const a = vecDot(d1, d1), b = vecDot(d1, d2), c = vecDot(d2, d2);
 const d = vecDot(d1, r), e = vecDot(d2, r);
 const denom = a * c - b * b;
 if (Math.abs(denom) < 1e-12) return null;
 const s = (b * e - c * d) / denom;
 return vecAddScaled(p1, d1, s);
}
// 线面交点：平面法向 n = (B-A)×(C-A)，t = n·(A-P1) / n·d；线面平行 → null
function linePlaneIntersection(p1, p2, a, b, c) {
 const n = vecCross(vecSub(b, a), vecSub(c, a));
 const d = vecSub(p2, p1);
 const dn = vecDot(d, n);
 if (Math.abs(dn) < 1e-12) return null;
 const t = vecDot(vecSub(a, p1), n) / dn;
 return vecAddScaled(p1, d, t);
}
function generateAnimationSteps(semantic) {
 if (semantic.animationSteps && semantic.animationSteps.length > 0) {
 return;
 }
 const steps = [];
 let currentStep = 0;
 const basePoints = getBasePoints(semantic.shape);
 const shapeName = getShapeName(semantic.shape);
 const allEdgeLabels = (semantic.edges || []).map(e => (typeof e === 'string' ? e : e.label)).filter(Boolean);

 // ① 先立顶点，再连棱 — 学生能看清「从点到体」
 const visibleBase = (semantic.points || []).filter(p => basePoints.includes(p));
 if (visibleBase.length > 0) {
   steps.push({
     step: currentStep++,
     title: `标出${shapeName}顶点`,
     description: `先标出${visibleBase.join('、')}，确定空间位置`,
     addElements: { points: visibleBase },
   });
 }

 if (allEdgeLabels.length > 0) {
   steps.push({
     step: currentStep++,
     title: `连出${shapeName}`,
     description: `连接各棱，形成${shapeName}`,
     addElements: {
       points: [...(semantic.points || [])],
       edges: allEdgeLabels,
     },
   });
 } else {
   steps.push({
     step: currentStep++,
     title: '画出几何体',
     description: `画出${shapeName}`,
     addElements: {
       points: [...(semantic.points || [])],
       edges: [],
     },
   });
 }

 const derivedPoints = (semantic.points || []).filter(p => isDerivedPoint(p, semantic));
 const midpointEdges = (semantic.relations || []).filter(r => typeof r === 'string' && r.includes('midpoint'));
 const handledDerived = new Set();

 // ② 中点构造：先连线，再标中点（高考常考辅助点）
 midpointEdges.forEach(rel => {
   const match = String(rel).match(/^([A-Z][0-9]*)\s+midpoint\s+([A-Z][0-9]*)([A-Z][0-9]*)$/i);
   if (!match) return;
   const [, mid, a, b] = match;
   const midU = mid.toUpperCase();
   handledDerived.add(midU);
   steps.push({
     step: currentStep++,
     title: `取${a}${b}中点${midU}`,
     description: `连接${a}${b}，取中点${midU}（常用辅助点）`,
     addElements: {
       edges: [`${a}${b}`],
       points: [midU],
       highlightPoints: [midU],
     },
   });
 });

 // ③ 垂足 / 线面垂直 — 线面角、距离题的关键构造
 const perpRels = (semantic.relations || []).filter(
   r => typeof r === 'string' && /perpendicular/i.test(r)
 );
 perpRels.forEach(rel => {
   const planeMatch = String(rel).match(
     /^([A-Z][0-9]*'?)([A-Z][0-9]*'?)\s+perpendicular\s+plane\s+([A-Z0-9']+)$/i
   );
   if (planeMatch) {
     const [, p0, p1, plane] = planeMatch;
     steps.push({
       step: currentStep++,
       title: `作垂线${p0}${p1}⊥面${plane}`,
       description: `过点作平面${plane}的垂线，得到垂足（求线面角/距离的关键）`,
       addElements: {
         edges: [`${p0}${p1}`],
         highlightEdges: [`${p0}${p1}`],
         planes: [plane],
         highlightPoints: [p0, p1],
       },
     });
     return;
   }
   const lineMatch = String(rel).match(
     /^([A-Z][0-9]*'?)([A-Z][0-9]*'?)\s+perpendicular\s+([A-Z][0-9]*'?)([A-Z][0-9]*'?)$/i
   );
   if (lineMatch) {
     const [, a, b, c, d] = lineMatch;
     steps.push({
       step: currentStep++,
       title: `标出${a}${b}⊥${c}${d}`,
       description: `高亮互相垂直的两线段，确认直角关系`,
       addElements: {
         highlightEdges: [`${a}${b}`, `${c}${d}`],
       },
     });
   }
 });

 // ④ 平行关系 — 平移法 / 线面平行证明
 const parallelRels = (semantic.relations || []).filter(
   r => typeof r === 'string' && /\bparallel\b/i.test(r) && !/perpendicular/i.test(r)
 );
 parallelRels.forEach(rel => {
   const match = String(rel).match(
     /^([A-Z][0-9]*'?)([A-Z][0-9]*'?)\s+parallel\s+([A-Z][0-9]*'?)([A-Z][0-9]*'?)$/i
   );
   if (!match) return;
   const [, a, b, c, d] = match;
   steps.push({
     step: currentStep++,
     title: `观察${a}${b}∥${c}${d}`,
     description: `高亮平行线段（平移法/线面平行常用）`,
     addElements: {
       highlightEdges: [`${a}${b}`, `${c}${d}`],
     },
   });
 });

 // ⑤ 其余派生点逐个出现
 derivedPoints.forEach(point => {
   if (handledDerived.has(point)) return;
   steps.push({
     step: currentStep++,
     title: `添加点${point}`,
     description: `在图上标出辅助点${point}`,
     addElements: {
       points: [point],
       highlightPoints: [point],
     },
   });
 });

 if (semantic.planes && semantic.planes.length > 0) {
   semantic.planes.forEach(plane => {
     steps.push({
       step: currentStep++,
       title: `生成平面${plane.label}`,
       description: `画出平面${plane.label}，看清截面/半平面`,
       addElements: {
         planes: [plane.label],
       },
     });
   });
 }

 // ⑥ 关键线段逐条高亮，避免一次闪太多
 if (semantic.importantLines && semantic.importantLines.length > 0) {
   semantic.importantLines.forEach((edge, i) => {
     steps.push({
       step: currentStep++,
       title: `关注线段${edge}`,
       description:
         i === 0
           ? `高亮关键线段${edge}，跟解题步骤对齐`
           : `继续高亮${edge}`,
       addElements: {
         highlightEdges: semantic.importantLines.slice(0, i + 1),
       },
     });
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
  const geometry = parsedData.geometry;
  
  if (geometry) {
    return convertGeometryToSemantic(geometry, steps);
  }
  
  const semantic = {
    shape: parsedData.type || 'cube',
    size: parsedData.size || 2,
    points: parsedData.labels || [],
    edges: parsedData.edges || [],
    faces: [],
    planes: parsedData.planes || [],
    relations: parsedData.relations || [],
    importantLines: parsedData.importantLines || (parsedData.highlightLines || []).map(l => l.label || `${l.from}${l.to}`),
    importantPlanes: parsedData.importantPlanes || [],
    highlight: [],
    animationSteps: [],
  };
  
  const isValidVertex = (v) => Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'number');
  
  if (parsedData.vertices && Array.isArray(parsedData.vertices) && parsedData.labels) {
    const allValid = parsedData.labels.every((label, i) => {
      return !parsedData.vertices[i] || isValidVertex(parsedData.vertices[i]);
    });
    
    if (allValid) {
      const pointPositions = {};
      parsedData.labels.forEach((label, i) => {
        if (parsedData.vertices[i]) {
          pointPositions[label] = [...parsedData.vertices[i]];
        }
      });
      semantic.pointPositions = pointPositions;
    }
  }
  
  const sceneState = extractSceneState(steps);
  if (sceneState.importantLines && sceneState.importantLines.length > 0) {
    semantic.importantLines = sceneState.importantLines;
  }
  if (sceneState.importantPlanes && sceneState.importantPlanes.length > 0) {
    semantic.importantPlanes = sceneState.importantPlanes;
  }
  semantic.highlightPoints = sceneState.highlightPoints;
  semantic.focusObject = sceneState.focusObject;
  semantic.camera = sceneState.camera;
  semantic.visibleObjects = sceneState.visibleObjects;
  
  return validateAndCompleteSemantic(semantic);
}

function convertGeometryToSemantic(geometry, steps = []) {
  const semantic = {
    shape: geometry.shape || 'cube',
    size: geometry.size || 2,
    points: geometry.points || [],
    edges: geometry.edges || [],
    faces: [],
    planes: geometry.planes || [],
    relations: geometry.relations || [],
    importantLines: geometry.highlight?.edges || [],
    importantPlanes: geometry.highlight?.planes || [],
    highlight: [],
    animationSteps: [],
    roleMap: geometry.roleMap || {},
    pointPositions: geometry.pointPositions || {},
    focusObject: geometry.focusObject || null,
    camera: geometry.camera || null,
    highlightPoints: geometry.highlight?.points || [],
    visibleObjects: [],
  };
  
  if (geometry.highlight?.color) {
    semantic.highlightColor = geometry.highlight.color;
  }
  
  const sceneState = extractSceneState(steps);
  if (sceneState.focusObject && !semantic.focusObject) {
    semantic.focusObject = sceneState.focusObject;
  }
  if (sceneState.camera && !semantic.camera) {
    semantic.camera = sceneState.camera;
  }
  
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
  let size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;
  /** @type {Record<string, number>} */
  let params = { size };
  // 长方体作业题：长3、宽4、高5 — 勿把「高」当成唯一 size
  if (shape === 'cuboid') {
    const dims = problemText.match(
      /长[为是]?\s*(\d+(?:\.\d+)?)[、,，\s]*宽[为是]?\s*(\d+(?:\.\d+)?)[、,，\s]*高[为是]?\s*(\d+(?:\.\d+)?)/,
    );
    if (dims) {
      const a = parseFloat(dims[1]);
      const b = parseFloat(dims[2]);
      const c = parseFloat(dims[3]);
      size = a;
      params = { size: a, a, b, c, length: a, width: b, height: c };
    } else {
      const lengthMatch = problemText.match(/(?:^|[体，,、\s])长[为是]?\s*(\d+(?:\.\d+)?)/);
      const widthMatch = problemText.match(/宽[为是]?\s*(\d+(?:\.\d+)?)/);
      const heightMatch = problemText.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
      const a = lengthMatch ? parseFloat(lengthMatch[1]) : size;
      const b = widthMatch ? parseFloat(widthMatch[1]) : a;
      const c = heightMatch ? parseFloat(heightMatch[1]) : a;
      size = a;
      params = { size: a, a, b, c, length: a, width: b, height: c };
    }
  }
  const basePoints = getBasePoints(shape);
  // "根据题目来"：优先用题目中实际出现的顶点标签（如 ABCD-EFGH），否则回退到默认顶点
  const extractedLabels = extractVerticesFromText(problemText);
  const points = (extractedLabels && extractedLabels.length > 0) ? extractedLabels : [...basePoints];
  // 提取题目中提及的关键线段（如 体对角线AG），用于后续高亮
  const importantLines = extractEdgeRefs(problemText).map(e => e.label);
  const proofGoals = extractProofGoals(problemText);
  const semantic = {
    shape,
    size,
    params,
    points,
    edges: [],
    faces: [],
    planes: [],
    relations: extractGivenRelations(problemText),
    importantLines,
    importantPlanes: [],
    highlight: [],
    animationSteps: [],
    baseShape: /菱形/.test(problemText) ? 'rhombus' : undefined,
    goal: proofGoals[0] || undefined,
    goals: proofGoals.length > 1 ? proofGoals : undefined,
  };
  return validateAndCompleteSemantic(semantic);
}
function buildRoleMap(type, labels, basePoints, edges) {
  const roleDef = ROLE_DEFINITIONS[type];
  const tpl = VERTEX_TEMPLATES[type];
  if (!roleDef || !tpl) return {};

  const labelSet = new Set(labels);
  const result = {};

  if (type === 'pyramid') {
    // 用全图度数找锥顶：底面四点度数≈2，锥顶连到底面四点度数≈4。
    // 旧逻辑只在“底面点集”里比度数，正方形四点同为 2，会误把 A 当成锥顶。
    const fullDegree = new Map();
    labels.forEach((p) => fullDegree.set(p, 0));
    edges.forEach((e) => {
      if (!e?.from || !e?.to) return;
      fullDegree.set(e.from, (fullDegree.get(e.from) || 0) + 1);
      fullDegree.set(e.to, (fullDegree.get(e.to) || 0) + 1);
    });

    let apex = null;
    let maxDegree = -1;
    for (const [p, degree] of fullDegree) {
      if (degree > maxDegree) {
        maxDegree = degree;
        apex = p;
      }
    }
    // 并列时优先教材命名 P
    if (labelSet.has('P') && (fullDegree.get('P') || 0) >= maxDegree) {
      apex = 'P';
    }
    if (!apex) {
      apex = tpl.labels[roleDef.apex];
    }

    const pool = basePoints?.length ? basePoints : Array.from(labelSet);
    const baseVertices = pool.filter((p) => p !== apex);

    result.apex = apex;
    result.baseVertices = baseVertices;
  } else if (type === 'cube' || type === 'cuboid') {
    const basePointsNoTemplate = Array.from(labelSet).filter(p => p.length <= 2);

    const baseVertices = basePointsNoTemplate.filter(p => !p.match(/\d/) && !p.includes("'"));
    const topVertices = basePointsNoTemplate.filter(p => p.match(/\d/) || p.includes("'"));

    if (baseVertices.length >= 4 && topVertices.length >= 4) {
      const sortedBase = [];
      const sortedTop = [];
      for (let i = 0; i < 4; i++) {
        const baseLabel = tpl.labels[i];
        const baseMatch = baseVertices.find(v => v[0] === baseLabel[0]);
        if (baseMatch) sortedBase.push(baseMatch);
        const topLabel = tpl.labels[i];
        const topMatch = topVertices.find(v => v[0] === topLabel[0]);
        if (topMatch) sortedTop.push(topMatch);
      }
      result.baseVertices = sortedBase.length === 4 ? sortedBase : baseVertices.slice(0, 4);
      result.topVertices = sortedTop.length === 4 ? sortedTop : topVertices.slice(0, 4);
    } else {
      for (const [role, indices] of Object.entries(roleDef)) {
        if (Array.isArray(indices)) {
          result[role] = indices.map(idx => {
            const templateLabel = tpl.labels[idx];
            return labelSet.has(templateLabel) ? templateLabel : templateLabel;
          });
        } else {
          const templateLabel = tpl.labels[indices];
          result[role] = labelSet.has(templateLabel) ? templateLabel : templateLabel;
        }
      }
    }
  } else {
    for (const [role, indices] of Object.entries(roleDef)) {
      if (Array.isArray(indices)) {
        result[role] = indices.map(idx => {
          const templateLabel = tpl.labels[idx];
          return labelSet.has(templateLabel) ? templateLabel : templateLabel;
        });
      } else {
        const templateLabel = tpl.labels[indices];
        result[role] = labelSet.has(templateLabel) ? templateLabel : templateLabel;
      }
    }
  }

  return result;
}

export function applyConstraints(type, constraintMode, modeParams, currentVertices) {
  return computeVerticesFromParams(type, constraintMode, modeParams, currentVertices);
}
