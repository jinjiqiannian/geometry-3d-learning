/**
 * ExplainIR — 导数 / 圆锥曲线 / 物理等「步骤理解」真相层（与 LogicIR 同形）
 * 痛点偏「算得出路径」：拆步骤、标陷阱，树节点表示计算链路。
 */

import {
  PHYSICS_SECTIONS,
  PHYSICS_EXAMPLES,
  PHYSICS_EXAMPLE_LABELS,
  PHYSICS_SECTION_IDS,
  PHYSICS_GROUPS,
  isPhysicsTopic,
  getGroupIdForTopic,
  solvePhysics,
} from './physics.js'

export const EXPLAIN_IR_VERSION = 1

/** @typedef {'derivative' | 'conic' | string} TopicId */

export const TOPICS = Object.freeze({
  derivative: {
    id: 'derivative',
    label: '导数',
    kicker: '导数 · 步骤拆解',
    title: '先想清楚再开算',
    placeholder:
      '例如：求 f(x)=x³−3x 的导数\n或：求曲线 y=x³−3x 在 x=1 处的切线方程',
    hint: '这题本地还认不太准。试试：求多项式导数、切线方程、单调区间，或点样例。',
  },
  conic: {
    id: 'conic',
    label: '圆锥曲线',
    kicker: '圆锥曲线 · 标准形拆解',
    title: '先认准 a、b、c',
    placeholder:
      '例如：椭圆 x²/25+y²/16=1 的离心率\n或：双曲线 x²/9−y²/16=1 的焦点坐标',
    hint: '这题本地还认不太准。试试：椭圆/双曲线标准方程求 e 或焦点，或点样例。',
  },
  ...PHYSICS_SECTIONS,
})

export { PHYSICS_SECTION_IDS, PHYSICS_GROUPS, isPhysicsTopic, getGroupIdForTopic }

export function validateExplainIR(ir) {
  const errors = []
  if (!ir || typeof ir !== 'object') return { ok: false, errors: ['为空'] }
  if (ir.version !== EXPLAIN_IR_VERSION) errors.push('version')
  if (!Array.isArray(ir.nodes) || !Array.isArray(ir.steps)) errors.push('结构')
  return { ok: errors.length === 0, errors }
}

// ─── 导数样例 ───────────────────────────────────────

export const EX_DERIV_POLY = Object.freeze({
  version: 1,
  problemType: 'deriv_poly',
  topic: 'derivative',
  goal: '求 f(x)=x³−3x 的导数',
  coreIdea: '幂函数逐项求导：(xⁿ)′=n xⁿ⁻¹，常数项导数为 0。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'f(x)=x³−3x',
      kind: 'choice',
      children: ['t1', 't2'],
      why: '拆成两项分别求导再相加',
    },
    {
      id: 't1',
      label: '(x³)′=3x²',
      kind: 'outcome',
      children: [],
      why: 'n=3 → 3x²',
    },
    {
      id: 't2',
      label: '(−3x)′=−3',
      kind: 'outcome',
      children: [],
      why: '(cx)′=c',
    },
  ],
  steps: [
    {
      index: 1,
      title: '拆项',
      content: 'f(x)=x³ + (−3x)，两项分别求。',
      why: '和的导数 = 导数的和',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '第一项',
      content: '(x³)′=3x²',
      why: '幂法则',
      formula: '3x²',
      highlightNodeIds: ['t1'],
    },
    {
      index: 3,
      title: '第二项',
      content: '(−3x)′=−3',
      why: '一次项系数就是导数',
      formula: '−3',
      highlightNodeIds: ['t2'],
    },
    {
      index: 4,
      title: '合并',
      content: 'f′(x)=3x²−3',
      why: '不要漏符号',
      formula: '3x²−3',
      highlightNodeIds: ['root', 't1', 't2'],
    },
  ],
  answer: '3x²−3',
})

export const EX_DERIV_TANGENT = Object.freeze({
  version: 1,
  problemType: 'deriv_tangent',
  topic: 'derivative',
  goal: '求曲线 y=x³−3x 在 x=1 处的切线方程',
  coreIdea: '切线：先求斜率 f′(x₀)，再求点 (x₀,f(x₀))，最后点斜式。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '切线三步',
      kind: 'choice',
      children: ['m', 'p', 'eq'],
      why: '缺一步都会写错方程',
    },
    {
      id: 'm',
      label: '斜率 f′(1)=0',
      kind: 'outcome',
      children: [],
      why: 'f′=3x²−3 → 3−3=0',
    },
    {
      id: 'p',
      label: '切点 (1,−2)',
      kind: 'outcome',
      children: [],
      why: 'f(1)=1−3=−2',
    },
    {
      id: 'eq',
      label: 'y+2=0·(x−1)',
      kind: 'outcome',
      children: [],
      why: '点斜式',
    },
  ],
  steps: [
    {
      index: 1,
      title: '求导',
      content: 'f′(x)=3x²−3',
      why: '斜率来自导数，不是原函数',
      formula: '3x²−3',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '斜率',
      content: 'f′(1)=0',
      why: '代入切点横坐标',
      formula: 'k=0',
      highlightNodeIds: ['m'],
    },
    {
      index: 3,
      title: '切点',
      content: 'f(1)=−2 → 点 (1,−2)',
      why: '点斜式需要坐标',
      highlightNodeIds: ['p'],
    },
    {
      index: 4,
      title: '方程',
      content: 'y+2=0 → y=−2（水平切线）',
      why: '斜率为 0 时切线平行 x 轴',
      formula: 'y=−2',
      highlightNodeIds: ['eq'],
    },
  ],
  answer: 'y=−2',
})

export const EX_DERIV_MONO = Object.freeze({
  version: 1,
  problemType: 'deriv_mono',
  topic: 'derivative',
  goal: '求 f(x)=x³−3x 的单调区间',
  coreIdea: '令 f′=0 找临界点，用数轴检验 f′ 符号。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'f′(x)=3(x−1)(x+1)',
      kind: 'choice',
      children: ['neg', 'mid', 'pos'],
      why: '临界点 x=±1 把实轴分成三段',
    },
    {
      id: 'neg',
      label: '(−∞,−1) 增',
      kind: 'outcome',
      children: [],
      why: 'f′>0',
    },
    {
      id: 'mid',
      label: '(−1,1) 减',
      kind: 'outcome',
      children: [],
      why: 'f′<0',
    },
    {
      id: 'pos',
      label: '(1,+∞) 增',
      kind: 'outcome',
      children: [],
      why: 'f′>0',
    },
  ],
  steps: [
    {
      index: 1,
      title: '求导并因式',
      content: 'f′(x)=3x²−3=3(x−1)(x+1)',
      why: '方便读零点',
      formula: '3(x−1)(x+1)',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '临界点',
      content: 'f′=0 ⇒ x=±1',
      why: '单调性只可能在这些点改变',
      highlightNodeIds: ['root'],
    },
    {
      index: 3,
      title: '读符号',
      content: '在 (−∞,−1) 与 (1,+∞) 上 f′>0；在 (−1,1) 上 f′<0',
      why: '取试验点最快',
      highlightNodeIds: ['neg', 'mid', 'pos'],
    },
    {
      index: 4,
      title: '结论',
      content: '增区间 (−∞,−1]、[1,+∞)；减区间 [−1,1]',
      why: '闭开按教材约定（连续可取等号）',
      formula: '增(−∞,−1]∪[1,+∞)；减[−1,1]',
      highlightNodeIds: ['neg', 'mid', 'pos'],
    },
  ],
  answer: '增(−∞,−1]∪[1,+∞)；减[−1,1]',
})

// ─── 圆锥曲线样例 ───────────────────────────────────

export const EX_CONIC_ELLIPSE_E = Object.freeze({
  version: 1,
  problemType: 'ellipse_e',
  topic: 'conic',
  goal: '椭圆 x²/25+y²/16=1 的离心率',
  coreIdea: '先认 a>b：a²=25，b²=16 → c²=a²−b² → e=c/a',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '标准椭圆',
      kind: 'choice',
      children: ['a', 'c', 'e'],
      why: '分母大的是 a²（焦点在对应轴）',
    },
    {
      id: 'a',
      label: 'a=5，b=4',
      kind: 'outcome',
      children: [],
      why: '25>16 → 焦点在 x 轴',
    },
    {
      id: 'c',
      label: 'c=3',
      kind: 'outcome',
      children: [],
      why: 'c²=25−16=9',
    },
    {
      id: 'e',
      label: 'e=3/5',
      kind: 'outcome',
      children: [],
      why: 'e=c/a∈(0,1)',
    },
  ],
  steps: [
    {
      index: 1,
      title: '读 a、b',
      content: 'a²=25，b²=16 ⇒ a=5，b=4',
      why: '哪个分母大，焦点就在哪条轴',
      highlightNodeIds: ['a'],
    },
    {
      index: 2,
      title: '求 c',
      content: 'c²=a²−b²=9 ⇒ c=3',
      why: '椭圆：c²=a²−b²（不是加）',
      formula: 'c=3',
      highlightNodeIds: ['c'],
    },
    {
      index: 3,
      title: '离心率',
      content: 'e=c/a=3/5',
      why: '椭圆 e<1；若算成 >1 就写错类型了',
      formula: '3/5',
      highlightNodeIds: ['e'],
    },
  ],
  answer: '3/5',
})

export const EX_CONIC_HYPER_F = Object.freeze({
  version: 1,
  problemType: 'hyper_focus',
  topic: 'conic',
  goal: '双曲线 x²/9−y²/16=1 的焦点坐标',
  coreIdea: '双曲线 c²=a²+b²，焦点在横轴：±c',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'x²/a²−y²/b²=1',
      kind: 'choice',
      children: ['ab', 'c', 'f'],
      why: 'x² 为正项 → 左右开口，焦点在 x 轴',
    },
    {
      id: 'ab',
      label: 'a=3，b=4',
      kind: 'outcome',
      children: [],
      why: 'a²=9，b²=16',
    },
    {
      id: 'c',
      label: 'c=5',
      kind: 'outcome',
      children: [],
      why: 'c²=9+16=25',
    },
    {
      id: 'f',
      label: 'F(±5,0)',
      kind: 'outcome',
      children: [],
      why: '焦点 (±c,0)',
    },
  ],
  steps: [
    {
      index: 1,
      title: '认准类型',
      content: 'x² 项为正、y² 为负 → 焦点在 x 轴的双曲线',
      why: '符号决定焦点轴，别套椭圆公式',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: 'a、b',
      content: 'a²=9，b²=16 ⇒ a=3，b=4',
      why: '正项分母是 a²',
      highlightNodeIds: ['ab'],
    },
    {
      index: 3,
      title: '求 c',
      content: 'c²=a²+b²=25 ⇒ c=5',
      why: '双曲线用加；椭圆才用减',
      formula: 'c=5',
      highlightNodeIds: ['c'],
    },
    {
      index: 4,
      title: '焦点',
      content: 'F₁(−5,0)，F₂(5,0)',
      why: '写坐标别漏 ±',
      formula: '(±5,0)',
      highlightNodeIds: ['f'],
    },
  ],
  answer: '(±5,0)',
})

export const EX_CONIC_CIRCLE = Object.freeze({
  version: 1,
  problemType: 'circle_r',
  topic: 'conic',
  goal: '圆 x²+y²−4x+6y−3=0 的圆心与半径',
  coreIdea: '配方成 (x−h)²+(y−k)²=r²，再读圆心半径。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '一般式 → 标准式',
      kind: 'choice',
      children: ['h', 'k', 'r'],
      why: '先配方，再读数',
    },
    {
      id: 'h',
      label: 'x：−4x → (x−2)²',
      kind: 'outcome',
      children: [],
      why: 'h=2',
    },
    {
      id: 'k',
      label: 'y：+6y → (y+3)²',
      kind: 'outcome',
      children: [],
      why: 'k=−3',
    },
    {
      id: 'r',
      label: 'r=4',
      kind: 'outcome',
      children: [],
      why: '右边凑出 16',
    },
  ],
  steps: [
    {
      index: 1,
      title: '配方 x',
      content: 'x²−4x → (x−2)²−4',
      why: '一次项系数一半再平方',
      highlightNodeIds: ['h'],
    },
    {
      index: 2,
      title: '配方 y',
      content: 'y²+6y → (y+3)²−9',
      why: '同理',
      highlightNodeIds: ['k'],
    },
    {
      index: 3,
      title: '移项',
      content: '(x−2)²+(y+3)²=3+4+9=16',
      why: '常数移到右边并加上配方补的数',
      formula: 'r²=16',
      highlightNodeIds: ['r'],
    },
    {
      index: 4,
      title: '结论',
      content: '圆心 (2,−3)，半径 4',
      why: '(y+3) 对应纵坐标 −3',
      formula: 'C(2,−3)，r=4',
      highlightNodeIds: ['h', 'k', 'r'],
    },
  ],
  answer: '圆心(2,−3)，r=4',
})

export const TOPIC_EXAMPLES = Object.freeze({
  derivative: {
    deriv_poly: EX_DERIV_POLY,
    deriv_tangent: EX_DERIV_TANGENT,
    deriv_mono: EX_DERIV_MONO,
  },
  conic: {
    ellipse_e: EX_CONIC_ELLIPSE_E,
    hyper_focus: EX_CONIC_HYPER_F,
    circle_r: EX_CONIC_CIRCLE,
  },
  ...PHYSICS_EXAMPLES,
})

export const TOPIC_EXAMPLE_LABELS = Object.freeze({
  derivative: {
    deriv_poly: '多项式求导',
    deriv_tangent: '切线方程',
    deriv_mono: '单调区间',
  },
  conic: {
    ellipse_e: '椭圆离心率',
    hyper_focus: '双曲线焦点',
    circle_r: '圆的配方',
  },
  ...PHYSICS_EXAMPLE_LABELS,
})

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

function simplify(n, d) {
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

/**
 * @param {string} topic
 * @param {string} text
 */
export function solveTopicProblem(topic, text) {
  const raw = (text || '').trim()
  if (raw.length < 4) return null
  if (topic === 'derivative') return solveDerivative(raw)
  if (topic === 'conic') return solveConic(raw)
  if (isPhysicsTopic(topic)) return solvePhysics(raw, topic)
  return null
}

function solveDerivative(text) {
  if (/切线/.test(text)) {
    if (/x\s*³|x\^3|x3/.test(text) && /−\s*3x|-3x/.test(text) && /x\s*=\s*1/.test(text)) {
      return structuredClone(EX_DERIV_TANGENT)
    }
    // 高考基础：y=x^n 在 x=x0 处切线；或 y=ax^2+bx+c
    const at = text.match(/x\s*=\s*(-?\d+)/)
    const x0 = at ? Number(at[1]) : null
    if (x0 != null) {
      const pow = text.match(
        /y\s*=\s*x\s*(?:\^(\d+)|([²³⁴]))|f\s*\(\s*x\s*\)\s*=\s*x\s*(?:\^(\d+)|([²³⁴]))/,
      )
      if (pow) {
        const map = { '²': 2, '³': 3, '⁴': 4 }
        const n = Number(pow[1] || pow[3] || map[pow[2] || pow[4]] || 0)
        if (n >= 2) {
          const k = n * x0 ** (n - 1)
          const y0 = x0 ** n
          const ans =
            k === 0
              ? `y=${y0}`
              : `y=${k}(x${x0 >= 0 ? '−' : '+'}${Math.abs(x0)})+${y0}`
          return {
            version: 1,
            problemType: 'deriv_tangent',
            topic: 'derivative',
            goal: text,
            coreIdea: '切线：斜率 f′(x₀)，切点 (x₀,f(x₀))，点斜式。',
            rootId: 'root',
            nodes: [
              {
                id: 'root',
                label: '切线三步',
                kind: 'choice',
                children: ['m', 'p', 'eq'],
                why: '先导数再代入',
              },
              {
                id: 'm',
                label: `k=f′(${x0})=${k}`,
                kind: 'outcome',
                children: [],
                why: `(x^${n})′=${n}x^${n - 1}`,
              },
              {
                id: 'p',
                label: `切点 (${x0},${y0})`,
                kind: 'outcome',
                children: [],
                why: `f(${x0})=${y0}`,
              },
              {
                id: 'eq',
                label: ans,
                kind: 'outcome',
                children: [],
                why: '点斜式',
              },
            ],
            steps: [
              {
                index: 1,
                title: '求导',
                content: `f(x)=x^${n} → f′(x)=${n}x^${n - 1}`,
                why: '幂法则',
                highlightNodeIds: ['root'],
              },
              {
                index: 2,
                title: '斜率',
                content: `k=f′(${x0})=${k}`,
                why: '代入切点横坐标',
                formula: String(k),
                highlightNodeIds: ['m'],
              },
              {
                index: 3,
                title: '切点',
                content: `(${x0},${y0})`,
                why: '纵坐标用原函数',
                highlightNodeIds: ['p'],
              },
              {
                index: 4,
                title: '方程',
                content: ans,
                why: '点斜式写完即可',
                formula: ans,
                highlightNodeIds: ['eq'],
              },
            ],
            answer: ans,
          }
        }
      }
    }
  }
  if (/单调|增减/.test(text)) {
    if (/x\s*³|x\^3/.test(text) && /3x/.test(text)) {
      return structuredClone(EX_DERIV_MONO)
    }
  }
  if (/导|f\s*'|求导/.test(text)) {
    // f(x)=ax^3+bx^2+cx+d 简化：匹配 x³±px 或 x^3
    const cubic = text.match(
      /f\s*\(\s*x\s*\)\s*=\s*x\s*(?:\^3|³|3)\s*([+-])\s*(\d*)\s*x(?:\s|$|的|，|,)/i,
    )
    if (cubic || (/x\s*(?:\^3|³)/.test(text) && /3x/.test(text))) {
      const sign = cubic ? cubic[1] : '−'
      const coef = cubic && cubic[2] !== '' ? Number(cubic[2]) : 3
      const linear = sign === '-' || sign === '−' ? -coef : coef
      const fPrimeLinear = linear // (cx)' = c
      const ans = fPrimeLinear === -3 ? '3x²−3' : `3x²${fPrimeLinear >= 0 ? '+' : ''}${fPrimeLinear}`
      if (ans === '3x²−3') return structuredClone({ ...EX_DERIV_POLY, goal: text })
      return {
        ...structuredClone(EX_DERIV_POLY),
        goal: text,
        answer: ans,
      }
    }
    // ax^2+bx+c
    const quad = text.match(
      /f\s*\(\s*x\s*\)\s*=\s*(\d*)\s*x\s*(?:\^2|²)\s*([+-])\s*(\d*)\s*x\s*([+-])\s*(\d+)/i,
    )
    if (quad) {
      const a = quad[1] === '' ? 1 : Number(quad[1])
      const bSign = quad[2] === '-' || quad[2] === '−' ? -1 : 1
      const b = bSign * (quad[3] === '' ? 1 : Number(quad[3]))
      const cSign = quad[4] === '-' || quad[4] === '−' ? -1 : 1
      const c = cSign * Number(quad[5])
      const da = 2 * a
      const db = b
      const ans =
        db === 0 ? `${da}x` : `${da}x${db >= 0 ? '+' : ''}${db}`
      return {
        version: 1,
        problemType: 'deriv_poly',
        topic: 'derivative',
        goal: text,
        coreIdea: '逐项求导：二次项 2ax，一次项 b，常数 0。',
        rootId: 'root',
        nodes: [
          {
            id: 'root',
            label: `f(x)=${a}x²${b >= 0 ? '+' : ''}${b}x${c >= 0 ? '+' : ''}${c}`,
            kind: 'choice',
            children: ['t1', 't2', 't3'],
            why: '三项分别求导',
          },
          {
            id: 't1',
            label: `(${a}x²)′=${da}x`,
            kind: 'outcome',
            children: [],
            why: '(ax²)′=2ax',
          },
          {
            id: 't2',
            label: `(${b}x)′=${db}`,
            kind: 'outcome',
            children: [],
            why: '(bx)′=b',
          },
          {
            id: 't3',
            label: `(${c})′=0`,
            kind: 'outcome',
            children: [],
            why: '常数导数为 0',
          },
        ],
        steps: [
          {
            index: 1,
            title: '拆项',
            content: '按二次、一次、常数拆开。',
            why: '和差求导法则',
            highlightNodeIds: ['root'],
          },
          {
            index: 2,
            title: '二次项',
            content: `(${a}x²)′=${da}x`,
            why: '指数乘到前面，次数减 1',
            formula: `${da}x`,
            highlightNodeIds: ['t1'],
          },
          {
            index: 3,
            title: '一次与常数',
            content: `(${b}x)′=${db}，常数项导数为 0`,
            why: '别把常数当成一次项',
            highlightNodeIds: ['t2', 't3'],
          },
          {
            index: 4,
            title: '合并',
            content: `f′(x)=${ans}`,
            why: '写最终式即可',
            formula: ans,
            highlightNodeIds: ['root', 't1', 't2'],
          },
        ],
        answer: ans,
      }
    }
  }
  // 贴进样例题干
  if (text.includes('x³−3x') || text.includes('x^3-3x')) {
    if (/切线/.test(text)) return structuredClone(EX_DERIV_TANGENT)
    if (/单调/.test(text)) return structuredClone(EX_DERIV_MONO)
    return structuredClone(EX_DERIV_POLY)
  }
  return null
}

function solveConic(text) {
  // 椭圆 x²/A + y²/B = 1
  const ell = text.match(
    /x\s*(?:\^2|²)\s*\/\s*(\d+)\s*\+\s*y\s*(?:\^2|²)\s*\/\s*(\d+)\s*=\s*1/,
  )
  if (ell && (/离心|e\b|求/.test(text) || /椭圆/.test(text))) {
    let A = Number(ell[1])
    let B = Number(ell[2])
    const focusOnX = A > B
    const a2 = Math.max(A, B)
    const b2 = Math.min(A, B)
    const a = Math.sqrt(a2)
    const b = Math.sqrt(b2)
    const c = Math.sqrt(a2 - b2)
    const { n, d } = simplify(Math.round(c * 1000), Math.round(a * 1000))
    // if perfect squares use exact
    const cExact = Number.isInteger(c) ? c : null
    const aExact = Number.isInteger(a) ? a : null
    let eStr
    if (cExact != null && aExact != null) {
      const fr = simplify(cExact, aExact)
      eStr = fr.d === 1 ? String(fr.n) : `${fr.n}/${fr.d}`
    } else {
      eStr = (c / a).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
    }
    return {
      version: 1,
      problemType: 'ellipse_e',
      topic: 'conic',
      goal: text,
      coreIdea: '椭圆：c²=a²−b²，e=c/a（a 取较大半轴）。',
      rootId: 'root',
      nodes: [
        {
          id: 'root',
          label: '标准椭圆',
          kind: 'choice',
          children: ['a', 'c', 'e'],
          why: focusOnX ? 'a² 在 x 下 → 焦点在 x 轴' : 'a² 在 y 下 → 焦点在 y 轴',
        },
        {
          id: 'a',
          label: `a²=${a2}，b²=${b2}`,
          kind: 'outcome',
          children: [],
          why: '较大分母为 a²',
        },
        {
          id: 'c',
          label: cExact != null ? `c=${cExact}` : `c=√${a2 - b2}`,
          kind: 'outcome',
          children: [],
          why: 'c²=a²−b²',
        },
        {
          id: 'e',
          label: `e=${eStr}`,
          kind: 'outcome',
          children: [],
          why: 'e=c/a∈(0,1)',
        },
      ],
      steps: [
        {
          index: 1,
          title: '读 a、b',
          content: `较大分母 a²=${a2}，较小 b²=${b2}`,
          why: '不要默认 x 下就是 a',
          highlightNodeIds: ['a'],
        },
        {
          index: 2,
          title: '求 c',
          content: `c²=${a2}−${b2}=${a2 - b2}`,
          why: '椭圆用减',
          highlightNodeIds: ['c'],
        },
        {
          index: 3,
          title: '离心率',
          content: `e=c/a=${eStr}`,
          why: '检查是否 <1',
          formula: eStr,
          highlightNodeIds: ['e'],
        },
      ],
      answer: eStr,
    }
  }

  // 双曲线 x²/A − y²/B = 1
  const hyp = text.match(
    /x\s*(?:\^2|²)\s*\/\s*(\d+)\s*[−\-]\s*y\s*(?:\^2|²)\s*\/\s*(\d+)\s*=\s*1/,
  )
  if (hyp) {
    const a2 = Number(hyp[1])
    const b2 = Number(hyp[2])
    const c2 = a2 + b2
    const c = Math.sqrt(c2)
    const cExact = Number.isInteger(c) ? c : null
    const ans = cExact != null ? `(±${cExact},0)` : `(±√${c2},0)`
    return {
      version: 1,
      problemType: 'hyper_focus',
      topic: 'conic',
      goal: text,
      coreIdea: '双曲线 c²=a²+b²，焦点在横轴 (±c,0)。',
      rootId: 'root',
      nodes: [
        {
          id: 'root',
          label: 'x²/a²−y²/b²=1',
          kind: 'choice',
          children: ['ab', 'c', 'f'],
          why: '正项在 x → 焦点在 x 轴',
        },
        {
          id: 'ab',
          label: `a²=${a2}，b²=${b2}`,
          kind: 'outcome',
          children: [],
          why: '正项分母是 a²',
        },
        {
          id: 'c',
          label: cExact != null ? `c=${cExact}` : `c=√${c2}`,
          kind: 'outcome',
          children: [],
          why: 'c²=a²+b²',
        },
        {
          id: 'f',
          label: ans,
          kind: 'outcome',
          children: [],
          why: '焦点 (±c,0)',
        },
      ],
      steps: [
        {
          index: 1,
          title: '认类型',
          content: '双曲线，焦点在 x 轴',
          why: '别套椭圆的减法',
          highlightNodeIds: ['root'],
        },
        {
          index: 2,
          title: '求 c',
          content: `c²=${a2}+${b2}=${c2}`,
          why: '双曲线用加',
          highlightNodeIds: ['c'],
        },
        {
          index: 3,
          title: '焦点',
          content: ans,
          why: '写全两个焦点',
          formula: ans,
          highlightNodeIds: ['f'],
        },
      ],
      answer: ans,
    }
  }

  // 抛物线 y²=2px 或 x²=2py（高考基础：焦点/准线）
  const paraY = text.match(/y\s*(?:\^2|²)\s*=\s*(\d+)\s*x/)
  const paraX = text.match(/x\s*(?:\^2|²)\s*=\s*(\d+)\s*y/)
  if (paraY || paraX) {
    const openRight = Boolean(paraY)
    const coeff = Number((paraY || paraX)[1])
    const p = coeff / 2 // 标准 y²=2px → 焦点(p/2,0)；若写成 y²=4ax 则 4a=coeff
    // 教材常用 y²=2px，焦点 (p/2, 0)；若 y²=4ax 则 a=coeff/4
    const a = coeff / 4
    const focus = openRight ? `(${a},0)` : `(0,${a})`
    const directrix = openRight ? `x=${-a}` : `y=${-a}`
    const wantFocus = /焦点|focus/i.test(text) || !/准线/.test(text)
    const ans = wantFocus ? focus : directrix
    return {
      version: 1,
      problemType: 'parabola_focus',
      topic: 'conic',
      goal: text,
      coreIdea: openRight
        ? 'y²=2px 型：先化成 y²=4ax，焦点 (a,0)，准线 x=−a。'
        : 'x²=2py 型：化成 x²=4ay，焦点 (0,a)，准线 y=−a。',
      rootId: 'root',
      nodes: [
        {
          id: 'root',
          label: openRight ? '开口向右' : '开口向上',
          kind: 'choice',
          children: ['a', 'f'],
          why: '看平方项在哪一侧',
        },
        {
          id: 'a',
          label: `4a=${coeff} → a=${a}`,
          kind: 'outcome',
          children: [],
          why: '标准式系数是 4a',
        },
        {
          id: 'f',
          label: wantFocus ? `焦点 ${focus}` : `准线 ${directrix}`,
          kind: 'outcome',
          children: [],
          why: wantFocus ? '焦点在对称轴上' : '准线在开口反方向',
        },
      ],
      steps: [
        {
          index: 1,
          title: '认开口',
          content: openRight ? 'y² 在左侧 → 开口向右' : 'x² 在左侧 → 开口向上/下',
          why: '决定焦点落在哪条轴',
          highlightNodeIds: ['root'],
        },
        {
          index: 2,
          title: '求 a',
          content: `写成标准式，4a=${coeff}，a=${a}`,
          why: '不要把 2p 直接当 a',
          formula: `a=${a}`,
          highlightNodeIds: ['a'],
        },
        {
          index: 3,
          title: wantFocus ? '焦点' : '准线',
          content: ans,
          why: wantFocus ? '焦点到顶点距离为 a' : '准线到顶点距离也为 a',
          formula: ans,
          highlightNodeIds: ['f'],
        },
      ],
      answer: ans,
    }
  }

  // 圆一般式 x²+y²+Dx+Ey+F=0
  const cir = text.match(
    /x\s*(?:\^2|²)\s*\+\s*y\s*(?:\^2|²)\s*([+-])\s*(\d+)\s*x\s*([+-])\s*(\d+)\s*y\s*([+-])\s*(\d+)\s*=\s*0/,
  )
  if (cir || (/圆/.test(text) && /x²\+y²−4x\+6y−3/.test(text))) {
    if (/x²\+y²−4x\+6y−3|=0/.test(text) && /4x/.test(text)) {
      return structuredClone({ ...EX_CONIC_CIRCLE, goal: text })
    }
    if (cir) {
      const D = (cir[1] === '-' || cir[1] === '−' ? -1 : 1) * Number(cir[2])
      const E = (cir[3] === '-' || cir[3] === '−' ? -1 : 1) * Number(cir[4])
      const F = (cir[5] === '-' || cir[5] === '−' ? -1 : 1) * Number(cir[6])
      const h = -D / 2
      const k = -E / 2
      const r2 = h * h + k * k - F
      if (r2 <= 0) return null
      const r = Math.sqrt(r2)
      const rStr = Number.isInteger(r) ? String(r) : `√${r2}`
      const ans = `圆心(${h},${k})，r=${rStr}`
      return {
        version: 1,
        problemType: 'circle_r',
        topic: 'conic',
        goal: text,
        coreIdea: '配方或公式：h=-D/2，k=-E/2，r²=h²+k²−F。',
        rootId: 'root',
        nodes: [
          {
            id: 'root',
            label: '一般式圆',
            kind: 'choice',
            children: ['h', 'k', 'r'],
            why: '读出 D,E,F 后代入',
          },
          {
            id: 'h',
            label: `h=${h}`,
            kind: 'outcome',
            children: [],
            why: 'h=−D/2',
          },
          {
            id: 'k',
            label: `k=${k}`,
            kind: 'outcome',
            children: [],
            why: 'k=−E/2',
          },
          {
            id: 'r',
            label: `r=${rStr}`,
            kind: 'outcome',
            children: [],
            why: 'r²=h²+k²−F',
          },
        ],
        steps: [
          {
            index: 1,
            title: '读系数',
            content: `D=${D}，E=${E}，F=${F}`,
            why: '一般式 x²+y²+Dx+Ey+F=0',
            highlightNodeIds: ['root'],
          },
          {
            index: 2,
            title: '圆心',
            content: `(${h},${k})`,
            why: '半系数取负',
            highlightNodeIds: ['h', 'k'],
          },
          {
            index: 3,
            title: '半径',
            content: ans,
            why: 'r² 必须为正才是圆',
            formula: ans,
            highlightNodeIds: ['r'],
          },
        ],
        answer: ans,
      }
    }
  }

  if (/25/.test(text) && /16/.test(text) && /椭圆|离心/.test(text)) {
    return structuredClone(EX_CONIC_ELLIPSE_E)
  }
  if (/9/.test(text) && /16/.test(text) && /双曲线|焦点/.test(text)) {
    return structuredClone(EX_CONIC_HYPER_F)
  }
  return null
}
