/**
 * 示范动画 IR —— 知识点「立体几何·长方体」的标准主线（§5.1 示范动画 · 时间轴模式）。
 *
 * 这是一条**人手写、人签字**的 IR，走 §5.2 的离线管线：
 *   人起草 IR → 离线过两道闸门（validateAnimationIR + physicsGate）→ 签字 → 固化进仓库。
 * 运行时零 AI 调用；页面在把它交给渲染器之前，仍会当场再跑一遍同样的两道闸门
 * —— §8.7 / §9.1：离线来源照样过闸门，人审是**加在**闸门之后的签字，不是豁免它。
 *
 * 主线：从一个 2×2×2 的正方体出发，逐个把长、宽、高拉长，
 * 让学生看清体积 V = 长 × 宽 × 高 里每个维度各自的贡献。
 *   t 0.0 → 1.5   长 a: 2 → 4
 *   t 1.5 → 3.0   宽 b: 2 → 3
 *   t 3.0 → 4.5   高 c: 2 → 5
 *   t 4.5 → 6.0   停一拍，留在 4 × 3 × 5
 *
 * 注意：drei 的 Text 默认字体（Roboto）不含中文字形，标注文案只用拉丁字母与数学符号，
 * 否则会渲染成豆腐块。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §5.1 两种形态 / §5.2 离线管线
 */

import { ANIMATION_IR_VERSION } from '../../engines/animationIR/schema.js';

/** @type {import('../../engines/animationIR/schema.js').AnimationIR} */
export const CUBOID_LESSON_IR = Object.freeze({
  version: ANIMATION_IR_VERSION,
  scene: 'cuboid',
  params: { a: 2, b: 2, c: 2 },
  duration: 6,
  tracks: [
    { slot: 'a', keys: [{ t: 0, v: 2 }, { t: 1.5, v: 4, ease: 'easeInOut' }, { t: 6, v: 4 }] },
    { slot: 'b', keys: [{ t: 1.5, v: 2 }, { t: 3, v: 3, ease: 'easeInOut' }, { t: 6, v: 3 }] },
    { slot: 'c', keys: [{ t: 3, v: 2 }, { t: 4.5, v: 5, ease: 'easeInOut' }, { t: 6, v: 5 }] },
  ],
  overlays: [
    { kind: 'label', text: 'a', anchor: 'edge-ab', from: 0, to: 6 },
    { kind: 'label', text: 'b', anchor: 'edge-bc', from: 0, to: 6 },
    { kind: 'label', text: 'c', anchor: 'edge-aa1', from: 0, to: 6 },
    { kind: 'label', text: 'V = a × b × c', anchor: 'center', from: 0, to: 6 },
  ],
});

export default CUBOID_LESSON_IR;
