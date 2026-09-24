import { describe, it, expect } from 'vitest';
import {
  advanceClock,
  clampTime,
  clockProgress,
  createClockState,
  seekClock,
  setClockPlaying,
  setClockRate,
} from '../clock';

describe('createClockState', () => {
  it('默认：时间 0、未播放、速率 1、循环', () => {
    const s = createClockState(4);
    expect(s).toMatchObject({ time: 0, duration: 4, playing: false, rate: 1, loop: true });
  });

  it('非法时长归 0，非法速率归 1', () => {
    expect(createClockState(-3).duration).toBe(0);
    expect(createClockState('abc').duration).toBe(0);
    expect(createClockState(2, { rate: 0 }).rate).toBe(1);
    expect(createClockState(2, { rate: -2 }).rate).toBe(1);
  });

  it('loop:false 被保留', () => {
    expect(createClockState(2, { loop: false }).loop).toBe(false);
  });
});

describe('advanceClock', () => {
  it('未播放时原样返回（引用不变）', () => {
    const s = createClockState(4);
    expect(advanceClock(s, 0.5)).toBe(s);
  });

  it('按 delta 累加', () => {
    const s = setClockPlaying(createClockState(4), true);
    const next = advanceClock(s, 0.25);
    expect(next.time).toBeCloseTo(0.25, 10);
    expect(next.playing).toBe(true);
  });

  it('多次小步累加单调递增', () => {
    let s = setClockPlaying(createClockState(4), true);
    let last = 0;
    for (let i = 0; i < 20; i++) {
      s = advanceClock(s, 1 / 60);
      expect(s.time).toBeGreaterThanOrEqual(last);
      last = s.time;
    }
    expect(s.time).toBeCloseTo(20 / 60, 6);
  });

  it('速率放大 delta', () => {
    const s = setClockRate(setClockPlaying(createClockState(4), true), 2);
    expect(advanceClock(s, 0.5).time).toBeCloseTo(1, 10);
  });

  it('非法 / 非正 delta 原样返回', () => {
    const s = setClockPlaying(createClockState(4), true);
    expect(advanceClock(s, 0)).toBe(s);
    expect(advanceClock(s, -1)).toBe(s);
    expect(advanceClock(s, NaN)).toBe(s);
  });

  it('非循环到末尾：停在 duration 并自动暂停', () => {
    const s = setClockPlaying(createClockState(2, { loop: false }), true);
    const next = advanceClock(s, 5);
    expect(next.time).toBe(2);
    expect(next.playing).toBe(false);
  });

  it('循环模式越界回卷（取模）', () => {
    const s = setClockPlaying(createClockState(2), true);
    expect(advanceClock(s, 2.5).time).toBeCloseTo(0.5, 10);
    expect(advanceClock(s, 4).time).toBeCloseTo(0, 10);
  });

  it('时长为 0 时立即停止在 0', () => {
    const s = setClockPlaying(createClockState(0), true);
    const next = advanceClock(s, 0.5);
    expect(next.time).toBe(0);
    expect(next.playing).toBe(false);
  });

  it('不修改入参', () => {
    const s = setClockPlaying(createClockState(4), true);
    advanceClock(s, 1);
    expect(s.time).toBe(0);
  });
});

describe('seekClock / setClockPlaying / setClockRate', () => {
  it('seek 夹到 [0, duration] 且不改播放状态', () => {
    const s = setClockPlaying(createClockState(4), true);
    expect(seekClock(s, 9).time).toBe(4);
    expect(seekClock(s, -9).time).toBe(0);
    expect(seekClock(s, NaN).time).toBe(0);
    expect(seekClock(s, 1.5).playing).toBe(true);
  });

  it('已暂停时再置暂停：引用不变', () => {
    const s = createClockState(4);
    expect(setClockPlaying(s, false)).toBe(s);
  });

  it('非循环播完后按播放 → 从头重播', () => {
    let s = setClockPlaying(createClockState(2, { loop: false }), true);
    s = advanceClock(s, 5);
    expect(s.playing).toBe(false);
    const replay = setClockPlaying(s, true);
    expect(replay.playing).toBe(true);
    expect(replay.time).toBe(0);
  });

  it('循环模式按播放不重置时间', () => {
    const s = seekClock(setClockPlaying(createClockState(2), true), 1.2);
    expect(setClockPlaying(s, true).time).toBeCloseTo(1.2, 10);
  });

  it('速率非法值被忽略', () => {
    const s = createClockState(4);
    expect(setClockRate(s, 0)).toBe(s);
    expect(setClockRate(s, -1)).toBe(s);
    expect(setClockRate(s, 'x')).toBe(s);
    expect(setClockRate(s, 1.5).rate).toBe(1.5);
  });
});

describe('clampTime / clockProgress', () => {
  it('clampTime 兜底', () => {
    expect(clampTime(5, 2)).toBe(2);
    expect(clampTime(-5, 2)).toBe(0);
    expect(clampTime('x', 2)).toBe(0);
  });

  it('clockProgress 0–1，时长为 0 时为 0', () => {
    expect(clockProgress(seekClock(createClockState(4), 1))).toBeCloseTo(0.25, 10);
    expect(clockProgress(createClockState(0))).toBe(0);
    expect(clockProgress(null)).toBe(0);
  });
});
