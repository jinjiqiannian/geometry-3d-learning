/**
 * 拍题链路第二段编排器 —— 设计 §4.1 / §4.2 / §4.3 / §4.4。
 *
 * 这是 UI 唯一的动画入口。顺序固定、缺一不可：
 *   查缓存（命中即 0 次 AI 调用）
 *   → 未命中才调 api/ai/animate
 *   → validateAnimationIR（第一道：结构）
 *   → physicsGate（第二道：物理复算）
 *   → 通过才把 IR 交给渲染器
 *
 * §9「validateAnimationIR 是到达渲染器的唯一通路」由本文件兜底：
 * 除了这里的 ok:true 分支，没有任何路径能把 ir 交出去。
 */

import { getPrimitive } from '../../engines/animationIR/schema.js';
import { validateAnimationIR } from '../../engines/animationIR/validate.js';
import { physicsGate } from '../../engines/animationIR/physicsGate.js';
import { makeCacheKey, readCache, writeCache, reportInvalidation } from './animationCache.js';

export const ANIMATE_CODE = Object.freeze({
  CACHE_HIT: 'CACHE_HIT',
  NO_PRIMITIVE: 'NO_PRIMITIVE',
  NETWORK: 'NETWORK',
  UNPARSEABLE: 'UNPARSEABLE',
  BAD_STRUCTURE: 'BAD_STRUCTURE',
  PHYSICS: 'PHYSICS',
});

/** 与 services/api.ts 同一套解析规则：线上同域，本地打开发后端。 */
function resolveBaseUrl() {
  try {
    return (import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001')).replace(/\/$/, '');
  } catch {
    return '';
  }
}

/**
 * 生成动画 IR（含缓存与双闸门）。
 *
 * @param {object} options
 * @param {string} options.text        小题原文（用于缓存 key 归一化）
 * @param {object} options.sceneIR     第一段已校验的静态 SceneIR
 * @param {object} options.explainIR   已校验的 ExplainIR
 * @param {string} [options.primitiveId] 原语 id，缺省取 sceneIR.scene
 * @param {object} [options.params]    参数指纹来源，缺省取 sceneIR.params
 * @param {function} [options.fetchImpl]
 * @param {string} [options.baseUrl]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<
 *   {ok:true, ir:object, source:'cache'|'ai', key:string} |
 *   {ok:false, code:string, reason:string, key:string, details?:object}
 * >}
 */
export async function requestAnimation(options = {}) {
  const { text, sceneIR, explainIR, signal } = options;
  const primitiveId = options.primitiveId || sceneIR?.scene || sceneIR?.type;
  const params = options.params || sceneIR?.params || options.sceneIR?.size || {};
  const key = makeCacheKey(text, params);

  const primitive = getPrimitive(primitiveId);
  if (!primitive) {
    return { ok: false, code: ANIMATE_CODE.NO_PRIMITIVE, reason: `未注册的原语：${primitiveId ?? '(空)'}`, key };
  }

  // 1) 缓存优先：命中则第二次播放 0 次 AI 调用（§4.4）
  const hit = await readCache(key);
  if (hit) {
    return { ok: true, ir: hit.ir, source: 'cache', key };
  }

  // 2) 未命中才调 AI
  const fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) {
    return { ok: false, code: ANIMATE_CODE.NETWORK, reason: '当前环境不支持 fetch', key };
  }
  const baseUrl = options.baseUrl ?? resolveBaseUrl();

  let payload;
  try {
    const res = await fetchImpl(`${baseUrl}/api/ai/animate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneIR, explainIR, primitive }),
      signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, code: ANIMATE_CODE.NETWORK, reason: errBody?.error || `请求失败 (${res.status})`, key };
    }
    payload = await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return { ok: false, code: ANIMATE_CODE.NETWORK, reason: err?.message || '网络异常', key };
  }

  if (!payload?.success || !payload?.ir) {
    return { ok: false, code: ANIMATE_CODE.UNPARSEABLE, reason: payload?.error || '动画 IR 生成返回不可解析内容', key };
  }

  const ir = payload.ir;

  // 3) 第一道闸门：结构校验（§4.2② 第一道）
  const structure = validateAnimationIR(ir);
  if (!structure.ok) {
    return {
      ok: false,
      code: ANIMATE_CODE.BAD_STRUCTURE,
      reason: structure.reason || '结构校验不通过',
      gatewayCode: structure.code,
      verdict: structure.verdict,
      key,
    };
  }

  // 4) 第二道闸门：物理复算（§4.2② 第二道）
  // options.relations 是测试注入缝（与 physicsGate 同名缝一致）：仓库里目前只注册了 cuboid，
  // 其派生公式与关系表天然自洽，无法伪造出一致性冲突。
  const physics = physicsGate(ir, { primitive, relations: options.relations });
  if (!physics.ok) {
    return {
      ok: false,
      code: ANIMATE_CODE.PHYSICS,
      reason: physics.reason || '物理复算不一致',
      gatewayCode: physics.code,
      mismatches: physics.mismatches,
      key,
    };
  }

  // 5) 双闸门都过 → 写缓存 → 交出 IR
  await writeCache(key, ir, { fingerprint: key, subtitle: String(text || '').slice(0, 60) });
  return { ok: true, ir, source: 'ai', key };
}

/**
 * 共用反馈入口「这画得不对」（§4.3 一键反馈 / §4.4 作废）：
 * 同一入口既服务降级态（生成失败），也服务已渲染但画错的情况。
 */
export async function reportWrongAnimation(key, reason = '') {
  return reportInvalidation(key, reason);
}
