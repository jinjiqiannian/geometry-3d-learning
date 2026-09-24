export const ANIMATION_EASE = Object.freeze({
  linear: (u) => u,
  easeIn: (u) => u * u * u,
  easeOut: (u) => 1 - Math.pow(1 - u, 3),
  easeInOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
});

function sampleTrack(track, time) {
  const keys = Array.isArray(track?.keys) ? track.keys : null;
  if (!keys || keys.length === 0) return undefined;
  if (keys.length === 1) return keys[0].v;

  if (time <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (time >= last.t) return last.v;

  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= time) i++;

  const a = keys[i];
  const b = keys[i + 1];
  const span = b.t - a.t;
  if (!(span > 0)) return b.v;

  const ease = ANIMATION_EASE[b.ease] || ANIMATION_EASE.linear;
  return a.v + (b.v - a.v) * ease((time - a.t) / span);
}

/**
 * 采样动画 IR —— 纯函数，无定时器 / 无 DOM / 无全局状态。
 * 同一 (ir, t) 多次调用结果恒等，且不修改 ir。
 * tracks[].keys 需按 t 升序（由 validateAnimationIR 保证）。
 * ease 归属「结束关键帧」：keys[i+1].ease 描述从 keys[i] 过渡到 keys[i+1] 的缓动，
 * 缺省或未知名称一律回退 linear。
 * @returns {{params:Object, overlays:Array}}
 */
export function sampleAnimationIR(ir, time) {
  if (!ir || typeof ir !== 'object') return { params: {}, overlays: [] };

  const duration = Number.isFinite(ir.duration) ? Math.max(ir.duration, 0) : 0;
  const raw = Number.isFinite(time) ? time : 0;
  const t = Math.min(Math.max(raw, 0), duration);

  const params = { ...(ir.params || {}) };
  const tracks = Array.isArray(ir.tracks) ? ir.tracks : [];
  for (const track of tracks) {
    if (!track || !track.slot) continue;
    const value = sampleTrack(track, t);
    if (value !== undefined) params[track.slot] = value;
  }

  const overlays = (Array.isArray(ir.overlays) ? ir.overlays : []).filter((o) => {
    if (!o) return false;
    const from = Number.isFinite(o.from) ? o.from : -Infinity;
    const to = Number.isFinite(o.to) ? o.to : Infinity;
    return t >= from && t <= to;
  });

  return { params, overlays };
}

export class AnimationController {
  constructor(totalSteps = 0, onStepChange, onPlayStateChange) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.isPlaying = false;
    this.playDelay = 2500;
    this.playTimer = null;
    this.onStepChange = onStepChange;
    this.onPlayStateChange = onPlayStateChange;
  }

  setTotalSteps(totalSteps) {
    this.totalSteps = totalSteps;
    if (this.currentStep >= totalSteps) {
      this.currentStep = Math.max(0, totalSteps - 1);
    }
  }

  next() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.notifyStepChange();
    }
  }

  previous() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.notifyStepChange();
    }
  }

  seek(index) {
    if (index >= 0 && index < this.totalSteps) {
      this.currentStep = index;
      this.notifyStepChange();
    }
  }

  play(delay = 2500) {
    this.playDelay = delay;
    this.isPlaying = true;
    this.notifyPlayStateChange();
    this.scheduleNextStep();
  }

  pause() {
    this.isPlaying = false;
    this.cancelTimer();
    this.notifyPlayStateChange();
  }

  getCurrentStep() {
    return this.currentStep;
  }

  isPlaying() {
    return this.isPlaying;
  }

  getTotalSteps() {
    return this.totalSteps;
  }

  scheduleNextStep() {
    this.cancelTimer();
    this.playTimer = setTimeout(() => {
      if (this.currentStep < this.totalSteps - 1) {
        this.currentStep++;
        this.notifyStepChange();
        this.scheduleNextStep();
      } else {
        this.isPlaying = false;
        this.notifyPlayStateChange();
      }
    }, this.playDelay);
  }

  cancelTimer() {
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
  }

  notifyStepChange() {
    if (this.onStepChange) {
      this.onStepChange(this.currentStep);
    }
  }

  notifyPlayStateChange() {
    if (this.onPlayStateChange) {
      this.onPlayStateChange(this.isPlaying);
    }
  }
}