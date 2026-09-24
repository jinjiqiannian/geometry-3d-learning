/**
 * 教材例题动画 IR —— 知识点「立体几何·长方体」下挂的两道例题（§5.2 离线管线）。
 *
 * 与「示范动画」同一条规矩：人手写、人签字，走 §5.2 的离线管线
 *   人起草 IR → 离线过两道闸门（validateAnimationIR + physicsGate）→ 签字 → 固化进仓库。
 * 运行时零 AI 调用；ExplorePage 把它们交给渲染器之前，仍会当场再跑一遍同样两道闸门
 * —— §8.7 / §9.1：离线来源照样过闸门，签字是**加在**闸门之后，不是豁免它。
 *
 * 例题一（体积）：1×1×1 均匀长到 5×4×3，三个维度同时放大 —— 因为三者同向增长，
 *   物理闸门在这一段是真跑到的（V / S / d 单调同向），不是整段被跳过。
 * 例题二（体对角线）：长到 2×3×6，恰好 d = √(2²+3²+6²) = 7，教科书里的整数答案。
 *
 * 注意：drei 的 Text 默认字体（Roboto）不含中文字形，标注文案只用拉丁字母与数学符号，
 * 否则会渲染成豆腐块。例题的标题/说明是页面文案（React 文本），不受此限。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §5.1 两种形态 / §5.2 离线管线
 */

import { ANIMATION_IR_VERSION } from '../../engines/animationIR/schema.js';

/** 三个维度同时从单位正方体长到目标尺寸，末段停一拍。 */
function growTogether(a, b, c) {
  const settle = 2.5;
  const duration = 4;
  const key = (v) => [{ t: 0, v: 1 }, { t: settle, v, ease: 'easeInOut' }, { t: duration, v }];
  return {
    duration,
    tracks: [
      { slot: 'a', keys: key(a) },
      { slot: 'b', keys: key(b) },
      { slot: 'c', keys: key(c) },
    ],
  };
}

const DIMENSION_LABELS = [
  { kind: 'label', text: 'a', anchor: 'edge-ab', from: 0, to: 4 },
  { kind: 'label', text: 'b', anchor: 'edge-bc', from: 0, to: 4 },
  { kind: 'label', text: 'c', anchor: 'edge-aa1', from: 0, to: 4 },
];

/** 例题一：已知长 5、宽 4、高 3，求体积（V = 60）。 */
const CUBOID_EXAMPLE_VOLUME_IR = Object.freeze({
  version: ANIMATION_IR_VERSION,
  scene: 'cuboid',
  params: { a: 1, b: 1, c: 1 },
  ...growTogether(5, 4, 3),
  overlays: [
    ...DIMENSION_LABELS,
    { kind: 'label', text: 'V = a × b × c', anchor: 'center', from: 0, to: 4 },
  ],
});

/** 例题二：已知长 2、宽 3、高 6，求体对角线（d = 7）。 */
const CUBOID_EXAMPLE_DIAGONAL_IR = Object.freeze({
  version: ANIMATION_IR_VERSION,
  scene: 'cuboid',
  params: { a: 1, b: 1, c: 1 },
  ...growTogether(2, 3, 6),
  overlays: [
    ...DIMENSION_LABELS,
    { kind: 'label', text: 'd² = a² + b² + c²', anchor: 'center', from: 0, to: 4 },
  ],
});

/**
 * 知识点页下挂的例题清单（§5.2：1–2 道）。
 * title / summary 是页面文案；ir 是过闸门的固化产物。
 */
export const CUBOID_EXAMPLES = Object.freeze([
  Object.freeze({
    id: 'cuboid-example-volume',
    title: '例题一：求体积',
    summary: '1×1×1 均匀长到 5×4×3，体积从 1 涨到 60。',
    ir: CUBOID_EXAMPLE_VOLUME_IR,
  }),
  Object.freeze({
    id: 'cuboid-example-diagonal',
    title: '例题二：求体对角线',
    summary: '1×1×1 均匀长到 2×3×6，体对角线恰好是 7。',
    ir: CUBOID_EXAMPLE_DIAGONAL_IR,
  }),
]);

export default CUBOID_EXAMPLES;
