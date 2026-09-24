import { describe, it, expect } from 'vitest';
import { computeReadouts, formatNumber } from '../readouts.js';
import { getPrimitive } from '../schema.js';

// ── formatNumber ──

describe('formatNumber', () => {
  it('抹掉浮点噪声与多余小数位', () => {
    expect(formatNumber(7.0710678118654755)).toBe('7.07');
    expect(formatNumber(3.14159, 3)).toBe('3.142');
    expect(formatNumber(60)).toBe('60');
    expect(formatNumber(0)).toBe('0');
  });

  it('拒绝非有限数：显示破折号而不是 NaN', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
    expect(formatNumber(-Infinity)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});

// ── computeReadouts ──

describe('computeReadouts · §3.1 derived 由引擎求值', () => {
  const primitive = getPrimitive('cuboid');

  it('按原语声明的 derived 逐条求值', () => {
    const r = computeReadouts(primitive, { a: 3, b: 4, c: 5 });
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(r.failures).toEqual([]);
    expect(r.values.V).toBe(60);
    expect(r.values.S).toBe(94);
    expect(r.values.diagonal).toBeCloseTo(Math.sqrt(50));
  });

  it('formulas 原样带出，供公式面板显示', () => {
    const r = computeReadouts(primitive, { a: 1, b: 1, c: 1 });
    expect(Object.keys(r.formulas).sort()).toEqual(['S', 'V', 'diagonal']);
    expect(r.formulas.V).toBe('a * b * c');
  });

  it('读数行随原语走：加一个 derived 就多一行', () => {
    const extended = {
      ...primitive,
      derived: { ...primitive.derived, faceDiag: 'sqrt(a * a + b * b)' },
    };
    const r = computeReadouts(extended, { a: 3, b: 4, c: 5 });
    expect(r.ok).toBe(true);
    expect(r.values.faceDiag).toBe(5);
    expect(Object.keys(r.formulas)).toHaveLength(4);
  });

  it('未知原语逐字说明，不静默兜底', () => {
    const r = computeReadouts(null, { a: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('未知原语');
    expect(r.values).toEqual({});
  });

  it('槽位缺失 → 该条记 failure，不拿 0 顶替', () => {
    const r = computeReadouts(primitive, { a: 2, b: 3 });
    expect(r.ok).toBe(false);
    // 三条公式都引用了 c，全都算不出；关键是值缺位，而不是被当成 0 静默顶替
    expect(r.values.V).toBeUndefined();
    expect(r.values.S).toBeUndefined();
    expect(r.values.diagonal).toBeUndefined();
    expect(r.failures.map((f) => f.key).sort()).toEqual(['S', 'V', 'diagonal']);
  });

  it('一条公式坏掉不牵连其它条目', () => {
    const mixed = { derived: { good: 'a + b', bad: 'nope * 2' } };
    const r = computeReadouts(mixed, { a: 2, b: 3 });
    expect(r.ok).toBe(false);
    expect(r.values.good).toBe(5);
    expect(r.values.bad).toBeUndefined();
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].key).toBe('bad');
  });

  it('非法表达式 → 记 failure 并带出原因', () => {
    const broken = { derived: { X: 'foo + 1' } };
    const r = computeReadouts(broken, {});
    expect(r.ok).toBe(false);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].key).toBe('X');
    expect(r.failures[0].formula).toBe('foo + 1');
    expect(r.failures[0].message).toBeTruthy();
  });

  it('原语没有 derived → 空表但不报错', () => {
    const r = computeReadouts({ derived: undefined }, {});
    expect(r.ok).toBe(true);
    expect(r.formulas).toEqual({});
    expect(r.values).toEqual({});
  });

  it('不改动传入的 params', () => {
    const params = { a: 3, b: 4, c: 5 };
    computeReadouts(primitive, params);
    expect(params).toEqual({ a: 3, b: 4, c: 5 });
  });
});
