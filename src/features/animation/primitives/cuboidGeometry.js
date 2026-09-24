/**
 * 长方体原语的纯几何内核 —— 无 React / 无 Three，可独立单测。
 *
 * 坐标约定（与 schema.js 的锚点命名一致）：
 *   x ↔ 槽位 a（长）    y ↔ 槽位 c（高）    z ↔ 槽位 b（宽）
 * 底面顶点 a/b/c/d，顶面 a1/b1/c1/d1。
 *
 * 原语渲染的是单位立方体（边长 1、半边 0.5），实际尺寸由 group.scale 逐帧驱动；
 * 本模块返回的是**实际尺寸空间**的坐标，供不随非等比缩放变形的锚点标记使用。
 */

const HALF = 0.5;
const FALLBACK_DIM = 1;

/** 单位立方体中各顶点的坐标（半边 0.5）。 */
export const CUBOID_UNIT_VERTICES = Object.freeze({
  a: Object.freeze([-HALF, -HALF, -HALF]),
  b: Object.freeze([HALF, -HALF, -HALF]),
  c: Object.freeze([HALF, -HALF, HALF]),
  d: Object.freeze([-HALF, -HALF, HALF]),
  a1: Object.freeze([-HALF, HALF, -HALF]),
  b1: Object.freeze([HALF, HALF, -HALF]),
  c1: Object.freeze([HALF, HALF, HALF]),
  d1: Object.freeze([-HALF, HALF, HALF]),
});

export const CUBOID_VERTEX_NAMES = Object.freeze(Object.keys(CUBOID_UNIT_VERTICES));

/** 12 条棱（线框用）。 */
export const CUBOID_EDGES = Object.freeze([
  Object.freeze(['a', 'b']), Object.freeze(['b', 'c']),
  Object.freeze(['c', 'd']), Object.freeze(['d', 'a']),
  Object.freeze(['a1', 'b1']), Object.freeze(['b1', 'c1']),
  Object.freeze(['c1', 'd1']), Object.freeze(['d1', 'a1']),
  Object.freeze(['a', 'a1']), Object.freeze(['b', 'b1']),
  Object.freeze(['c', 'c1']), Object.freeze(['d', 'd1']),
]);

/** 6 个面 → 4 个顶点（面心锚点用；顺序为面内逆时针）。 */
export const CUBOID_FACES = Object.freeze({
  top: Object.freeze(['a1', 'b1', 'c1', 'd1']),
  bottom: Object.freeze(['a', 'b', 'c', 'd']),
  front: Object.freeze(['d', 'c', 'c1', 'd1']),
  back: Object.freeze(['a', 'b', 'b1', 'a1']),
  left: Object.freeze(['a', 'd', 'd1', 'a1']),
  right: Object.freeze(['b', 'c', 'c1', 'b1']),
});

function positiveOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 读取并兜底 a/b/c；非有限或非正数一律回退到 1（正常值由校验器保证）。 */
export function readCuboidParams(params) {
  const p = params || {};
  return {
    a: positiveOr(p.a, FALLBACK_DIM),
    b: positiveOr(p.b, FALLBACK_DIM),
    c: positiveOr(p.c, FALLBACK_DIM),
  };
}

/** 单位空间 → 实际尺寸空间：单位半边 0.5 对应实际半边 dim/2，故直接相乘。 */
function scaleUnit(unit, dims) {
  return [unit[0] * dims.a, unit[1] * dims.c, unit[2] * dims.b];
}

/** 顶点在单位立方体中的坐标；未知顶点返回 null。 */
export function unitVertex(name) {
  return CUBOID_UNIT_VERTICES[name] || null;
}

/** 顶点在实际尺寸空间的坐标；未知顶点返回 null。 */
export function resolveCuboidVertex(name, params) {
  const unit = CUBOID_UNIT_VERTICES[name];
  if (!unit) return null;
  return scaleUnit(unit, readCuboidParams(params));
}

// 锚点 → 单位空间坐标。面心取面内 4 顶点均值，棱锚点取两端点中点。
const ANCHOR_UNIT = { center: Object.freeze([0, 0, 0]) };

for (const name of CUBOID_VERTEX_NAMES) {
  ANCHOR_UNIT[`vertex-${name}`] = CUBOID_UNIT_VERTICES[name];
}

for (const [face, names] of Object.entries(CUBOID_FACES)) {
  const sum = [0, 0, 0];
  for (const n of names) {
    sum[0] += CUBOID_UNIT_VERTICES[n][0];
    sum[1] += CUBOID_UNIT_VERTICES[n][1];
    sum[2] += CUBOID_UNIT_VERTICES[n][2];
  }
  ANCHOR_UNIT[`face-${face}`] = Object.freeze(sum.map((s) => s / names.length));
}

const EDGE_ANCHORS = Object.freeze([
  ['edge-ab', 'a', 'b'],
  ['edge-bc', 'b', 'c'],
  ['edge-aa1', 'a', 'a1'],
]);

for (const [anchor, from, to] of EDGE_ANCHORS) {
  const p = CUBOID_UNIT_VERTICES[from];
  const q = CUBOID_UNIT_VERTICES[to];
  ANCHOR_UNIT[anchor] = Object.freeze([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]);
}

Object.freeze(ANCHOR_UNIT);

/** 本原语能解析的全部锚点（应与 schema.js cuboid 的 anchors 完全一致）。 */
export const CUBOID_ANCHORS = Object.freeze(Object.keys(ANCHOR_UNIT));

/**
 * 解析锚点到实际尺寸空间的坐标；未知锚点返回 null
 * （渲染器据此跳过该标注，绝不猜一个位置顶上）。
 */
export function resolveCuboidAnchor(anchor, params) {
  const unit = ANCHOR_UNIT[anchor];
  if (!unit) return null;
  return scaleUnit(unit, readCuboidParams(params));
}
