/**
 * 原语渲染注册表 —— 把 schema.js 的白名单 id 映射到人手写的渲染组件。
 *
 * AI 永远只出 IR，几何代码全部由人维护；未在 schema 里声明的 id
 * 不可能出现在已通过校验的 IR 里，这里查不到组件时渲染器直接不画。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §3.1 原语契约
 */
import Cuboid from './Cuboid';

const PRIMITIVE_COMPONENTS = new Map([['cuboid', Cuboid]]);

/** 查原语渲染组件；尚未实现渲染的原语返回 null。 */
export function getPrimitiveComponent(id) {
  return PRIMITIVE_COMPONENTS.get(id) || null;
}

export { Cuboid };
