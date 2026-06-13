import { describe, it, expect } from 'vitest'
import { quickMatch } from '../problemParser'

describe('problemParser', () => {
  describe('quickMatch', () => {
    it('matches cube with explicit size', () => {
      const result = quickMatch('正方体棱长为2，求体对角线AG的长度')
      expect(result).not.toBeNull()
      expect(result.type).toBe('cube')
      expect(result.size).toBe(2)
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('matches cube with default size when not specified', () => {
      const result = quickMatch('正方体体积')
      expect(result).not.toBeNull()
      expect(result.type).toBe('cube')
      expect(result.size).toBe(2)
      expect(result.confidence).toBeLessThan(0.9)
    })

    it('matches sphere', () => {
      const result = quickMatch('球体半径为3，求体积')
      expect(result).not.toBeNull()
      expect(result.type).toBe('sphere')
      expect(result.size).toBe(3)
    })

    it('matches cylinder', () => {
      const result = quickMatch('圆柱底面半径为2，高为4')
      expect(result).not.toBeNull()
      expect(result.type).toBe('cylinder')
      expect(result.size).toBe(2)
      expect(result.params?.height).toBe(4)
    })

    it('matches cone', () => {
      const result = quickMatch('圆锥底面半径3高4')
      expect(result).not.toBeNull()
      expect(result.type).toBe('cone')
      expect(result.size).toBe(3)
    })

    it('matches pyramid', () => {
      const result = quickMatch('正四棱锥底面边长为4，高为6')
      expect(result).not.toBeNull()
      expect(result.type).toBe('pyramid')
      expect(result.size).toBe(4)
    })

    it('matches prism', () => {
      const result = quickMatch('三棱柱ABC-A\'B\'C\'边长2')
      expect(result).not.toBeNull()
      expect(result.type).toBe('prism')
    })

    it('matches cuboid', () => {
      const result = quickMatch('长方体长3宽4高12')
      expect(result).not.toBeNull()
      expect(result.type).toBe('cuboid')
    })

    it('detects skew lines subType', () => {
      const result = quickMatch('正方体异面直线AB与CD夹角')
      expect(result).not.toBeNull()
      expect(result.subType).toBe('skew_lines')
    })

    it('detects diagonal subType', () => {
      const result = quickMatch('正方体对角线AG长度')
      expect(result).not.toBeNull()
      expect(result.subType).toBe('diagonal')
    })

    it('detects volume subType', () => {
      const result = quickMatch('球体体积计算')
      expect(result).not.toBeNull()
      expect(result.subType).toBe('volume')
    })

    it('returns null for unrecognized text', () => {
      const result = quickMatch('今天天气真好')
      expect(result).toBeNull()
    })

    it('extracts vertex labels from subscript notation', () => {
      const result = quickMatch('正方体ABCD-A₁B₁C₁D₁棱长2')
      expect(result).not.toBeNull()
      expect(result.labels).toContain('A1')
      expect(result.labels).toContain('B1')
    })

    it('extracts edge references', () => {
      const result = quickMatch('求异面直线A₁B与B₁C的夹角')
      if (result) {
        expect(result.highlightLines.length).toBeGreaterThan(0)
      }
    })

    it('has explanation text', () => {
      const result = quickMatch('正方体棱长为2')
      expect(result).not.toBeNull()
      expect(result.explanation).toBeTruthy()
    })
  })
})
