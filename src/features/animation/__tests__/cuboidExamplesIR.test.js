import { describe, it, expect } from 'vitest';
import { CUBOID_EXAMPLES } from '../cuboidExamplesIR.js';
import { ANIMATION_IR_VERSION, getPrimitive } from '../../../engines/animationIR/schema.js';
import { validateAnimationIR, VERDICT } from '../../../engines/animationIR/validate.js';
import { physicsGate } from '../../../engines/animationIR/physicsGate.js';
import { sampleAnimationIR } from '../../../engines/animationController.js';
import { evalExpr } from '../../../engines/animationIR/expr.js';

/**
 * §5.2 离线管线：教材例题也是人手写、人签字的固化产物，但「人审」是加在闸门之后的
 * 签字，不是豁免闸门。这组测试就是那份离线签字 —— 每道例题都必须自己过得了两道闸门。
 */
describe('cuboidExamplesIR · 例题固化前必须过闸门（§5.2 / §8.7）', () => {
  it('下挂 1–2 道例题，且各自有稳定 id', () => {
    expect(CUBOID_EXAMPLES.length).toBeGreaterThanOrEqual(1);
    expect(CUBOID_EXAMPLES.length).toBeLessThanOrEqual(2);
    const ids = CUBOID_EXAMPLES.map((example) => example.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CUBOID_EXAMPLES.map((example) => [example.id, example]))(
    '%s · 结构闸门 pass',
    (_id, example) => {
      const r = validateAnimationIR(example.ir);
      expect(r.verdict).toBe(VERDICT.PASS);
      expect(r.ok).toBe(true);
    },
  );

  it.each(CUBOID_EXAMPLES.map((example) => [example.id, example]))(
    '%s · 物理复算闸门 pass 且无失配',
    (_id, example) => {
      const r = physicsGate(example.ir);
      expect(r.ok).toBe(true);
      expect(r.mismatches).toEqual([]);
    },
  );

  it.each(CUBOID_EXAMPLES.map((example) => [example.id, example]))(
    '%s · 服务于长方体原语、版本对得上、且已冻结',
    (_id, example) => {
      expect(example.ir.version).toBe(ANIMATION_IR_VERSION);
      expect(example.ir.scene).toBe('cuboid');
      expect(getPrimitive(example.ir.scene)).toBeTruthy();
      expect(Object.isFrozen(example.ir)).toBe(true);
    },
  );

  it.each(CUBOID_EXAMPLES.map((example) => [example.id, example]))(
    '%s · 关键帧单调、都落在 [0, duration] 内，轨道/锚点都在白名单里',
    (_id, example) => {
      const primitive = getPrimitive(example.ir.scene);
      const { duration, tracks, overlays } = example.ir;
      expect(duration).toBeGreaterThan(0);
      for (const track of tracks) {
        expect(primitive.slots[track.slot]).toBeTruthy();
        let prev = -Infinity;
        for (const key of track.keys) {
          expect(key.t).toBeGreaterThanOrEqual(0);
          expect(key.t).toBeLessThanOrEqual(duration);
          expect(key.t).toBeGreaterThan(prev);
          prev = key.t;
        }
      }
      expect(overlays.length).toBeGreaterThan(0);
      for (const overlay of overlays) {
        expect(primitive.anchors).toContain(overlay.anchor);
        expect(overlay.text).not.toMatch(/[\u4e00-\u9fff]/);
      }
    },
  );
});

describe('cuboidExamplesIR · 例题答案与页面文案一致', () => {
  it('例题一：终点 5×4×3，体积 60、表面积 94', () => {
    const [volume] = CUBOID_EXAMPLES;
    const { params } = sampleAnimationIR(volume.ir, volume.ir.duration);
    expect(params).toEqual({ a: 5, b: 4, c: 3 });
    expect(evalExpr('a * b * c', params)).toBe(60);
    expect(evalExpr('2 * (a * b + b * c + a * c)', params)).toBe(94);
  });

  it('例题二：终点 2×3×6，体对角线恰好是 7', () => {
    const diagonal = CUBOID_EXAMPLES[1];
    const { params } = sampleAnimationIR(diagonal.ir, diagonal.ir.duration);
    expect(params).toEqual({ a: 2, b: 3, c: 6 });
    expect(evalExpr('sqrt(a * a + b * b + c * c)', params)).toBe(7);
  });

  it('三个维度同向增长的那一段，驱动量与派生量确实同向（relation same 真成立）', () => {
    for (const example of CUBOID_EXAMPLES) {
      const primitive = getPrimitive(example.ir.scene);
      const derivedKeys = Object.keys(primitive.derived);
      let prev = null;
      for (let t = 0; t <= 2.5 + 1e-9; t += 0.125) {
        const { params } = sampleAnimationIR(example.ir, t);
        const now = { ...params };
        for (const key of derivedKeys) {
          now[key] = evalExpr(primitive.derived[key], params);
        }
        if (prev) {
          for (const key of ['a', 'b', 'c', ...derivedKeys]) {
            expect(now[key]).toBeGreaterThanOrEqual(prev[key] - 1e-9);
          }
        }
        prev = now;
      }
    }
  });

  it('单位正方体起点：体积为 1，三个维度都从 1 出发', () => {
    for (const example of CUBOID_EXAMPLES) {
      const { params } = sampleAnimationIR(example.ir, 0);
      expect(params).toEqual({ a: 1, b: 1, c: 1 });
      expect(evalExpr('a * b * c', params)).toBe(1);
    }
  });
});
