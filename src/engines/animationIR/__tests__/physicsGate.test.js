import { describe, it, expect } from 'vitest';
import {
  physicsGate,
  checkRelation,
  PHYSICS_CODE,
  PHYSICS_VERDICT,
} from '../physicsGate.js';
import { ANIMATION_IR_VERSION } from '../schema.js';

// 与 §3.1 的电容原语同构：d 是驱动量，C 是派生量。
const capacitorCorrect = {
  id: 'capacitor',
  slots: {
    d: { type: 'number', min: 0.5, max: 5, unit: 'mm' },
    S: { type: 'number', min: 1, max: 100, unit: 'cm²' },
  },
  derived: { C: 'S / d' },
  anchors: ['plate-gap'],
};

// 故意写错的公式：d 加倍时 C 反而变大 —— 物理复算必须拦下。
const capacitorWrong = { ...capacitorCorrect, derived: { C: 'S * d' } };

const OPPOSITE_D_C = [{ dependent: 'C', drivers: ['d'], direction: 'opposite' }];

/** d: 2 → 4（加倍）；C 由公式复算。 */
function capacitorIR() {
  return {
    version: ANIMATION_IR_VERSION,
    scene: 'capacitor',
    params: { d: 2, S: 1 },
    duration: 2,
    tracks: [{ slot: 'd', keys: [{ t: 0, v: 2 }, { t: 2, v: 4 }] }],
    overlays: [],
  };
}

function cuboidIR() {
  return {
    version: ANIMATION_IR_VERSION,
    scene: 'cuboid',
    params: { a: 2, b: 2, c: 2 },
    duration: 4,
    tracks: [
      { slot: 'a', keys: [{ t: 0, v: 2 }, { t: 2, v: 4 }] },
      { slot: 'b', keys: [{ t: 0, v: 2 }, { t: 4, v: 3 }] },
      { slot: 'c', keys: [{ t: 0, v: 2 }, { t: 2, v: 4 }] },
    ],
    overlays: [],
  };
}

describe('physicsGate · §9.1 物理复算', () => {
  it('「d 加倍但 C 未减半」必须 reject', () => {
    const r = physicsGate(capacitorIR(), {
      primitive: capacitorWrong,
      relations: OPPOSITE_D_C,
    });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe(PHYSICS_VERDICT.REJECT);
    expect(r.code).toBe(PHYSICS_CODE.RELATION_VIOLATED);
    expect(r.mismatches.length).toBeGreaterThan(0);
    expect(r.mismatches[0].dependent).toBe('C');
  });

  it('公式正确（d 加倍 ⇒ C 减半）时 pass', () => {
    const r = physicsGate(capacitorIR(), {
      primitive: capacitorCorrect,
      relations: OPPOSITE_D_C,
    });
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe(PHYSICS_VERDICT.PASS);
  });

  it('cuboid 单调放大的 IR 通过', () => {
    const r = physicsGate(cuboidIR());
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe(PHYSICS_VERDICT.PASS);
  });

  it('未知原语 reject', () => {
    const r = physicsGate({ ...cuboidIR(), scene: 'sphere' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(PHYSICS_CODE.UNKNOWN_PRIMITIVE);
  });

  it('derived 公式无法复算（未知标识符）reject', () => {
    const broken = { ...capacitorCorrect, derived: { C: 'EPS0 * S / d' } };
    const r = physicsGate(capacitorIR(), {
      primitive: broken,
      relations: OPPOSITE_D_C,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(PHYSICS_CODE.BAD_SAMPLE);
  });

  it('无关系声明的原语直接 pass', () => {
    const r = physicsGate(cuboidIR(), { relations: [] });
    expect(r.ok).toBe(true);
  });
});

describe('checkRelation · 纯比对函数', () => {
  it('方向相反但派生量上升 → 违反', () => {
    const samples = [
      { t: 0, params: { d: 2 }, derived: { C: 1 } },
      { t: 1, params: { d: 4 }, derived: { C: 1 } },
    ];
    const v = checkRelation(OPPOSITE_D_C[0], samples);
    expect(v.length).toBe(1);
  });

  it('方向相同且派生量上升 → 不违反', () => {
    const samples = [
      { t: 0, params: { a: 2 }, derived: { V: 8 } },
      { t: 1, params: { a: 4 }, derived: { V: 16 } },
    ];
    const v = checkRelation({ dependent: 'V', drivers: ['a'], direction: 'same' }, samples);
    expect(v).toEqual([]);
  });

  it('驱动量方向混杂 → 跳过', () => {
    const samples = [
      { t: 0, params: { a: 2, b: 4 }, derived: { V: 8 } },
      { t: 1, params: { a: 4, b: 2 }, derived: { V: 8 } },
    ];
    const v = checkRelation({ dependent: 'V', drivers: ['a', 'b'], direction: 'same' }, samples);
    expect(v).toEqual([]);
  });

  it('驱动量未变化 → 跳过', () => {
    const samples = [
      { t: 0, params: { d: 2 }, derived: { C: 1 } },
      { t: 1, params: { d: 2 }, derived: { C: 1 } },
    ];
    const v = checkRelation(OPPOSITE_D_C[0], samples);
    expect(v).toEqual([]);
  });

  it('派生量非有限值 → 跳过（由 BAD_SAMPLE 兜）', () => {
    const samples = [
      { t: 0, params: { d: 2 }, derived: { C: 1 } },
      { t: 1, params: { d: 4 }, derived: { C: NaN } },
    ];
    const v = checkRelation(OPPOSITE_D_C[0], samples);
    expect(v).toEqual([]);
  });
});
