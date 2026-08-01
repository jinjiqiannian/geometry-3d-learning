/**
 * 本地排组/概率求解器 — 题目文本 → LogicIR
 * 只覆盖 MVP 三类高频题型；认不出时返回 null（由 UI 提示试样例）。
 */
import {
  LOGIC_IR_VERSION,
  EXAMPLE_MULTIPLY_ADD,
  EXAMPLE_PERM_COMB,
  EXAMPLE_CLASSICAL_PROB,
} from './schema.js'

function factorial(n) {
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

function P(n, k) {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r *= n - i
  return r
}

function C(n, k) {
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  return P(n, k) / factorial(k)
}

function gcd(a, b) {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a || 1
}

function simplifyFrac(num, den) {
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

/**
 * @param {string} text
 * @returns {import('./schema.js').LogicIR | null}
 */
export function solveLogicProblem(text) {
  const raw = (text || '').trim()
  if (raw.length < 4) return null

  // 样例快捷：贴进样例题干时直接返回
  if (raw.includes('正') && raw.includes('副') && /5\s*人/.test(raw)) {
    return structuredClone(EXAMPLE_MULTIPLY_ADD)
  }
  if (raw.includes('代表') && /5\s*人/.test(raw) && /2\s*人/.test(raw)) {
    return structuredClone(EXAMPLE_PERM_COMB)
  }
  if (raw.includes('红') && raw.includes('白') && raw.includes('不放回')) {
    const m = raw.match(/(\d+)\s*红.*?(\d+)\s*白/)
    if (m && m[1] === '3' && m[2] === '2') {
      return structuredClone(EXAMPLE_CLASSICAL_PROB)
    }
  }

  return (
    tryClassicalProb(raw) ||
    tryOrderedOfficers(raw) ||
    tryCombination(raw) ||
    tryMultiplyClothes(raw) ||
    tryPermutation(raw) ||
    null
  )
}

/** 袋中 a 红 b 白，不放回连抽 2 次，都是红 */
function tryClassicalProb(text) {
  if (!/概率|几率/.test(text) && !/红/.test(text)) return null
  const balls = text.match(/(\d+)\s*红.*?(\d+)\s*白/)
  if (!balls) return null
  const red = Number(balls[1])
  const white = Number(balls[2])
  const total = red + white
  if (total < 2 || red < 2) return null
  if (!/不放回|依次|连抽|连续/.test(text) && !/两次|2\s*次/.test(text)) {
    // 仍允许「抽两球都是红」类
    if (!/都是红|全红|两.*红|红.*红/.test(text)) return null
  }

  const p1n = red
  const p1d = total
  const p2n = red - 1
  const p2d = total - 1
  const { num, den } = simplifyFrac(p1n * p2n, p1d * p2d)

  return {
    version: LOGIC_IR_VERSION,
    problemType: 'classical_prob',
    goal: text,
    coreIdea: '用树形图看清每一步样本变化，再沿目标路径相乘。',
    rootId: 'root',
    nodes: [
      {
        id: 'root',
        label: '第一次抽',
        kind: 'choice',
        children: ['r1', 'w1'],
        why: `一共 ${total} 球`,
      },
      {
        id: 'r1',
        label: `红 (${p1n}/${p1d})`,
        count: red,
        kind: 'case',
        children: ['r1r2'],
        why: `抽到红后剩 ${total - 1} 球、${red - 1} 红`,
      },
      {
        id: 'w1',
        label: `白 (${white}/${total})`,
        count: white,
        kind: 'case',
        children: [],
        why: '本问只要「都红」，白分支可淡化',
      },
      {
        id: 'r1r2',
        label: `再红 (${p2n}/${p2d})`,
        count: red - 1,
        kind: 'outcome',
        children: [],
        why: '路径：红→红',
      },
    ],
    steps: [
      {
        index: 1,
        title: '画树：第一次',
        content: `${total} 球中 ${red} 红 → P(红₁)=${p1n}/${p1d}。`,
        why: '古典概型：有利 / 全体',
        op: 'divide',
        formula: `${p1n}/${p1d}`,
        highlightNodeIds: ['root', 'r1'],
      },
      {
        index: 2,
        title: '第二次（已抽红）',
        content: `不放回：剩 ${total - 1} 球、${red - 1} 红 → P(红₂|红₁)=${p2n}/${p2d}。`,
        why: '条件变了，分母分子都要更新',
        op: 'divide',
        formula: `${p2n}/${p2d}`,
        highlightNodeIds: ['r1', 'r1r2'],
      },
      {
        index: 3,
        title: '沿路径相乘',
        content: `P(红红)=(${p1n}/${p1d})×(${p2n}/${p2d})=${num}/${den}。`,
        why: '同一路径上的连续事件用乘法',
        op: 'conclude',
        formula: `(${p1n}/${p1d})×(${p2n}/${p2d})=${num}/${den}`,
        highlightNodeIds: ['r1', 'r1r2'],
      },
    ],
    answer: `${num}/${den}`,
    answerLatex: `\\dfrac{${num}}{${den}}`,
  }
}

/** 从 n 人选正副 / 班长与委员等有序职务 */
function tryOrderedOfficers(text) {
  const hasOrder =
    /(正|副).*(正|副)/.test(text) ||
    /班长.*副|正副|主席.*书记|有序|排列|名次|冠军.*亚军/.test(text)
  if (!hasOrder) return null

  const nMatch =
    text.match(/从\s*(\d+)\s*人/) ||
    text.match(/(\d+)\s*名?(?:同学|学生|人)/) ||
    text.match(/共\s*(\d+)\s*人/)
  if (!nMatch) return null
  const n = Number(nMatch[1])
  if (n < 2 || n > 30) return null

  // 默认两职：正副；若写「选 k 人且有序」用 k
  let k = 2
  const kMatch = text.match(/选\s*(\d+)\s*人/)
  if (kMatch && !/(正|副)/.test(text)) k = Number(kMatch[1])
  if (k < 2 || k > n) k = 2

  const counts = []
  for (let i = 0; i < k; i++) counts.push(n - i)
  const ans = P(n, k)
  const formula = counts.join('×')

  const nodes = [
    {
      id: 'root',
      label: '有序选拔',
      kind: 'choice',
      children: counts.map((_, i) => `s${i}`),
      why: '职位/名次不同 → 有序 → 分步乘法',
    },
    ...counts.map((c, i) => ({
      id: `s${i}`,
      label: `第 ${i + 1} 步`,
      count: c,
      kind: 'choice',
      children: [],
      why: i === 0 ? `${n} 人可选` : `已选 ${i} 人，剩 ${c} 人`,
    })),
  ]

  const steps = [
    {
      index: 1,
      title: '判断：有序还是无序？',
      content: '职位或名次不同，对调算两种 → 有序。',
      why: '有序 → 排列 / 分步乘法，不是组合',
      highlightNodeIds: ['root'],
    },
    ...counts.map((c, i) => ({
      index: i + 2,
      title: `第 ${i + 1} 步`,
      content: `有 ${c} 种选法。`,
      why: i === 0 ? '任何人都可以先选' : '不能与已选重复',
      op: 'multiply',
      formula: String(c),
      highlightNodeIds: [`s${i}`],
    })),
    {
      index: counts.length + 2,
      title: '合并',
      content: `分步完成 → 乘法：${formula} = ${ans}。`,
      why: '「分步」用乘，「分类」才用加',
      op: 'conclude',
      formula: `${formula}=${ans}`,
      highlightNodeIds: ['root', ...counts.map((_, i) => `s${i}`)],
    },
  ]

  return {
    version: LOGIC_IR_VERSION,
    problemType: 'multiply_add',
    goal: text,
    coreIdea: '有顺序：分步相乘。',
    rootId: 'root',
    nodes,
    steps,
    answer: String(ans),
    answerLatex: String(ans),
  }
}

/** 从 n 人选 k 人（无职位 / 组合） */
function tryCombination(text) {
  if (/概率/.test(text)) return null
  const orderedHint =
    /(正|副)|班长|名次|冠军|排列|有序|站成一排|排队/.test(text)
  if (orderedHint) return null

  const nMatch =
    text.match(/从\s*(\d+)\s*人/) ||
    text.match(/(\d+)\s*名?(?:同学|学生|人)中/)
  const kMatch =
    text.match(/选\s*(\d+)\s*人/) ||
    text.match(/取\s*(\d+)\s*人/) ||
    text.match(/抽\s*(\d+)\s*人/)
  if (!nMatch || !kMatch) return null
  if (!/代表|委员|小组|无.*(职务|职位|差别)|组合|多少种/.test(text) && !/选/.test(text)) {
    return null
  }

  const n = Number(nMatch[1])
  const k = Number(kMatch[1])
  if (k < 1 || k > n || n > 40) return null

  const ans = C(n, k)
  return {
    version: LOGIC_IR_VERSION,
    problemType: 'perm_comb',
    goal: text,
    coreIdea: '无顺序差别 → 组合 C(n,k)。',
    rootId: 'root',
    nodes: [
      {
        id: 'root',
        label: `选 ${k} 人`,
        kind: 'choice',
        children: ['c'],
        why: '人选之间无职位差别 → 组合',
      },
      {
        id: 'c',
        label: `C(${n},${k})`,
        count: ans,
        kind: 'outcome',
        children: [],
        why: '调换顺序算同一种',
      },
    ],
    steps: [
      {
        index: 1,
        title: '有序？',
        content: '没有职位/名次差别 → 无序。',
        why: '无差别 → 组合，不是排列',
        highlightNodeIds: ['root'],
      },
      {
        index: 2,
        title: '用组合',
        content: `C(${n},${k}) = ${ans}。`,
        why: '先按排列再除以重复的顺序数 k!',
        op: 'combine',
        formula: `C(${n},${k})=${ans}`,
        highlightNodeIds: ['c'],
      },
      {
        index: 3,
        title: '对比陷阱',
        content: `若有职位差别，则是 P(${n},${k})=${P(n, k)}，不是 ${ans}。`,
        why: '题目多一个「职位」就从组合变排列',
        op: 'conclude',
        formula: String(ans),
        highlightNodeIds: ['c'],
      },
    ],
    answer: String(ans),
    answerLatex: String(ans),
  }
}

/** 有 a 种… b 种… 各选一件 → 乘法 */
function tryMultiplyClothes(text) {
  const nums = [...text.matchAll(/(\d+)\s*种/g)].map((m) => Number(m[1]))
  if (nums.length < 2) return null
  if (!/各|分别|搭配|穿|选/.test(text) && !/多少/.test(text)) return null

  const ans = nums.reduce((a, b) => a * b, 1)
  const formula = nums.join('×')
  const nodes = [
    {
      id: 'root',
      label: '分步搭配',
      kind: 'choice',
      children: nums.map((_, i) => `s${i}`),
      why: '每一步都要做 → 乘法原理',
    },
    ...nums.map((c, i) => ({
      id: `s${i}`,
      label: `第 ${i + 1} 类`,
      count: c,
      kind: 'choice',
      children: [],
      why: `${c} 种选法`,
    })),
  ]

  return {
    version: LOGIC_IR_VERSION,
    problemType: 'multiply_add',
    goal: text,
    coreIdea: '完成一件事需多步，每步独立 → 分步相乘。',
    rootId: 'root',
    nodes,
    steps: [
      {
        index: 1,
        title: '识别原理',
        content: '要同时选齐各类，属于「分步」，不是「分类」。',
        why: '分步用乘，分类（或这或那）才用加',
        highlightNodeIds: ['root'],
      },
      ...nums.map((c, i) => ({
        index: i + 2,
        title: `第 ${i + 1} 步`,
        content: `有 ${c} 种选法。`,
        why: '该步可选数',
        op: 'multiply',
        formula: String(c),
        highlightNodeIds: [`s${i}`],
      })),
      {
        index: nums.length + 2,
        title: '合并',
        content: `${formula} = ${ans}。`,
        why: '各步选法相乘',
        op: 'conclude',
        formula: `${formula}=${ans}`,
        highlightNodeIds: ['root', ...nums.map((_, i) => `s${i}`)],
      },
    ],
    answer: String(ans),
    answerLatex: String(ans),
  }
}

/** 从 n 人选 k 人排队 / 排列 */
function tryPermutation(text) {
  if (!/排队|站成一排|排列|名次|顺序/.test(text)) return null
  const nMatch = text.match(/从\s*(\d+)\s*人/) || text.match(/(\d+)\s*人/)
  const kMatch = text.match(/(?:选|取|抽)\s*(\d+)\s*人/) || text.match(/排\s*(\d+)/)
  if (!nMatch) return null
  const n = Number(nMatch[1])
  const k = kMatch ? Number(kMatch[1]) : n
  if (k < 1 || k > n || n > 20) return null

  // 复用有序构造
  return tryOrderedOfficers(
    `从${n}人选${k}人排队，有多少种排法（有序）`,
  )
}
