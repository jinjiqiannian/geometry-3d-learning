import { describe, it, expect } from 'vitest';
import { CUBOID_LESSON_IR } from '../cuboidLessonIR.js';
import { ANIMATION_IR_VERSION, getPrimitive } from '../../../engines/animationIR/schema.js';
import { validateAnimationIR, VERDICT } from '../../../engines/animationIR/validate.js';
import { physicsGate } from '../../../engines/animationIR/physicsGate.js';
import { sampleAnimationIR } from '../../../engines/animationController.js';
import { evalExpr } from '../../../engines/animationIR/expr.js';

/**
 * §5.2 离线管线：这条 IR 是人手写、人签字的，但「人审」是加在闸门之后的签字，
 * 不是豁免闸门。所以固化的 IR 必须本身就过得了两道闸门 —— 这组测试就是那份离线签字。
 */
describe('cuboidLessonIR · 手写示范 IR 固化前必须过闸门（§5.2 / §8.7）', () => {
  it('结构闸门 pass', () => {
    const r = validateAnimationIR(CUBOID_LESSON_IR);
    expect(r.verdict).toBe(VERDICT.PASS);
    expect(r.ok).toBe(true);
  });

  it('物理复算闸门 pass', () => {
    const r = physicsGate(CUBOID_LESSON_IR);
    expect(r.ok).toBe(true);
    expect(r.mismatches).toEqual([]);
  });

  it('声明自己服务于长方体原语，且版本对得上', () => {
    expect(CUBOID_LESSON_IR.version).toBe(ANIMATION_IR_VERSION);
    expect(CUBOID_LESSON_IR.scene).toBe('cuboid');
    expect(getPrimitive(CUBOID_LESSON_IR.scene)).toBeTruthy();
  });

  it('冻结后不可被就地改写', () => {
    expect(Object.isFrozen(CUBOID_LESSON_IR)).toBe(true);
  });

  it('关键帧单调、且都落在 [0, duration] 内', () => {
    const { duration, tracks } = CUBOID_LESSON_IR;
    expect(duration).toBeGreaterThan(0);
    for (const track of tracks) {
      expect(track.keys.length).toBeGreaterThan(0);
      let prev = -Infinity;
      for (const key of track.keys) {
        expect(key.t).toBeGreaterThanOrEqual(0);
        expect(key.t).toBeLessThanOrEqual(duration);
        expect(key.t).toBeGreaterThan(prev);
        prev = key.t;
      }
    }
  });

  it('每个轨道都指向原语声明过的槽位', () => {
    const primitive = getPrimitive(CUBOID_LESSON_IR.scene);
    for (const track of CUBOID_LESSON_IR.tracks) {
      expect(primitive.slots[track.slot]).toBeTruthy();
    }
  });

  it('每个标注的锚点都在白名单内', () => {
    const primitive = getPrimitive(CUBOID_LESSON_IR.scene);
    expect(CUBOID_LESSON_IR.overlays.length).toBeGreaterThan(0);
    for (const overlay of CUBOID_LESSON_IR.overlays) {
      expect(primitive.anchors).toContain(overlay.anchor);
    }
  });

  it('标注文案不含中文 —— drei 默认字体无中文字形（§豆腐块）', () => {
    for (const overlay of CUBOID_LESSON_IR.overlays) {
      expect(overlay.text).not.toMatch(/[\u4e00-\u9fff]/);
    }
  });
});

describe('cuboidLessonIR · 主线与页面文案一致', () => {
  it('起点 2×2×2 体积为 8', () => {
    const { params } = sampleAnimationIR(CUBOID_LESSON_IR, 0);
    expect(params).toEqual({ a: 2, b: 2, c: 2 });
    expect(evalExpr('a * b * c', params)).toBe(8);
  });

  it('终点 4×3×5 体积为 60（对应「体积从 8 涨到 60」）', () => {
    const { params } = sampleAnimationIR(CUBOID_LESSON_IR, CUBOID_LESSON_IR.duration);
    expect(params).toEqual({ a: 4, b: 3, c: 5 });
    expect(evalExpr('a * b * c', params)).toBe(60);
  });

  it('三个维度依次展开，不在同一刻同时拉长', () => {
    const atStart = sampleAnimationIR(CUBOID_LESSON_IR, 0).params;
    const midA = sampleAnimationIR(CUBOID_LESSON_IR, 1.5).params;
    const midB = sampleAnimationIR(CUBOID_LESSON_IR, 3).params;
    // a 先动、b 后动、c 最后动
    expect(midA.a).toBeGreaterThan(atStart.a);
    expect(midA.b).toBe(atStart.b);
    expect(midB.b).toBeGreaterThan(midA.b);
    expect(midB.c).toBe(midA.c);
    expect(sampleAnimationIR(CUBOID_LESSON_IR, 4.5).params.c).toBe(5);
  });

  it('体积在整条时间轴上单调不减（物理关系 same）', () => {
    let prev = -Infinity;
    for (let t = 0; t <= CUBOID_LESSON_IR.duration; t += 0.25) {
      const v = evalExpr('a * b * c', sampleAnimationIR(CUBOID_LESSON_IR, t).params);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});
