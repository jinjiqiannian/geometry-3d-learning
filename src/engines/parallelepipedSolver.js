/**
 * 平行六面体顶点反解 —— 由题目给的棱长与夹角算出八个顶点。
 *
 * 为什么需要它：平行六面体的顶点位置由题目参数决定，套不进"固定模板 + 按
 * size 缩放"那套。不反解的话只能画一个形状对、尺寸不对的示意图形，而页面
 * 上有测量工具 —— 量出来跟题目对不上比没有图更误导。
 *
 * 取 A 为原点、底面落在 xz 平面上（渲染器是 y 轴朝上）：
 *   B = (|AB|, 0, 0)
 *   D = (|AD|cos∠BAD, 0, |AD|sin∠BAD)
 *   C = B + D
 *   AA' = (x, y, z) 同时满足
 *     x·|AB| = |AA'||AB|cos∠BAA'        → x = |AA'|cos∠BAA'
 *     AA'·AD = x·Dx + z·Dz = |AA'||AD|cos∠DAA'
 *     y = √(|AA'|² − x² − z²)            （y 是竖直方向，由前两式定出 x、z 后反解）
 *
 * 验算（题目 AB=4, AD=3, AA'=5, ∠BAD=90°, ∠BAA'=∠DAA'=60°）：
 *   x = 5cos60° = 2.5, z = (7.5 − 0)/3 = 2.5, y = √(25 − 6.25 − 6.25) = √12.5 ≈ 3.5355
 *   与手算的 AA' = (2.5, 2.5, √12.5) 一致。
 */

import { normalizeLatexForDisplay } from './problemParser';

/**
 * 题面里的数值写法：2、2.5、2√3、√3。
 *
 * 根号必须认 —— 曾经只写 `(\d+(?:\.\d+)?)`，于是「侧棱长为 2√3」被截成 2。
 * 拿一个**错的**值去校验比拿不到值更糟：拿不到只会退回不画，拿错了会
 * 一本正经地把对的图判成错的。
 */
export const NUM_PAT = String.raw`((?:\d+(?:\.\d+)?\s*)?√\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)`;

/** 把 NUM_PAT 捕获到的字面量转成数值；认不出返回 null */
export function parseNum(raw) {
  const s = String(raw ?? '').replace(/\s+/g, '');
  if (!s) return null;
  if (!s.includes('√')) {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : null;
  }
  const [coef, rad] = s.split('√');
  const c = coef === '' ? 1 : parseFloat(coef);
  const r = parseFloat(rad);
  if (!Number.isFinite(c) || !Number.isFinite(r)) return null;
  return c * Math.sqrt(r);
}

/** 顶点到形心的目标距离：与默认 size=2 的图形同一量级，正好落在相机视野内 */
const FIT_RADIUS = 2.4;

/** 撇号的各种写法都认：' ’ ′ */
function primeFlexible(label) {
  return label.replace(/'/g, "['’′]");
}

/**
 * 取边长：AB = 4 / |AB| = 4
 *
 * 导出供 sceneIRValidator 复用 —— 校验 AI 候选场景的"数值"一项时，
 * 题目给的边长就是唯一的证据来源。复制一份会造成两处解析各自漂移。
 */
export function lengthOf(text, label) {
  const esc = primeFlexible(label);
  const re = new RegExp(
    String.raw`(?:^|[^A-Za-z0-9'])${esc}\s*\|?\s*=\s*` + NUM_PAT
  );
  const m = text.match(re);
  return m ? parseNum(m[1]) : null;
}

/**
 * 取角度：∠BAA' = 60° / ∠BAA'=∠DAA'=60°
 * 后面那种连写要认 —— 值挂在最后一个名字上，所以允许中间串若干 "∠名字="。
 *
 * 同 lengthOf，导出供 sceneIRValidator 复用。
 */
export function angleOf(text, labels) {
  for (const label of labels) {
    const esc = primeFlexible(label);
    const re = new RegExp(
      String.raw`[∠]\s*${esc}\s*=\s*(?:[∠]\s*[A-Z][A-Z0-9'’′]*\s*=\s*)*` + NUM_PAT
    );
    const m = text.match(re);
    if (m) return parseNum(m[1]);
  }
  return null;
}

/** 从题目文本里取需要的五个量；缺一个就返回 null（宁可退回示意形状，不猜） */
export function parseParallelepipedGivens(problemText) {
  const t = normalizeLatexForDisplay(problemText || '');
  const ab = lengthOf(t, 'AB');
  const ad = lengthOf(t, 'AD');
  const aa = lengthOf(t, "AA'");
  const baseAngle = angleOf(t, ['BAD', 'DAB']);
  const angleB = angleOf(t, ["BAA'", "A'AB"]);
  const angleD = angleOf(t, ["DAA'", "A'AD"]);

  if (ab == null || ad == null || aa == null) return null;
  if (baseAngle == null || angleB == null || angleD == null) return null;
  if (ab <= 0 || ad <= 0 || aa <= 0) return null;

  return { ab, ad, aa, baseAngle, angleB, angleD };
}

const rad = (deg) => (deg * Math.PI) / 180;

/**
 * 按题目参数算出八个顶点，坐标已平移到以形心为原点（相机看向原点）。
 * 返回顺序与渲染层的拓扑一致：0-3 底面 ABCD，4-7 顶面 A'B'C'D'，
 * 且 i+4 正好在 i 的正上方（顶面是底面的平移）。
 *
 * @returns {number[][]|null} 拿不到参数或参数自相矛盾（根号里为负）时返回 null
 */
export function computeParallelepipedVertices(problemText) {
  const g = parseParallelepipedGivens(problemText);
  if (!g) return null;

  const { ab, ad, aa, baseAngle, angleB, angleD } = g;

  const A = [0, 0, 0];
  const B = [ab, 0, 0];
  const D = [ad * Math.cos(rad(baseAngle)), 0, ad * Math.sin(rad(baseAngle))];
  // C = B + D，逐分量写全。曾经这里第三分量误写成 B[1] + D[1]（恒为 0），
  // 于是 C 落回 x 轴与 B 重合、底面退化成一条线 —— 而测试只断言了 A、B、D
  // 和"顶面=底面平移"，整体平移一致使得错误照样通过。别再拆开手写分量。
  const C = [B[0] + D[0], B[1] + D[1], B[2] + D[2]];

  const ax = aa * Math.cos(rad(angleB));
  // AA'·AD = ax·Dx + az·Dz = |AA'||AD|cos∠DAA'
  const az =
    D[2] !== 0
      ? (aa * ad * Math.cos(rad(angleD)) - ax * D[0]) / D[2]
      : 0;
  const rest = aa * aa - ax * ax - az * az;
  // 根号里为负说明题目数据不成立（夹角给错了），不画比画错好
  if (rest < -1e-9) return null;
  const ay = Math.sqrt(Math.max(0, rest));

  const shift = [ax, ay, az];
  const base = [A, B, C, D];
  const top = base.map((p) => [p[0] + shift[0], p[1] + shift[1], p[2] + shift[2]]);
  const raw = [...base, ...top];

  // 平移到形心为原点，否则图形会偏出画面（相机看向原点）
  const n = raw.length;
  const center = raw
    .reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
    .map((v) => v / n);
  const centered = raw.map((p) => [
    p[0] - center[0],
    p[1] - center[1],
    p[2] - center[2],
  ]);

  // 缩放到画布视野内。按真实尺寸（AB=4、AA'=5，包围盒 6.5×3.5×5.5）画会直接
  // 溢出画面 —— 相机是按 size≈2 的图形调好的，而页面上没有自动对焦。
  // 缩放保持相似：夹角、棱长之比、顶面=底面平移这些性质一个都不变，
  // 和教科书不按绝对尺寸画图是一个道理。
  const radius = Math.max(...centered.map((p) => Math.hypot(p[0], p[1], p[2])));
  const k = radius > 0 ? FIT_RADIUS / radius : 1;
  return centered.map((p) => [p[0] * k, p[1] * k, p[2] * k]);
}
