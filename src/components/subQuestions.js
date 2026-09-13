/**
 * 小问（(1)(2)(3)）切分 —— 纯展示层，不改动 steps 数据结构。
 *
 * 背景：服务端 prompt 早就要求每个 step 带 part（0=共用，N=第 N 问），
 * title 也要以「(1)」开头，但前端从来没消费过 —— 三问的题只能顺着一条
 * 时间线走到底，而不同小问的辅助线并不一样。
 *
 * 小问号的取值优先级：step.part 字段 → 标题「(N)」前缀 → 0（共用）。
 * 两条路都认，是因为线上数据可能只带其中一条；两条都取不到就返回 null，
 * 由调用方退回原来的扁平列表（零回归）。
 */

const PART_PREFIX = /^\s*[（(]\s*(\d+)\s*[）)]\s*/

/** 从标题前缀取小问号；没有则 0 */
export function partFromTitle(title) {
  const m = String(title || '').match(PART_PREFIX)
  return m ? Number(m[1]) : 0
}

/** 该 step 属于第几问：0=共用 */
export function partOfStep(step) {
  const raw = step?.part
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  return partFromTitle(step?.title)
}

/** 去掉标题里的「(N)」前缀，留下问题本身 */
export function stripPartPrefix(title) {
  return String(title || '').replace(PART_PREFIX, '').trim()
}

/**
 * 小问标题：优先取该组 conclusion 步的标题 —— prompt 要求每小问以
 * conclusion 收尾，而那条标题通常就是「求 X」本身（题面里的问法）。
 * 取第一条非空标题是兜底，但它可能只是子步骤的描述（如「由数量积定义」）。
 */
function titleFromMembers(members) {
  for (let i = members.length - 1; i >= 0; i--) {
    if (members[i]?.type === 'conclusion') {
      const t = stripPartPrefix(members[i].title)
      if (t) return t
    }
  }
  for (const m of members) {
    const t = stripPartPrefix(m?.title)
    if (t) return t
  }
  return ''
}

/** 该小问的答案：取最后一个 conclusion 步的公式/正文 */
function answerFromMembers(members) {
  for (let i = members.length - 1; i >= 0; i--) {
    if (members[i]?.type === 'conclusion') {
      return String(members[i].formula || members[i].content || '').trim()
    }
  }
  return ''
}

/**
 * 按小问把 steps 分块（只切连续段，与 prompt 对小问顺序的要求一致）。
 *
 * @returns {null | Array<{part:number, title:string, answer:string,
 *   startIndex:number, endIndex:number, steps:Array}>}
 *   null 表示没有可用的小问信息 —— 调用方应退回扁平列表
 */
export function groupStepsByPart(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) return null

  const blocks = []
  steps.forEach((step, i) => {
    const part = partOfStep(step)
    const last = blocks[blocks.length - 1]
    if (last && last.part === part) {
      last.members.push(step)
      last.endIndex = i
    } else {
      blocks.push({ part, members: [step], startIndex: i, endIndex: i })
    }
  })

  // 少于两个小问就别分组 —— 只切出一段的话，白多一层壳
  const distinct = new Set(blocks.map((b) => b.part).filter((p) => p > 0))
  if (distinct.size < 2) return null

  return blocks.map((b) => ({
    part: b.part,
    title: b.part > 0 ? titleFromMembers(b.members) : '',
    answer: b.part > 0 ? answerFromMembers(b.members) : '',
    startIndex: b.startIndex,
    endIndex: b.endIndex,
    steps: b.members,
  }))
}

/** 当前步落在哪一块（用于展开对应的小问） */
export function activeBlockIndex(blocks, currentStep = 0) {
  if (!Array.isArray(blocks) || blocks.length === 0) return -1
  const i = blocks.findIndex(
    (b) => currentStep >= b.startIndex && currentStep <= b.endIndex,
  )
  return i
}
