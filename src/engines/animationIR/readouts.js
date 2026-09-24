/**
 * 派生量读数引擎 —— 探索台的「读数表 / 公式面板」都从这里取数（§5.1 实时模式）。
 *
 * 与 §3.1 一致：derived 公式由原语声明、由引擎求值，UI 只负责显示。
 * 所以本模块不依赖 React / Three，可单测；也不会自己去认识某个具体几何体，
 * 原语加一个新 derived，读数就自动多一行。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §3.1 原语契约 / §5.1 探索台
 */

import { evalExpr } from './expr.js';

/**
 * 用原语声明的 derived 公式算出全部派生量。
 *
 * 任一公式算不出来（槽位缺失、参数非有限、表达式非法）就记一条 failure，
 * 不做「缺参数就当 0」的静默兜底 —— 读数是给学生看的，算不出就得说算不出。
 *
 * @param {import('./schema.js').PrimitiveDef | null} primitive
 * @param {Record<string, number>} [params] 槽位值
 * @returns {{
 *   ok: boolean,
 *   values: Record<string, number>,
 *   formulas: Record<string, string>,
 *   failures: {key: string, formula: string, message: string}[],
 *   error: string | null,
 * }}
 */
export function computeReadouts(primitive, params = {}) {
  const formulas = { ...(primitive?.derived || {}) };

  if (!primitive) {
    return { ok: false, values: {}, formulas, failures: [], error: '未知原语' };
  }

  const vars = { ...params };
  const values = {};
  const failures = [];

  for (const [key, formula] of Object.entries(formulas)) {
    try {
      values[key] = evalExpr(formula, vars);
    } catch (e) {
      failures.push({ key, formula, message: e.message });
    }
  }

  return { ok: failures.length === 0, values, formulas, failures, error: null };
}

/**
 * 读数显示用的数值格式化：抹掉浮点噪声与多余小数位。
 * @param {number} value
 * @param {number} [digits]
 * @returns {string}
 */
export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return String(Number(value.toFixed(digits)));
}
