/**
 * LogicIR — 排列组合 / 概率的「理解真相层」
 *
 * 对标 SceneIR：AI 只产出本结构，前端只按本结构渲染。
 * AI 不得直接控制树图/高亮；渲染器只读 LogicIR。
 *
 * MVP 题型（仅这三类）：
 *   - multiply_add   分步乘法 / 分类加法（为什么乘、为什么加）
 *   - perm_comb      排列 vs 组合（有序 / 无序）
 *   - classical_prob 古典概率 + 简单条件（树形图）
 */

export const LOGIC_IR_VERSION = 1;

/** @typedef {'multiply_add' | 'perm_comb' | 'classical_prob'} LogicProblemType */

/**
 * @typedef {Object} LogicNode
 * @property {string} id
 * @property {string} label          展示文案，如「第1步：选组长」
 * @property {number} [count]        该步可选数 / 分支权重
 * @property {'choice'|'case'|'outcome'|'multiply'|'add'} kind
 * @property {string[]} [children]   子节点 id
 * @property {string} [why]          一句话：为什么这样选 / 为什么乘
 */

/**
 * @typedef {Object} LogicStep
 * @property {number} index
 * @property {string} title
 * @property {string} content        学生可读讲解
 * @property {string} [why]          「为什么」——核心教学点
 * @property {'multiply'|'add'|'permute'|'combine'|'divide'|'conclude'} [op]
 * @property {string} [formula]      如 C(5,2)=10
 * @property {string[]} [highlightNodeIds]  与树图联动
 */

/**
 * @typedef {Object} LogicIR
 * @property {number} version
 * @property {LogicProblemType} problemType
 * @property {string} goal                 求什么
 * @property {string} [coreIdea]           一句话核心思路
 * @property {LogicNode[]} nodes           逻辑树节点
 * @property {string} [rootId]
 * @property {LogicStep[]} steps
 * @property {string} [answer]
 * @property {string} [answerLatex]
 */

export const PROBLEM_TYPES = Object.freeze([
  'multiply_add',
  'perm_comb',
  'classical_prob',
]);

/** @returns {LogicIR} */
export function createEmptyLogicIR(problemType = 'multiply_add') {
  return {
    version: LOGIC_IR_VERSION,
    problemType,
    goal: '',
    coreIdea: '',
    nodes: [],
    rootId: null,
    steps: [],
    answer: '',
    answerLatex: '',
  };
}

/**
 * 轻量校验：结构能渲染即可，不追求数学完备。
 * @param {unknown} ir
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateLogicIR(ir) {
  const errors = [];
  if (!ir || typeof ir !== 'object') {
    return { ok: false, errors: ['LogicIR 为空'] };
  }
  const obj = /** @type {LogicIR} */ (ir);
  if (obj.version !== LOGIC_IR_VERSION) {
    errors.push(`version 应为 ${LOGIC_IR_VERSION}`);
  }
  if (!obj.problemType || typeof obj.problemType !== 'string') {
    errors.push('problemType 缺失');
  }
  if (!Array.isArray(obj.nodes)) errors.push('nodes 必须是数组');
  if (!Array.isArray(obj.steps)) errors.push('steps 必须是数组');
  if (obj.nodes?.length && obj.rootId) {
    const ids = new Set(obj.nodes.map((n) => n.id));
    if (!ids.has(obj.rootId)) errors.push(`rootId 不存在: ${obj.rootId}`);
    for (const n of obj.nodes) {
      for (const c of n.children || []) {
        if (!ids.has(c)) errors.push(`节点 ${n.id} 子节点缺失: ${c}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

// ─── MVP 样例（真题风格，供渲染 / 引擎对照）────────────────

/** 例1：分步乘法 — 从 5 人选正副组长 */
export const EXAMPLE_MULTIPLY_ADD = Object.freeze({
  version: 1,
  problemType: 'multiply_add',
  goal: '从 5 人选正、副组长各 1 人，有多少种选法？',
  coreIdea: '有顺序：先正后副，两步相乘（分步乘法）。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '选正副组长',
      kind: 'choice',
      children: ['step1', 'step2'],
      why: '职位不同 → 有序 → 用乘法，不用组合',
    },
    {
      id: 'step1',
      label: '选正组长',
      count: 5,
      kind: 'choice',
      children: [],
      why: '5 人都可以当正组长',
    },
    {
      id: 'step2',
      label: '选副组长',
      count: 4,
      kind: 'choice',
      children: [],
      why: '正组长已定，剩 4 人',
    },
  ],
  steps: [
    {
      index: 1,
      title: '判断：有序还是无序？',
      content: '正组长与副组长职责不同，人选对调算两种，属于有序。',
      why: '职位不同 → 排列思想 / 分步乘法',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '第 1 步',
      content: '选正组长：5 种。',
      why: '每人都能当正组长',
      op: 'multiply',
      formula: '5',
      highlightNodeIds: ['step1'],
    },
    {
      index: 3,
      title: '第 2 步',
      content: '选副组长：4 种。',
      why: '不能与正组长重复',
      op: 'multiply',
      formula: '4',
      highlightNodeIds: ['step2'],
    },
    {
      index: 4,
      title: '合并',
      content: '分步完成一件事 → 乘法：5 × 4 = 20。',
      why: '「分步」用乘，「分类」才用加',
      op: 'conclude',
      formula: '5×4=20',
      highlightNodeIds: ['root', 'step1', 'step2'],
    },
  ],
  answer: '20',
  answerLatex: '20',
});

/** 例2：排列 vs 组合 — 从 5 人选 2 人当代表（无职位差别） */
export const EXAMPLE_PERM_COMB = Object.freeze({
  version: 1,
  problemType: 'perm_comb',
  goal: '从 5 人选 2 人当代表（无职位差别），有多少种选法？',
  coreIdea: '无顺序差别 → 组合 C(5,2)，不要用排列。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '选 2 名代表',
      kind: 'choice',
      children: ['unordered'],
      why: '代表之间无职位差别 → 组合',
    },
    {
      id: 'unordered',
      label: 'C(5,2)',
      count: 10,
      kind: 'outcome',
      children: [],
      why: '甲乙与乙甲算同一种',
    },
  ],
  steps: [
    {
      index: 1,
      title: '有序？',
      content: '代表无正副，甲乙与乙甲相同 → 无序。',
      why: '无差别 → 组合，不是排列',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '用组合',
      content: 'C(5,2) = 5!/(2!3!) = 10。',
      why: '先按排列再除以重复顺序',
      op: 'combine',
      formula: 'C(5,2)=10',
      highlightNodeIds: ['unordered'],
    },
    {
      index: 3,
      title: '对比陷阱',
      content: '若有正副职位，则是 P(5,2)=20，不是 10。',
      why: '题目多一个「职位」就从组合变排列',
      op: 'conclude',
      formula: '10',
      highlightNodeIds: ['unordered'],
    },
  ],
  answer: '10',
  answerLatex: '10',
});

/** 例3：古典概率 — 袋中 3 红 2 白，连抽 2 次不放回，都是红的概率 */
export const EXAMPLE_CLASSICAL_PROB = Object.freeze({
  version: 1,
  problemType: 'classical_prob',
  goal: '袋中 3 红 2 白，不放回连抽 2 次，都是红球的概率？',
  coreIdea: '用树形图看清每一步样本变化，再乘条件概率。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '第一次抽',
      kind: 'choice',
      children: ['r1', 'w1'],
      why: '第一次：5 球中抽',
    },
    {
      id: 'r1',
      label: '红 (3/5)',
      count: 3,
      kind: 'case',
      children: ['r1r2', 'r1w2'],
      why: '抽到红后剩 4 球、2 红',
    },
    {
      id: 'w1',
      label: '白 (2/5)',
      count: 2,
      kind: 'case',
      children: [],
      why: '本问只要「都红」，白分支可淡化',
    },
    {
      id: 'r1r2',
      label: '再红 (2/4)',
      count: 2,
      kind: 'outcome',
      children: [],
      why: '路径：红→红',
    },
    {
      id: 'r1w2',
      label: '再白 (2/4)',
      count: 2,
      kind: 'outcome',
      children: [],
      why: '非目标路径',
    },
  ],
  steps: [
    {
      index: 1,
      title: '画树：第一次',
      content: '5 球中 3 红 → P(红₁)=3/5。',
      why: '古典概型：有利 / 全体',
      op: 'divide',
      formula: '3/5',
      highlightNodeIds: ['root', 'r1'],
    },
    {
      index: 2,
      title: '第二次（已抽红）',
      content: '不放回：剩 4 球、2 红 → P(红₂|红₁)=2/4。',
      why: '条件变了，分母分子都要更新',
      op: 'divide',
      formula: '2/4',
      highlightNodeIds: ['r1', 'r1r2'],
    },
    {
      index: 3,
      title: '沿路径相乘',
      content: 'P(红红)=(3/5)×(2/4)=3/10。',
      why: '同一路径上的连续事件用乘法',
      op: 'conclude',
      formula: '(3/5)×(2/4)=3/10',
      highlightNodeIds: ['r1', 'r1r2'],
    },
  ],
  answer: '3/10',
  answerLatex: '\\dfrac{3}{10}',
});

export const MVP_EXAMPLES = Object.freeze({
  multiply_add: EXAMPLE_MULTIPLY_ADD,
  perm_comb: EXAMPLE_PERM_COMB,
  classical_prob: EXAMPLE_CLASSICAL_PROB,
});
