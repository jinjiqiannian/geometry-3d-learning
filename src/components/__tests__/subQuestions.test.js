import { describe, it, expect } from 'vitest'
import {
  partFromTitle,
  partOfStep,
  stripPartPrefix,
  groupStepsByPart,
  activeBlockIndex,
} from '../subQuestions'

// 线上真实题目的步骤形状（平行六面体三小问），来自用户截图
const REAL_STEPS = [
  { title: '核心思路', type: 'observation', part: 0, content: '把空间向量用基底表示，再用数量积展开。' },
  { title: "(1) 求 AA'·AB", type: 'calculation', part: 1, content: "AB=c·a=10。" },
  { title: "(2) 求 |AB'| 的长", type: 'calculation', part: 2, content: "|AB'|²=61" },
  { title: "(3) 求 |AC'| 的长", type: 'conclusion', part: 3, content: "|AC'|=√85" },
  { title: '答案汇总', type: 'conclusion', part: 0, content: '(1) 10  (2) √61  (3) √85' },
]

describe('partFromTitle', () => {
  it('识别半角/全角括号前缀', () => {
    expect(partFromTitle("(1) 求 AA'·AB")).toBe(1)
    expect(partFromTitle('（2）求 AB 的长')).toBe(2)
    expect(partFromTitle('(12) 略')).toBe(12)
  })

  it('没有前缀返回 0', () => {
    expect(partFromTitle('核心思路')).toBe(0)
    expect(partFromTitle('答案汇总')).toBe(0)
    expect(partFromTitle('')).toBe(0)
    expect(partFromTitle(null)).toBe(0)
  })
})

describe('partOfStep', () => {
  it('优先用 part 字段', () => {
    expect(partOfStep({ part: 2, title: '核心思路' })).toBe(2)
    // part=0 是「共用」的意思，不能被标题前缀翻掉
    expect(partOfStep({ part: 0, title: '(1) 求 xx' })).toBe(0)
  })

  it('没有 part 字段时退回标题前缀', () => {
    expect(partOfStep({ title: '(3) 求 |AC\'| 的长' })).toBe(3)
    expect(partOfStep({ title: '核心思路' })).toBe(0)
  })
})

describe('stripPartPrefix', () => {
  it('去掉前缀留下小问题目本身', () => {
    expect(stripPartPrefix("(1) 求 AA'·AB")).toBe("求 AA'·AB")
    expect(stripPartPrefix('核心思路')).toBe('核心思路')
  })
})

describe('groupStepsByPart', () => {
  it('把三小问切成三块，共用步骤单独成块', () => {
    const blocks = groupStepsByPart(REAL_STEPS)
    expect(blocks).not.toBeNull()
    expect(blocks.map((b) => b.part)).toEqual([0, 1, 2, 3, 0])
    expect(blocks.map((b) => b.startIndex)).toEqual([0, 1, 2, 3, 4])
    expect(blocks.map((b) => b.endIndex)).toEqual([0, 1, 2, 3, 4])
  })

  it('小问标题取自该块第一条步骤（去掉编号前缀）', () => {
    const blocks = groupStepsByPart(REAL_STEPS)
    expect(blocks[1].title).toBe("求 AA'·AB")
    expect(blocks[2].title).toBe("求 |AB'| 的长")
  })

  it('小问标题优先取 conclusion 步的标题 —— 那条才是题面的问法', () => {
    const blocks = groupStepsByPart([
      { title: '分析', part: 0 },
      { title: '(1) 由数量积定义', type: 'calculation', part: 1 },
      { title: "(1) 求 AA'·AB", type: 'conclusion', part: 1 },
      { title: '(2) 由基底展开', type: 'calculation', part: 2 },
      { title: '(2) 求 AB 的长', type: 'conclusion', part: 2 },
    ])
    expect(blocks[1].title).toBe("求 AA'·AB")
    expect(blocks[2].title).toBe('求 AB 的长')
  })

  it('没有 conclusion 步时退回第一条标题', () => {
    const blocks = groupStepsByPart([
      { title: '(1) 由数量积定义', type: 'calculation', part: 1 },
      { title: '(1) 继续算', type: 'calculation', part: 1 },
      { title: '(2) 第二部分', type: 'calculation', part: 2 },
    ])
    expect(blocks[0].title).toBe('由数量积定义')
  })

  it('小问答案取该块最后一个 conclusion 步', () => {
    const blocks = groupStepsByPart(REAL_STEPS)
    expect(blocks[3].answer).toBe("|AC'|=√85")
  })

  it('只有一个小问时不分组（多一层壳没意义）', () => {
    expect(
      groupStepsByPart([
        { title: '(1) 求 xx', part: 1 },
        { title: '(1) 继续', part: 1 },
      ]),
    ).toBeNull()
  })

  it('完全没有小问信息时不分组 —— 这是零回归的那条路', () => {
    expect(
      groupStepsByPart([
        { title: '核心思路' },
        { title: '计算' },
        { title: '结论' },
      ]),
    ).toBeNull()
  })

  it('没有 part 字段、只有标题前缀时也能分组', () => {
    const blocks = groupStepsByPart([
      { title: '分析' },
      { title: "(1) 求 AA'·AB", content: '10' },
      { title: '(2) 求 AB 的长', content: '5' },
    ])
    expect(blocks).not.toBeNull()
    expect(blocks.map((b) => b.part)).toEqual([0, 1, 2])
  })

  it('空输入不炸', () => {
    expect(groupStepsByPart([])).toBeNull()
    expect(groupStepsByPart(null)).toBeNull()
  })
})

describe('activeBlockIndex', () => {
  it('当前步落在哪一块', () => {
    const blocks = groupStepsByPart(REAL_STEPS)
    expect(activeBlockIndex(blocks, 0)).toBe(0)
    expect(activeBlockIndex(blocks, 2)).toBe(2)
    expect(activeBlockIndex(blocks, 4)).toBe(4)
  })

  it('越界返回 -1 而不是崩', () => {
    const blocks = groupStepsByPart(REAL_STEPS)
    expect(activeBlockIndex(blocks, 99)).toBe(-1)
    expect(activeBlockIndex(null, 0)).toBe(-1)
  })
})
