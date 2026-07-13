import { describe, it, expect } from 'vitest'
import { generateLocalSteps } from '../explanationEngine'

describe('explanationEngine', () => {
  describe('generateLocalSteps', () => {
    it('should generate computed steps for a cube diagonal problem', () => {
      const steps = generateLocalSteps('正方体棱长为2，求对角线', { type: 'cube', size: 2 })
      // 对角线走计算引擎 → 4 步（带真实数值）
      expect(steps).toHaveLength(4)
      expect(steps[0]).toHaveProperty('title')
      expect(steps[0]).toHaveProperty('content')
      expect(steps[0]).toHaveProperty('type')
      // 结论步骤包含真实数值（而非占位符）
      expect(steps[steps.length - 1].content).toContain('答案：')
    })

    it('should interpolate {typeName} and {size} in content', () => {
      const steps = generateLocalSteps('正方体棱长为3', { type: 'cube', size: 3 })
      expect(steps[0].content).toContain('正方体')
      expect(steps[0].content).toContain('3')
      // No leftover template markers
      expect(steps[0].content).not.toContain('{typeName}')
      expect(steps[0].content).not.toContain('{size}')
    })

    it('should handle cuboid with labels', () => {
      const steps = generateLocalSteps('长方体长3宽4高12', {
        type: 'cuboid',
        size: 12,
        labels: ['A', 'B', 'C', 'D'],
      })
      expect(steps).toHaveLength(5)
      expect(steps[0].content).toContain('长方体')
    })

    it('should detect diagonal problem type for cube', () => {
      const diagonalSteps = generateLocalSteps('正方体对角线AG长度', { type: 'cube', size: 2 })
      const defaultSteps = generateLocalSteps('正方体体积', { type: 'cube', size: 2 })
      // computed diagonal steps vs template default steps
      expect(diagonalSteps[0].content).not.toBe(defaultSteps[0].content)
    })

    it('should detect skew lines problem type for cube', () => {
      const steps = generateLocalSteps('求异面直线AB与CD的夹角', { type: 'cube', size: 2 })
      expect(steps[0].content).toContain('正方体')
      expect(steps[1].content).toContain('异面')
    })

    it('should handle sphere with computed volume', () => {
      const steps = generateLocalSteps('球半径3求体积', { type: 'sphere', size: 3 })
      // 体积走计算引擎 → 3 步
      expect(steps).toHaveLength(3)
      expect(steps[0].content).toContain('球体')
      // 结论包含真实体积数值
      const last = steps[steps.length - 1]
      expect(last.content).toContain('π')
      expect(last.type).toBe('conclusion')
    })

    it('should handle cone', () => {
      const steps = generateLocalSteps('圆锥底面半径3高4', { type: 'cone', size: 3 })
      expect(steps).toHaveLength(5)
      expect(steps[0].content).toContain('圆锥')
    })

    it('should handle pyramid', () => {
      const steps = generateLocalSteps('正四棱锥底面边长4高6', { type: 'pyramid', size: 4 })
      expect(steps).toHaveLength(5)
      expect(steps[0].content).toContain('棱锥')
    })

    it('should use generic fallback for unknown geometry type', () => {
      const steps = generateLocalSteps('奇怪形状', { type: 'unknown_shape', size: 5 })
      expect(steps).toHaveLength(5)
      // Generic fallback should have interpolated typeName
      expect(steps[0].content).toContain('unknown_shape')
    })

    it('should handle null/empty parsed data gracefully', () => {
      const steps = generateLocalSteps('随便', null)
      expect(steps).toHaveLength(5)
      // Should default to cube
      expect(steps[0].content).toContain('正方体')
    })
  })
})
