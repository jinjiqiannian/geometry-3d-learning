/**
 * 动画 IR 的类型定义、版本号、原语注册表。
 *
 * 原语（primitive）= 一个渲染组件 + 一份「可动画槽位」声明 + 一份只读派生量声明。
 * AI 唯一能写的是 params（槽位值）和 tracks（关键帧）；derived 由引擎计算。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §3.1 原语契约
 */

export const ANIMATION_IR_VERSION = 1;

/**
 * @typedef {Object} SlotDecl
 * @property {'number'} type
 * @property {number} min
 * @property {number} max
 * @property {string} unit
 * @property {string} [label]
 */

/**
 * @typedef {Object} PrimitiveDef
 * @property {string} id
 * @property {Record<string, SlotDecl>} slots
 * @property {Record<string, string>} derived  — 表达式字符串，由 expr.js 安全求值
 * @property {string[]} anchors
 */

/**
 * @typedef {Object} KeyFrame
 * @property {number} t  秒
 * @property {number} v
 * @property {string} [ease]
 */

/**
 * @typedef {Object} Track
 * @property {string} slot
 * @property {KeyFrame[]} keys
 */

/**
 * @typedef {Object} Overlay
 * @property {string} kind
 * @property {string} text
 * @property {string} anchor
 * @property {number} [from]
 * @property {number} [to]
 */

/**
 * @typedef {Object} AnimationIR
 * @property {number} version
 * @property {string} scene  原语 id
 * @property {Object} params
 * @property {number} duration  秒
 * @property {Track[]} tracks
 * @property {Overlay[]} overlays
 */

/**
 * @returns {AnimationIR}
 */
export function createEmptyAnimationIR() {
  return {
    version: ANIMATION_IR_VERSION,
    scene: '',
    params: {},
    duration: 0,
    tracks: [],
    overlays: [],
  };
}

// ── 原语定义 ──────────────────────────────────────

/** @type {PrimitiveDef} */
const cuboidPrimitive = {
  id: 'cuboid',
  slots: {
    a: { type: 'number', min: 0.1, max: 10, unit: 'cm', label: '长' },
    b: { type: 'number', min: 0.1, max: 10, unit: 'cm', label: '宽' },
    c: { type: 'number', min: 0.1, max: 10, unit: 'cm', label: '高' },
  },
  derived: {
    V: 'a * b * c',
    S: '2 * (a * b + b * c + a * c)',
    diagonal: 'sqrt(a * a + b * b + c * c)',
  },
  anchors: [
    'face-top', 'face-bottom', 'face-front', 'face-back',
    'face-left', 'face-right',
    'edge-ab', 'edge-bc', 'edge-aa1',
    'vertex-a', 'vertex-b', 'vertex-c', 'vertex-d',
    'vertex-a1', 'vertex-b1', 'vertex-c1', 'vertex-d1',
    'center',
  ],
};

// ── 原语注册表（白名单） ──────────────────────────

const REQUIRED_DECLARATIONS = ['slots', 'derived', 'anchors'];

function hasContent(value, expectArray) {
  if (expectArray) return Array.isArray(value) && value.length > 0;
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length > 0;
}

/**
 * 原语完备性断言（§9.1）：slots / derived / anchors 三者必须同时声明，
 * 缺任一者不得注册。原语是可信层、由人手写，所以这里**直接抛错**——
 * 一个半声明的原语是写代码时的错误，应该当场炸掉，而不是被静默收下。
 *
 * @param {PrimitiveDef} primitive
 * @returns {PrimitiveDef} 原样返回，便于链式调用
 */
export function assertPrimitiveComplete(primitive) {
  if (!primitive || typeof primitive !== 'object') {
    throw new Error('原语必须是对象（§9.1）');
  }
  if (typeof primitive.id !== 'string' || primitive.id === '') {
    throw new Error('原语缺少 id（§9.1）');
  }
  for (const key of REQUIRED_DECLARATIONS) {
    if (!hasContent(primitive[key], key === 'anchors')) {
      throw new Error(`原语 "${primitive.id}" 未声明 ${key}，不得注册（§9.1）`);
    }
  }
  return primitive;
}

function buildRegistry(primitives) {
  const registry = new Map();
  for (const primitive of primitives) {
    assertPrimitiveComplete(primitive);
    registry.set(primitive.id, primitive);
  }
  return registry;
}

/** @type {Map<string, PrimitiveDef>} */
const PRIMITIVE_REGISTRY = buildRegistry([cuboidPrimitive]);

/**
 * 查原语定义；不存在返回 null。
 * @param {string} id
 * @returns {PrimitiveDef | null}
 */
export function getPrimitive(id) {
  return PRIMITIVE_REGISTRY.get(id) || null;
}

/**
 * 列出所有已注册原语 id。
 * @returns {string[]}
 */
export function listPrimitives() {
  return [...PRIMITIVE_REGISTRY.keys()];
}
