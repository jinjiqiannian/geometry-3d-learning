/**
 * 动画时钟内核 —— 纯函数，无定时器 / 无 DOM / 无全局状态。
 *
 * 唯一时钟由 useFrame 的 delta 累加驱动（设计 §6.1）：
 * 增量累加而非计次，后台节流只会让动画变慢，不会跳帧。
 * 播放 / 暂停 / 拖进度 / 变速都只是对这份状态的纯变换。
 */

const DEFAULT_RATE = 1;

function normalizeDuration(duration) {
  const d = Number(duration);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function normalizeRate(rate) {
  const r = Number(rate);
  return Number.isFinite(r) && r > 0 ? r : DEFAULT_RATE;
}

/** 把时间夹到 [0, duration]；非法输入归 0。 */
export function clampTime(time, duration) {
  const d = normalizeDuration(duration);
  const t = Number(time);
  if (!Number.isFinite(t)) return 0;
  return Math.min(Math.max(t, 0), d);
}

/**
 * @param {number} duration 秒
 * @param {{rate?:number, playing?:boolean, loop?:boolean}} [options]
 */
export function createClockState(duration = 0, options = {}) {
  return {
    time: 0,
    duration: normalizeDuration(duration),
    playing: Boolean(options.playing),
    rate: normalizeRate(options.rate),
    loop: options.loop !== false,
  };
}

/**
 * 推进时钟。未播放 / 非法 delta 时原样返回（引用不变，调用方可据此省掉后续工作）。
 */
export function advanceClock(state, deltaSeconds) {
  if (!state || !state.playing) return state;
  const delta = Number(deltaSeconds);
  if (!Number.isFinite(delta) || delta <= 0) return state;
  if (state.duration <= 0) return { ...state, time: 0, playing: false };

  const next = state.time + delta * normalizeRate(state.rate);
  if (next < state.duration) return { ...state, time: next };
  if (state.loop) return { ...state, time: next % state.duration };
  return { ...state, time: state.duration, playing: false };
}

/** 拖进度：只改时间，不改播放状态。 */
export function seekClock(state, time) {
  if (!state) return state;
  return { ...state, time: clampTime(time, state.duration) };
}

/** 播放/暂停；在末尾（非循环）按播放视为重播。 */
export function setClockPlaying(state, playing) {
  if (!state) return state;
  if (!playing) return state.playing ? { ...state, playing: false } : state;

  const atEnd = state.duration <= 0 || state.time >= state.duration;
  const restart = atEnd && state.loop === false;
  return { ...state, playing: true, time: restart ? 0 : state.time };
}

/** 变速：非正数 / 非法值一律忽略。 */
export function setClockRate(state, rate) {
  if (!state) return state;
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return state;
  return r === state.rate ? state : { ...state, rate: r };
}

/** 进度 0–1，用于进度条等展示。 */
export function clockProgress(state) {
  if (!state || !(state.duration > 0)) return 0;
  return clampTime(state.time, state.duration) / state.duration;
}
