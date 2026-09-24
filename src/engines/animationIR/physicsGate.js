/**
 * 物理复算闸门 —— 动画 IR 的第二道闸门（设计 §4.2②）。
 *
 * 第一道 validateAnimationIR 管「结构对不对」；这一道管「画出来说不说得通」。
 * 做法：把 IR 的 tracks 按时间均匀采样，用原语的 derived 公式复算派生量，
 * 再按人写的关系表逐段比对「驱动量变化方向」与「派生量应有的变化方向」。
 * 不一致 → reject（§9.1：`d` 加倍但 `C` 未减半 必须被拒）。
 *
 * 与 §3.1 对齐：AI 不能写 derived，派生量一律由原语公式算出。
 * 所以本闸门兜的不是「AI 算错公式」，而是
 *   ① 原语的人写公式是否真满足它自己声明的物理关系（公式回归保护）；
 *   ② IR 的驱动轨迹是否走出了让关系成立的范围（如把 d 拉向 0 使 C 发散）。
 */

import { getPrimitive } from './schema.js';
import { evalExpr } from './expr.js';
import { sampleAnimationIR } from '../animationController.js';

export const PHYSICS_VERDICT = Object.freeze({
  PASS: 'pass',
  REJECT: 'reject',
});

export const PHYSICS_CODE = Object.freeze({
  UNKNOWN_PRIMITIVE: 'UNKNOWN_PRIMITIVE',
  BAD_SAMPLE: 'BAD_SAMPLE',
  RELATION_VIOLATED: 'RELATION_VIOLATED',
});

const DEFAULT_SAMPLES = 32;
const MIN_SAMPLES = 2;
const MAX_SAMPLES = 256;
const EPS = 1e-9;

/**
 * 人写的物理关系表（D8：代码由人写，AI 不碰）。
 * direction: 'same' = 驱动量上升时派生量必须上升；'opposite' = 必须下降。
 * @type {Record<string, {dependent:string, drivers:string[], direction:'same'|'opposite'}[]>}
 */
const RELATION_TABLE = Object.freeze({
  cuboid: [
    { dependent: 'V', drivers: ['a', 'b', 'c'], direction: 'same' },
    { dependent: 'S', drivers: ['a', 'b', 'c'], direction: 'same' },
    { dependent: 'diagonal', drivers: ['a', 'b', 'c'], direction: 'same' },
  ],
});

function clampSamples(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return DEFAULT_SAMPLES;
  return Math.min(Math.max(Math.round(v), MIN_SAMPLES), MAX_SAMPLES);
}

/** 用原语公式复算全部 derived；任一公式失败返回 null。 */
function computeDerived(primitive, params) {
  const vars = { ...params };
  for (const key of Object.keys(primitive.slots)) {
    if (!(key in vars)) vars[key] = 0;
  }
  const out = {};
  for (const [name, formula] of Object.entries(primitive.derived || {})) {
    try {
      out[name] = evalExpr(formula, vars);
    } catch {
      return null;
    }
  }
  return out;
}

/**
 * 纯比对函数：给定相邻采样点，检查一条关系是否被违反。
 * 驱动量方向混杂或未变化时跳过（无法定性判断）。
 * @param {{dependent:string, drivers:string[], direction:string}} relation
 * @param {{params:Object, derived:Object}[]} samples
 * @returns {Object[]} 违反记录
 */
export function checkRelation(relation, samples) {
  const violations = [];
  const dependent = relation?.dependent;
  const drivers = Array.isArray(relation?.drivers) ? relation.drivers : [];
  if (!dependent || drivers.length === 0) return violations;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];

    let up = false;
    let down = false;
    for (const d of drivers) {
      const pv = prev.params?.[d];
      const cv = cur.params?.[d];
      if (typeof pv !== 'number' || typeof cv !== 'number') continue;
      if (cv > pv + EPS) up = true;
      else if (cv < pv - EPS) down = true;
    }
    if (!up && !down) continue;
    if (up && down) continue;

    const before = prev.derived?.[dependent];
    const after = cur.derived?.[dependent];
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;

    const expectUp = relation.direction === 'same' ? up : down;
    const ok = expectUp ? after > before + EPS : after < before - EPS;
    if (!ok) {
      violations.push({
        dependent,
        drivers,
        direction: relation.direction,
        from: { t: prev.t, value: before },
        to: { t: cur.t, value: after },
        reason: `驱动 ${drivers.join('/')} ${up ? '上升' : '下降'}，但 ${dependent} 应${
          expectUp ? '上升' : '下降'
        } 却从 ${before} 变为 ${after}`,
      });
    }
  }
  return violations;
}

/**
 * 跑物理复算闸门。
 * @param {import('./schema.js').AnimationIR} ir
 * @param {{samples?:number, primitive?:Object}} [options] primitive 仅供测试注入
 * @returns {{ok:boolean, verdict:string, code:string|null, reason:string|null, mismatches:Object[]}}
 */
export function physicsGate(ir, options = {}) {
  const primitive = options.primitive || getPrimitive(ir?.scene);
  if (!primitive) {
    return {
      ok: false,
      verdict: PHYSICS_VERDICT.REJECT,
      code: PHYSICS_CODE.UNKNOWN_PRIMITIVE,
      reason: `未知原语: ${ir?.scene}`,
      mismatches: [],
    };
  }

  const relations = options.relations || RELATION_TABLE[primitive.id] || [];
  const duration = Number.isFinite(ir?.duration) ? Math.max(ir.duration, 0) : 0;

  if (relations.length === 0) {
    return {
      ok: true,
      verdict: PHYSICS_VERDICT.PASS,
      code: null,
      reason: null,
      mismatches: [],
    };
  }

  const count = clampSamples(options.samples);
  const samples = [];
  for (let i = 0; i < count; i++) {
    const t = duration === 0 ? 0 : (duration * i) / (count - 1);
    const { params } = sampleAnimationIR(ir, t);
    const derived = computeDerived(primitive, params);
    if (derived === null) {
      return {
        ok: false,
        verdict: PHYSICS_VERDICT.REJECT,
        code: PHYSICS_CODE.BAD_SAMPLE,
        reason: `原语 "${primitive.id}" 的 derived 公式在 t=${t} 处无法复算`,
        mismatches: [],
      };
    }
    samples.push({ t, params, derived });
  }

  const mismatches = [];
  for (const relation of relations) {
    mismatches.push(...checkRelation(relation, samples));
  }

  if (mismatches.length > 0) {
    return {
      ok: false,
      verdict: PHYSICS_VERDICT.REJECT,
      code: PHYSICS_CODE.RELATION_VIOLATED,
      reason: mismatches[0].reason,
      mismatches,
    };
  }

  return {
    ok: true,
    verdict: PHYSICS_VERDICT.PASS,
    code: null,
    reason: null,
    mismatches: [],
  };
}
