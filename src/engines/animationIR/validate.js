/**
 * 动画 IR 闸门 —— AI 产出的动画 IR 进入渲染器之前的唯一关卡。
 *
 * 校验四类（与 scene-ir-core 的 validation gate 对齐）：
 *   结构：原语白名单 / 槽位 / 锚点 / 字段完备
 *   数值：params 落在声明范围内
 *   退化：时长为 0 / 关键帧非单调 / 引用不存在的槽位或锚点
 *   声明：derived 表达式可解析（第二道闸门前置检查）
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §4.2
 */

import { ANIMATION_IR_VERSION, getPrimitive } from './schema.js';
import { evalExpr } from './expr.js';

export const VERDICT = Object.freeze({
  PASS: 'pass',
  DEGRADE: 'degrade',
  REJECT: 'reject',
});

/**
 * @param {*} ir
 * @returns {{ok:boolean, verdict:string, code:string|null, reason:string|null}}
 */
export function validateAnimationIR(ir) {
  let code = null;
  let reason = null;
  const degrade = [];

  const reject = (c, r) => { code = c; reason = r; };
  const degradeNote = (r) => degrade.push(r);

  // ── 顶层结构 ──
  if (!ir || typeof ir !== 'object') {
    return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_STRUCTURE', reason: 'IR 不是对象' };
  }

  if (ir.version !== ANIMATION_IR_VERSION) {
    return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_VERSION',
      reason: `version 期望 ${ANIMATION_IR_VERSION}，得到 ${ir.version}` };
  }

  // ── 原语白名单 ──
  const primitive = getPrimitive(ir.scene);
  if (!primitive) {
    return { ok: false, verdict: VERDICT.REJECT, code: 'UNKNOWN_PRIMITIVE',
      reason: `未知原语: ${ir.scene}` };
  }

  // ── params ──
  const params = ir.params || {};
  if (typeof params !== 'object' || Array.isArray(params)) {
    return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_PARAMS', reason: 'params 不是对象' };
  }

  for (const [key, val] of Object.entries(params)) {
    const slot = primitive.slots[key];
    if (!slot) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'UNKNOWN_SLOT',
        reason: `param "${key}" 不在原语 "${primitive.id}" 的槽位声明中` };
    }
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_PARAM_TYPE',
        reason: `param "${key}" 不是有限数值` };
    }
    if (val < slot.min || val > slot.max) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'PARAM_OUT_OF_RANGE',
        reason: `param "${key}" = ${val} 超出范围 [${slot.min}, ${slot.max}]` };
    }
  }

  // ── duration ──
  const duration = ir.duration;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
    return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_DURATION',
      reason: `duration 不是非负有限数值` };
  }
  if (duration === 0 && (ir.tracks?.length > 0 || ir.overlays?.length > 0)) {
    return { ok: false, verdict: VERDICT.REJECT, code: 'ZERO_DURATION',
      reason: '有 tracks/overlays 但 duration 为 0' };
  }

  // ── tracks ──
  const tracks = Array.isArray(ir.tracks) ? ir.tracks : [];
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (!track || typeof track !== 'object') {
      return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_TRACK',
        reason: `tracks[${i}] 不是对象` };
    }
    if (!track.slot || typeof track.slot !== 'string') {
      return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_TRACK',
        reason: `tracks[${i}] 缺少 slot` };
    }
    if (!primitive.slots[track.slot]) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'UNKNOWN_SLOT',
        reason: `tracks[${i}].slot = "${track.slot}" 不在原语槽位中` };
    }
    const keys = track.keys;
    if (!Array.isArray(keys) || keys.length === 0) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'EMPTY_TRACK',
        reason: `tracks[${i}].keys 为空` };
    }
    // 关键帧时间严格单调递增
    for (let j = 0; j < keys.length; j++) {
      const k = keys[j];
      if (!k || typeof k.t !== 'number' || typeof k.v !== 'number') {
        return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_KEYFRAME',
          reason: `tracks[${i}].keys[${j}] 的 t 或 v 不是数值` };
      }
      if (j > 0 && k.t <= keys[j - 1].t) {
        return { ok: false, verdict: VERDICT.REJECT, code: 'NON_MONOTONIC',
          reason: `tracks[${i}].keys[${j}].t=${k.t} 不大于前一个 t=${keys[j-1].t}` };
      }
      if (k.t < 0 || k.t > duration) {
        degradeNote(`tracks[${i}].keys[${j}].t=${k.t} 超出 [0, ${duration}]`);
      }
    }
  }

  // ── overlays ──
  const overlays = Array.isArray(ir.overlays) ? ir.overlays : [];
  const anchorSet = new Set(primitive.anchors);
  for (let i = 0; i < overlays.length; i++) {
    const ov = overlays[i];
    if (!ov || typeof ov !== 'object') {
      return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_OVERLAY',
        reason: `overlays[${i}] 不是对象` };
    }
    if (!ov.kind || typeof ov.kind !== 'string') {
      return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_OVERLAY',
        reason: `overlays[${i}] 缺少 kind` };
    }
    if (!ov.anchor || !anchorSet.has(ov.anchor)) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'UNKNOWN_ANCHOR',
        reason: `overlays[${i}].anchor = "${ov.anchor}" 不在原语锚点白名单中` };
    }
    const from = ov.from ?? 0;
    const to = ov.to ?? duration;
    if (typeof from !== 'number' || typeof to !== 'number') {
      degradeNote(`overlays[${i}].from/to 不是数值`);
    } else if (from > to) {
      degradeNote(`overlays[${i}].from=${from} > to=${to}`);
    }
  }

  // ── derived 表达式可解析 ──
  const derived = primitive.derived || {};
  for (const [name, formula] of Object.entries(derived)) {
    try {
      // 用 params 构造 vars，再补零防止未声明变量报错
      const vars = { ...params };
      for (const slotKey of Object.keys(primitive.slots)) {
        if (!(slotKey in vars)) vars[slotKey] = 0;
      }
      evalExpr(formula, vars);
    } catch (e) {
      return { ok: false, verdict: VERDICT.REJECT, code: 'BAD_DERIVED',
        reason: `derived "${name}" 表达式 "${formula}" 解析失败: ${e.message}` };
    }
  }

  if (code !== null) {
    return { ok: false, verdict: VERDICT.REJECT, code, reason };
  }
  return {
    ok: true,
    verdict: degrade.length ? VERDICT.DEGRADE : VERDICT.PASS,
    code: null,
    reason: null,
  };
}
