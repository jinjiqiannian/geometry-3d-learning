import { describe, it, expect } from 'vitest';
import { evalExpr, isValidExpr } from '../expr.js';
import { validateAnimationIR, VERDICT } from '../validate.js';
import {
  getPrimitive, listPrimitives, ANIMATION_IR_VERSION, createEmptyAnimationIR,
  assertPrimitiveComplete,
} from '../schema.js';

// ── expr ──

describe('evalExpr', () => {
  it('基础四则', () => {
    expect(evalExpr('1 + 2')).toBe(3);
    expect(evalExpr('3 - 1')).toBe(2);
    expect(evalExpr('2 * 3')).toBe(6);
    expect(evalExpr('6 / 2')).toBe(3);
  });

  it('幂运算右结合', () => {
    expect(evalExpr('2 ** 3')).toBe(8);
    expect(evalExpr('2 ** 3 ** 2')).toBe(512); // 2**(3**2)=2**9=512
  });

  it('一元负号', () => {
    expect(evalExpr('-5')).toBe(-5);
    expect(evalExpr('-(2 + 3)')).toBe(-5);
    expect(evalExpr('2 * -3')).toBe(-6);
  });

  it('括号优先级', () => {
    expect(evalExpr('(1 + 2) * 3')).toBe(9);
    expect(evalExpr('1 + 2 * 3')).toBe(7);
  });

  it('变量替换', () => {
    expect(evalExpr('a * b * c', { a: 2, b: 3, c: 4 })).toBe(24);
  });

  it('白名单函数', () => {
    expect(evalExpr('sqrt(4)')).toBe(2);
    expect(evalExpr('abs(-3)')).toBe(3);
    expect(evalExpr('max(1, 2)')).toBe(2);
    expect(evalExpr('min(1, 2)')).toBe(1);
    expect(evalExpr('pow(2, 3)')).toBe(8);
  });

  it('常量', () => {
    expect(evalExpr('PI')).toBeCloseTo(Math.PI);
    expect(evalExpr('E')).toBeCloseTo(Math.E);
  });

  it('复合表达式', () => {
    expect(evalExpr('2 * (a * b + b * c + a * c)', { a: 2, b: 3, c: 4 })).toBe(52);
    expect(evalExpr('sqrt(a * a + b * b + c * c)', { a: 2, b: 3, c: 4 })).toBeCloseTo(Math.sqrt(29));
  });

  it('未知标识符抛错', () => {
    expect(() => evalExpr('foo + 1')).toThrow('未知标识符');
  });

  it('未知函数抛错', () => {
    expect(() => evalExpr('hack(1)')).toThrow('未知函数');
  });

  it('空表达式抛错', () => {
    expect(() => evalExpr('')).toThrow();
    expect(() => evalExpr('   ')).toThrow();
  });

  it('非法字符抛错', () => {
    expect(() => evalExpr('1;2')).toThrow();
    expect(() => evalExpr('eval("1")')).toThrow();
  });

  it('isValidExpr', () => {
    expect(isValidExpr('1 + 2 * 3')).toBe(true);
    expect(isValidExpr('a * b * c', { a: 1, b: 1, c: 1 })).toBe(true);
    expect(isValidExpr('foo +')).toBe(false);
  });
});

// ── schema ──

describe('schema', () => {
  it('cuboid 已注册', () => {
    const p = getPrimitive('cuboid');
    expect(p).not.toBeNull();
    expect(p.slots).toHaveProperty('a');
    expect(p.slots).toHaveProperty('b');
    expect(p.slots).toHaveProperty('c');
  });

  it('listPrimitives 包含 cuboid', () => {
    expect(listPrimitives()).toContain('cuboid');
  });

  it('未注册原语返回 null', () => {
    expect(getPrimitive('sphere')).toBeNull();
  });

  it('createEmptyAnimationIR 版本正确', () => {
    const ir = createEmptyAnimationIR();
    expect(ir.version).toBe(ANIMATION_IR_VERSION);
  });
});

// ── §9.1 原语注册约束 ──

describe('assertPrimitiveComplete（§9.1 缺一不得注册）', () => {
  const complete = () => ({
    id: 'probe',
    slots: { a: { type: 'number', min: 0, max: 1, unit: 'cm' } },
    derived: { V: 'a * a * a' },
    anchors: ['center'],
  });

  it('三者齐备 → 原样返回', () => {
    const p = complete();
    expect(assertPrimitiveComplete(p)).toBe(p);
  });

  it('真实 cuboid 原语本身合格', () => {
    expect(() => assertPrimitiveComplete(getPrimitive('cuboid'))).not.toThrow();
  });

  it.each(['slots', 'derived', 'anchors'])('缺 %s → 抛错且点名该字段', (key) => {
    const p = complete();
    delete p[key];
    expect(() => assertPrimitiveComplete(p)).toThrow(key);
  });

  it.each(['slots', 'derived'])('空的 %s（{}）也算未声明', (key) => {
    const p = complete();
    p[key] = {};
    expect(() => assertPrimitiveComplete(p)).toThrow(key);
  });

  it('空 anchors 数组也算未声明', () => {
    const p = complete();
    p.anchors = [];
    expect(() => assertPrimitiveComplete(p)).toThrow('anchors');
  });

  it('非对象 → 抛错', () => {
    expect(() => assertPrimitiveComplete(null)).toThrow();
    expect(() => assertPrimitiveComplete('cuboid')).toThrow();
  });

  it('缺少 id → 抛错', () => {
    const p = complete();
    delete p.id;
    expect(() => assertPrimitiveComplete(p)).toThrow('id');
  });
});

// ── validate ──

describe('validateAnimationIR', () => {
  const validCuboidIR = {
    version: ANIMATION_IR_VERSION,
    scene: 'cuboid',
    params: { a: 2, b: 3, c: 4 },
    duration: 4,
    tracks: [
      { slot: 'a', keys: [{ t: 0, v: 2 }, { t: 1.5, v: 1, ease: 'easeInOut' }] },
    ],
    overlays: [
      { kind: 'label', text: 'V = abc', anchor: 'center', from: 0.5, to: 3 },
    ],
  };

  it('合法 IR 返回 pass', () => {
    const r = validateAnimationIR(validCuboidIR);
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe(VERDICT.PASS);
  });

  it('非对象 reject', () => {
    const r = validateAnimationIR(null);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('BAD_STRUCTURE');
  });

  it('版本不匹配 reject', () => {
    const r = validateAnimationIR({ ...validCuboidIR, version: 99 });
    expect(r.code).toBe('BAD_VERSION');
  });

  it('未知原语 reject', () => {
    const r = validateAnimationIR({ ...validCuboidIR, scene: 'sphere' });
    expect(r.code).toBe('UNKNOWN_PRIMITIVE');
  });

  it('param 超范围 reject', () => {
    const r = validateAnimationIR({ ...validCuboidIR, params: { a: 99, b: 3, c: 4 } });
    expect(r.code).toBe('PARAM_OUT_OF_RANGE');
  });

  it('未知槽位 reject', () => {
    const r = validateAnimationIR({ ...validCuboidIR, params: { a: 2, b: 3, c: 4, x: 5 } });
    expect(r.code).toBe('UNKNOWN_SLOT');
  });

  it('duration 为 0 + 有 tracks reject', () => {
    const r = validateAnimationIR({ ...validCuboidIR, duration: 0 });
    expect(r.code).toBe('ZERO_DURATION');
  });

  it('关键帧非单调 reject', () => {
    const ir = {
      ...validCuboidIR,
      tracks: [{ slot: 'a', keys: [{ t: 0, v: 2 }, { t: 1, v: 1 }, { t: 0.5, v: 3 }] }],
    };
    const r = validateAnimationIR(ir);
    expect(r.code).toBe('NON_MONOTONIC');
  });

  it('track slot 不存在 reject', () => {
    const ir = {
      ...validCuboidIR,
      tracks: [{ slot: 'radius', keys: [{ t: 0, v: 1 }] }],
    };
    const r = validateAnimationIR(ir);
    expect(r.code).toBe('UNKNOWN_SLOT');
  });

  it('未知锚点 reject', () => {
    const ir = {
      ...validCuboidIR,
      overlays: [{ kind: 'label', text: 'x', anchor: 'nowhere' }],
    };
    const r = validateAnimationIR(ir);
    expect(r.code).toBe('UNKNOWN_ANCHOR');
  });

  it('空 tracks + 空 overlays + duration 0 pass', () => {
    const ir = {
      version: ANIMATION_IR_VERSION,
      scene: 'cuboid',
      params: { a: 2, b: 3, c: 4 },
      duration: 0,
      tracks: [],
      overlays: [],
    };
    const r = validateAnimationIR(ir);
    expect(r.ok).toBe(true);
  });

  it('degrade: overlay from > to', () => {
    const ir = {
      ...validCuboidIR,
      overlays: [{ kind: 'label', text: 'x', anchor: 'center', from: 3, to: 1 }],
    };
    const r = validateAnimationIR(ir);
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe(VERDICT.DEGRADE);
  });
});
