import { describe, it, expect } from 'vitest'
import { mergeVisionHints } from '../mergeVisionHints'

describe('mergeVisionHints — 文字优先', () => {
  it('只补文字没有的 relation / point', () => {
    const semantic = {
      shape: 'pyramid',
      points: ['P', 'A', 'B', 'C', 'D'],
      relations: ['PA perpendicular plane ABCD'],
      planes: [{ label: 'ABCD', points: ['A', 'B', 'C', 'D'] }],
      importantPlanes: ['ABCD'],
      pointPositions: { P: [0, 1, 0] },
    }
    const out = mergeVisionHints(semantic, {
      points: ['E', 'A'],
      relations: [
        'PA perpendicular plane ABCD', // 冲突：跳过
        'E midpoint PD', // 新增
      ],
      planes: ['ABCD', 'PAC'],
    })
    expect(out.points).toContain('E')
    expect(out.points.filter((p) => p === 'A')).toHaveLength(1)
    expect(out.relations).toContain('E midpoint PD')
    expect(out.relations.filter((r) => r.startsWith('PA perpendicular'))).toHaveLength(1)
    expect(out.importantPlanes).toContain('PAC')
    expect(out.pointPositions).toBeUndefined()
  })
})
