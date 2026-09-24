import { describe, it, expect } from 'vitest';
import {
  CUBOID_ANCHORS,
  CUBOID_FACES,
  CUBOID_VERTEX_NAMES,
  readCuboidParams,
  resolveCuboidAnchor,
  resolveCuboidVertex,
  unitVertex,
} from '../cuboidGeometry';
import { getPrimitive } from '../../../../engines/animationIR/schema';

const dims = (a, b, c) => ({ a, b, c });
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

describe('cuboidGeometry —— 锚点契约', () => {
  it('解析的锚点与 schema 声明的 anchors 完全一致', () => {
    const declared = getPrimitive('cuboid').anchors;
    expect([...CUBOID_ANCHORS].sort()).toEqual([...declared].sort());
  });

  it('每个锚点都能解析出坐标，未知锚点返回 null（绝不猜位置）', () => {
    for (const anchor of CUBOID_ANCHORS) {
      const pos = resolveCuboidAnchor(anchor, dims(2, 4, 6));
      expect(Array.isArray(pos), anchor).toBe(true);
      expect(pos.every((n) => Number.isFinite(n)), anchor).toBe(true);
    }
    expect(resolveCuboidAnchor('face-nope', dims(2, 4, 6))).toBeNull();
    expect(resolveCuboidAnchor(undefined, dims(2, 4, 6))).toBeNull();
  });

  it('顶点、面心、棱中点坐标 = 半尺寸，中心在原点', () => {
    const d = dims(2, 4, 6); // a=2(长 x) b=4(宽 z) c=6(高 y)
    expect(resolveCuboidAnchor('center', d)).toEqual([0, 0, 0]);
    expect(resolveCuboidAnchor('vertex-a', d)).toEqual([-1, -3, -2]);
    expect(resolveCuboidAnchor('vertex-c1', d)).toEqual([1, 3, 2]);
    expect(resolveCuboidAnchor('face-top', d)).toEqual([0, 3, 0]);
    expect(resolveCuboidAnchor('face-bottom', d)).toEqual([0, -3, 0]);
    expect(resolveCuboidAnchor('face-front', d)).toEqual([0, 0, 2]);
    expect(resolveCuboidAnchor('face-left', d)).toEqual([-1, 0, 0]);
    expect(resolveCuboidAnchor('edge-ab', d)).toEqual([0, -3, -2]);
    expect(resolveCuboidAnchor('edge-bc', d)).toEqual([1, -3, 0]);
    expect(resolveCuboidAnchor('edge-aa1', d)).toEqual([-1, 0, -2]);
  });

  it('八个顶点两两构成正方体：棱长分别等于 a / b / c', () => {
    const d = dims(2, 4, 6);
    expect(dist(resolveCuboidVertex('a', d), resolveCuboidVertex('b', d))).toBeCloseTo(2, 10); // a 长
    expect(dist(resolveCuboidVertex('b', d), resolveCuboidVertex('c', d))).toBeCloseTo(4, 10); // b 宽
    expect(dist(resolveCuboidVertex('a', d), resolveCuboidVertex('a1', d))).toBeCloseTo(6, 10); // c 高
  });

  it('a=b=c 时退化为正方体，顶点在 ±s/2', () => {
    const d = dims(3, 3, 3);
    for (const name of CUBOID_VERTEX_NAMES) {
      const p = resolveCuboidVertex(name, d);
      for (const axis of p) expect(Math.abs(axis)).toBeCloseTo(1.5, 10);
    }
  });

  it('unitVertex 返回单位立方体坐标，未知顶点返回 null', () => {
    expect(unitVertex('a')).toEqual([-0.5, -0.5, -0.5]);
    expect(unitVertex('d1')).toEqual([-0.5, 0.5, 0.5]);
    expect(unitVertex('z9')).toBeNull();
    expect(resolveCuboidVertex('z9', dims(2, 4, 6))).toBeNull();
  });

  it('棱锚点落在该棱中点上，面锚点是该面中心', () => {
    const d = dims(2, 4, 6);
    const mid = (from, to) => {
      const p = resolveCuboidVertex(from, d);
      const q = resolveCuboidVertex(to, d);
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    };
    expect(resolveCuboidAnchor('edge-ab', d)).toEqual(mid('a', 'b'));
    expect(resolveCuboidAnchor('edge-bc', d)).toEqual(mid('b', 'c'));
    expect(resolveCuboidAnchor('edge-aa1', d)).toEqual(mid('a', 'a1'));

    for (const [face, names] of Object.entries(CUBOID_FACES)) {
      const pts = names.map((n) => resolveCuboidVertex(n, d));
      const center = [0, 1, 2].map((i) => pts.reduce((s, p) => s + p[i], 0) / pts.length);
      expect(resolveCuboidAnchor(`face-${face}`, d)).toEqual(center);
    }
  });

  it('readCuboidParams 对非有限 / 非正数回退到 1', () => {
    expect(readCuboidParams({ a: 2, b: 4, c: 6 })).toEqual({ a: 2, b: 4, c: 6 });
    expect(readCuboidParams({})).toEqual({ a: 1, b: 1, c: 1 });
    expect(readCuboidParams({ a: 0, b: -3, c: NaN })).toEqual({ a: 1, b: 1, c: 1 });
    expect(readCuboidParams({ a: '2.5', b: Infinity, c: null })).toEqual({ a: 2.5, b: 1, c: 1 });
    expect(readCuboidParams(null)).toEqual({ a: 1, b: 1, c: 1 });
  });

  it('不修改传入的 params', () => {
    const input = { a: 2, b: 4, c: 6 };
    resolveCuboidAnchor('center', input);
    readCuboidParams(input);
    expect(input).toEqual({ a: 2, b: 4, c: 6 });
  });
});
