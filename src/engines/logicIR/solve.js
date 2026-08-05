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
  // 先走通用古典概率（至少一红 / 先红后白 / 放回…），再回落样例
  const classical = tryClassicalProb(raw)
  if (classical) return classical

  if (
    raw.includes('红') &&
    raw.includes('白') &&
    raw.includes('不放回') &&
    /都是红|全红|两.*红|红红|两次都红/.test(raw)
  ) {
    const m = raw.match(/(\d+)\s*红.*?(\d+)\s*白/)
    if (m && m[1] === '3' && m[2] === '2') {
      return structuredClone(EXAMPLE_CLASSICAL_PROB)
    }
  }

  return (
    tryOrderedOfficers(raw) ||
    tryCombination(raw) ||
    tryMultiplyClothes(raw) ||
    tryPermutation(raw) ||
    tryClassifyAdd(raw) ||
    null
  )
}

/**
 * 袋中 a 红 b 白，连抽 2 次 — 覆盖高考基础：
 * 不放回都红 / 先红后白 / 放回都红 / 至少一红
 */
function tryClassicalProb(text) {
  if (!/概率|几率|抽/.test(text) && !/红/.test(text)) return null
  const balls = text.match(/(\d+)\s*红.*?(\d+)\s*白/)
  if (!balls) return null
  const red = Number(balls[1])
  const white = Number(balls[2])
  const total = red + white
  if (total < 2) return null

  const withReplace = /放回/.test(text) && !/不放回/.test(text)
  const wantRW =
    /先红后白|第一次.*红.*第二次.*白|红后白/.test(text)
  const wantAtLeastOneRed = /至少.*(?:一)?红|不全白/.test(text)
  const wantBothRed =
    /都是红|全红|两.*红|红红|两次都红/.test(text) ||
    (!wantRW && !wantAtLeastOneRed)

  if (wantAtLeastOneRed && !withReplace) {
    if (white < 2) return null
    // P(至少一红)=1-P(白白)
    const ww = simplifyFrac(white * (white - 1), total * (total - 1))
    const atLeast = simplifyFrac(ww.den - ww.num, ww.den)
    return buildTwoDrawProbIR(text, {
      red,
      white,
      total,
      withReplace: false,
      pathLabel: '至少一红 = 1 − 白白',
      p1n: white,
      p1d: total,
      p2n: white - 1,
      p2d: total - 1,
      answerNum: atLeast.num,
      answerDen: atLeast.den,
      formulaNote: `1−(${ww.num}/${ww.den})=${atLeast.num}/${atLeast.den}`,
      isComplement: true,
    })
  }

  if (wantRW) {
    if (red < 1 || white < 1) return null
    if (withReplace) {
      const { num, den } = simplifyFrac(red * white, total * total)
      return buildTwoDrawProbIR(text, {
        red,
        white,
        total,
        withReplace: true,
        pathLabel: '红→白',
        p1n: red,
        p1d: total,
        p2n: white,
        p2d: total,
        answerNum: num,
        answerDen: den,
      })
    }
    const { num, den } = simplifyFrac(red * white, total * (total - 1))
    return buildTwoDrawProbIR(text, {
      red,
      white,
      total,
      withReplace: false,
      pathLabel: '红→白',
      p1n: red,
      p1d: total,
      p2n: white,
      p2d: total - 1,
      answerNum: num,
      answerDen: den,
    })
  }

  // 默认：都是红
  if (wantBothRed) {
    if (red < 2 && !withReplace) return null
    if (withReplace) {
      const { num, den } = simplifyFrac(red * red, total * total)
      return buildTwoDrawProbIR(text, {
        red,
        white,
        total,
        withReplace: true,
        pathLabel: '红→红',
        p1n: red,
        p1d: total,
        p2n: red,
        p2d: total,
        answerNum: num,
        answerDen: den,
      })
    }
    const { num, den } = simplifyFrac(red * (red - 1), total * (total - 1))
    return buildTwoDrawProbIR(text, {
      red,
      white,
      total,
      withReplace: false,
      pathLabel: '红→红',
      p1n: red,
      p1d: total,
      p2n: red - 1,
      p2d: total - 1,
      answerNum: num,
      answerDen: den,
    })
  }

  return null
}

function buildTwoDrawProbIR(text, opts) {
  const {
    red,
    white,
    total,
    withReplace,
    pathLabel,
    p1n,
    p1d,
    p2n,
    p2d,
    answerNum,
    answerDen,
    formulaNote,
    isComplement,
  } = opts
  const mode = withReplace ? '放回' : '不放回'
  const mul = formulaNote || `(${p1n}/${p1d})×(${p2n}/${p2d})=${answerNum}/${answerDen}`

  return {
    version: LOGIC_IR_VERSION,
    problemType: 'classical_prob',
    goal: text,
    coreIdea: isComplement
      ? '至少一红用对立事件：1−全白。'
      : `用树形图看清${mode}下每一步样本，再沿目标路径相乘。`,
    rootId: 'root',
    nodes: [
      {
        id: 'root',
        label: `第一次抽（${mode}）`,
        kind: 'choice',
        children: ['r1', 'w1'],
        why: `一共 ${total} 球（红${red} 白${white}）`,
      },
      {
        id: 'r1',
        label: `红 (${red}/${total})`,
        count: red,
        kind: 'case',
        children: ['leaf'],
        why: withReplace ? '放回后总数不变' : `抽后剩 ${total - 1} 球`,
      },
      {
        id: 'w1',
        label: `白 (${white}/${total})`,
        count: white,
        kind: 'case',
        children: [],
        why: '对照分支',
      },
      {
        id: 'leaf',
        label: pathLabel,
        kind: 'outcome',
        children: [],
        why: `目标路径：${pathLabel}`,
      },
    ],
    steps: [
      {
        index: 1,
        title: `第一次（${mode}）`,
        content: `P₁ 相关分数 ${p1n}/${p1d}。`,
        why: '古典概型：有利 / 全体',
        op: 'divide',
        formula: `${p1n}/${p1d}`,
        highlightNodeIds: ['root', 'r1'],
      },
      {
        index: 2,
        title: '第二次',
        content: withReplace
          ? `放回：分母仍是 ${total} → ${p2n}/${p2d}。`
          : `不放回：分母变为 ${total - 1} → ${p2n}/${p2d}。`,
        why: withReplace ? '放回则独立' : '条件变了，分母分子都要更新',
        op: 'divide',
        formula: `${p2n}/${p2d}`,
        highlightNodeIds: ['r1', 'leaf'],
      },
      {
        index: 3,
        title: isComplement ? '对立事件' : '沿路径相乘',
        content: mul,
        why: isComplement ? '正面难算时用对立' : '同一路径连续事件用乘法',
        op: 'conclude',
        formula: `${answerNum}/${answerDen}`,
        highlightNodeIds: ['r1', 'leaf'],
      },
    ],
    answer: `${answerNum}/${answerDen}`,
    answerLatex: `\\dfrac{${answerNum}}{${answerDen}}`,
  }
}

/** 分类加法：或走 A 或走 B（高考基础乘法原理 / 加法原理） */
function tryClassifyAdd(text) {
  if (!/分类|或者|两类|两种方法|从.*或.*中/.test(text) && !/加原/.test(text)) {
    // 「甲乙两班…各选」类
    if (!/甲.*乙|两个班|两班/.test(text)) return null
  }
  const nums = [...text.matchAll(/(\d+)\s*(?:人|种|个|名)/g)].map((m) => Number(m[1]))
  if (nums.length < 2) return null
  // 两班各选 1 人：n1+n2；或「有 a 种方法或 b 种方法」
  if (/各选\s*1|选\s*1\s*(?:人|名)|一名代表|选1名代表/.test(text) || /或者|分类/.test(text)) {
    const a = nums[0]
    const b = nums[1]
    const ans = a + b
    return {
      version: LOGIC_IR_VERSION,
      problemType: 'multiply_add',
      goal: text,
      coreIdea: '完成这件事只需走一类办法 → 分类相加。',
      rootId: 'root',
      nodes: [
        {
          id: 'root',
          label: '分类',
          kind: 'add',
          children: ['c1', 'c2'],
          why: '两类办法互斥，用加法',
        },
        {
          id: 'c1',
          label: `第一类 ${a}`,
          count: a,
          kind: 'case',
          children: [],
          why: `${a} 种`,
        },
        {
          id: 'c2',
          label: `第二类 ${b}`,
          count: b,
          kind: 'case',
          children: [],
          why: `${b} 种`,
        },
      ],
      steps: [
        {
          index: 1,
          title: '识别：分类',
          content: '只需完成其中一类即可 → 加法原理。',
          why: '分类用加，分步才用乘',
          highlightNodeIds: ['root'],
        },
        {
          index: 2,
          title: '两类选法',
          content: `第一类 ${a} 种，第二类 ${b} 种。`,
          why: '两类互斥、不重不漏',
          formula: `${a}+${b}`,
          highlightNodeIds: ['c1', 'c2'],
        },
        {
          index: 3,
          title: '合并',
          content: `${a}+${b}=${ans}。`,
          why: '分类相加',
          op: 'conclude',
          formula: String(ans),
          highlightNodeIds: ['root', 'c1', 'c2'],
        },
      ],
      answer: String(ans),
      answerLatex: String(ans),
    }
  }
  return null
}

/** 从 n 人选正副 / 班长与委员等有序职务 */
function tryOrderedOfficers(text) {
  const hasOrder =
    /(正|副).*(正|副)/.test(text) ||
    /班长.*副|正副|主席.*书记|有序|排列|名次|冠军.*亚军/.test(text) ||
    /班长.*委员|委员.*委员|各\s*[1一]\s*人/.test(text)
  if (!hasOrder) return null

  const nMatch =
    text.match(/从\s*(\d+)\s*人/) ||
    text.match(/(\d+)\s*名?(?:同学|学生|人)/) ||
    text.match(/共\s*(\d+)\s*人/)
  if (!nMatch) return null
  const n = Number(nMatch[1])
  if (n < 2 || n > 30) return null

  // 默认两职：正副；若写「选 k 人且有序」用 k；若「班长、…、…各1人」数职务
  let k = 2
  const roleList = text.match(/选([^，。？?\n]{2,48}?)各\s*[1一]\s*人/)
  if (roleList) {
    const parts = roleList[1]
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length >= 2) k = parts.length
  } else {
    const kMatch = text.match(/选\s*(\d+)\s*人/)
    if (kMatch && !/(正|副)/.test(text)) k = Number(kMatch[1])
  }
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
    text.match(/从\s*(\d+)\s*(?:人|名|个|位)/) ||
    text.match(/(\d+)\s*名?(?:同学|学生|人)中/) ||
    text.match(/(\d+)\s*个(?:不同)?(?:元素|球|物品|数)/)
  const kMatch =
    text.match(/选\s*(\d+)\s*(?:人|名|个|位)/) ||
    text.match(/取\s*(\d+)\s*(?:人|名|个)/) ||
    text.match(/抽\s*(\d+)\s*(?:人|名|个)/) ||
    text.match(/取出\s*(\d+)/)
  if (!nMatch || !kMatch) return null
  if (
    !/代表|委员|小组|无.*(职务|职位|差别)|组合|多少种|选法/.test(text) &&
    !/选/.test(text)
  ) {
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
