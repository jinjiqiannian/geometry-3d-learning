import { describe, it, expect } from 'vitest'
import { extractJSON } from '../solve-stream.js'

describe('extractJSON', () => {
  // ★ 回归用例
  // REASON_SYSTEM_PROMPT 要求模型先用 [REASON] 前缀输出思考过程，再给 JSON。
  // 旧实现的起点选择是 Math.min(indexOf('{'), indexOf('['))，会被 [REASON]
  // 的方括号带偏，depth 在它的 ] 处归零，最后 JSON.parse("[REASON]") 报
  // Unexpected token 'R'。只要模型听话就 100% 失败，且前端静默降级到本地
  // 模板引擎 —— 症状与病因完全对不上，因此必须锁死。
  it('能从 [REASON] 前缀的推理输出里取出 JSON', () => {
    const raw =
      '[REASON] 题目给的是正方体，棱长 2\n' +
      '[REASON] 体对角线用勾股定理，先算底面对角线\n' +
      '{"steps":[{"step":1,"title":"求底面对角线"}],"answer":"2√3"}'

    expect(extractJSON(raw)).toEqual({
      steps: [{ step: 1, title: '求底面对角线' }],
      answer: '2√3',
    })
  })

  it('[REASON] 行缩进或有空行时也能剥干净', () => {
    const raw = '  [REASON] 先看已知\n\n[REASON] 再算结果\n{"ok":true}'
    expect(extractJSON(raw)).toEqual({ ok: true })
  })

  it('解析步：纯 JSON（无 [REASON] 前缀）', () => {
    expect(extractJSON('{"type":"cube","size":2}')).toEqual({
      type: 'cube',
      size: 2,
    })
  })

  it('代码块包裹', () => {
    expect(extractJSON('```json\n{"type":"cube","size":2}\n```')).toEqual({
      type: 'cube',
      size: 2,
    })
  })

  it('散文前缀 + JSON（无 [REASON]）', () => {
    expect(extractJSON('好的，我来分析这道题。\n{"type":"cube"}')).toEqual({
      type: 'cube',
    })
  })

  it('JSON 内含数组时不被误截断', () => {
    expect(extractJSON('{"steps":[{"a":1},{"b":2}]}')).toEqual({
      steps: [{ a: 1 }, { b: 2 }],
    })
  })

  it('字符串值里含花括号时不误判深度', () => {
    expect(extractJSON('{"formula":"V=⅓S·h {底}"}')).toEqual({
      formula: 'V=⅓S·h {底}',
    })
  })

  it('完全取不到 JSON 时抛错', () => {
    expect(() => extractJSON('这里没有任何 JSON')).toThrow('无法解析AI返回的JSON')
  })
})
