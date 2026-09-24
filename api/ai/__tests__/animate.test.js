import { describe, it, expect } from 'vitest'
import { buildAnimatePrompt, extractJSON } from '../animate.js'

const CUBOID = {
  id: 'cuboid',
  slots: {
    a: { type: 'number', min: 0.1, max: 10, unit: 'cm' },
    b: { type: 'number', min: 0.1, max: 10, unit: 'cm' },
    c: { type: 'number', min: 0.1, max: 10, unit: 'cm' },
  },
  derived: { V: 'a*b*c', S: '2*(a*b+b*c+a*c)', diagonal: 'sqrt(a*a+b*b+c*c)' },
  anchors: ['face-front', 'vertex-a', 'center'],
}

describe('animate.extractJSON', () => {
  it('能从 [REASON] 前缀输出里取出 JSON', () => {
    const raw = '[REASON] 先让 a 变大\n{"scene":"cuboid","tracks":[]}'
    expect(extractJSON(raw)).toEqual({ scene: 'cuboid', tracks: [] })
  })

  it('代码块包裹', () => {
    expect(extractJSON('```json\n{"scene":"cuboid","tracks":[]}\n```')).toEqual({
      scene: 'cuboid',
      tracks: [],
    })
  })

  it('字符串值里含花括号时不误判深度', () => {
    expect(extractJSON('{"overlays":[{"text":"V = a*b*c {box}"}]}')).toEqual({
      overlays: [{ text: 'V = a*b*c {box}' }],
    })
  })

  it('完全取不到 JSON 时抛错', () => {
    expect(() => extractJSON('这里没有任何 JSON')).toThrow('无法解析AI返回的JSON')
  })
})

describe('animate.buildAnimatePrompt', () => {
  const { system, user } = buildAnimatePrompt({ sceneIR: { scene: 'cuboid' }, explainIR: { steps: [] }, primitive: CUBOID })

  it('槽位名与范围原样出现在提示词里', () => {
    expect(system).toContain('a:')
    expect(system).toContain('0.1 ~ 10')
    expect(system).toContain('单位 cm')
  })

  it('锚点白名单原样出现', () => {
    expect(system).toContain('face-front')
    expect(system).toContain('vertex-a')
    expect(system).toContain('center')
  })

  it('派生量明确标注为只读、禁止写入', () => {
    expect(system).toContain('V = a*b*c')
    expect(system).toContain('禁止写入输出')
  })

  it('缓动白名单与 scene id 落到提示词', () => {
    expect(system).toContain('easeInOut')
    expect(system).toContain('"scene": "cuboid"')
  })

  it('user 段携带已校验的 SceneIR / ExplainIR', () => {
    expect(user).toContain('"scene":"cuboid"')
    expect(user).toContain('"steps":[]')
  })

  it('弱 schema 时不崩（缺 slots / anchors / derived）', () => {
    const weak = buildAnimatePrompt({ primitive: { id: 'x' } })
    expect(weak.system).toContain('（无）')
    expect(weak.system).toContain('"scene": "x"')
  })
})
