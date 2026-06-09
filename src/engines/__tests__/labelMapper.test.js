import { describe, it, expect } from 'vitest'
import {
  normalizeSubscripts,
  toSubscriptDisplay,
  createLabelMap,
  resolveEdge,
  extractVerticesFromText,
  validateLabels,
  INTERNAL_LABELS,
} from '../labelMapper'

describe('labelMapper', () => {
  describe('normalizeSubscripts', () => {
    it('converts Unicode subscripts to plain numbers', () => {
      expect(normalizeSubscripts('A₁')).toBe('A1')
      expect(normalizeSubscripts('A₁B₁C₁D₁')).toBe('A1B1C1D1')
      expect(normalizeSubscripts('ABCD')).toBe('ABCD')
    })

    it('handles mixed content', () => {
      expect(normalizeSubscripts('A₁B₂C₃')).toBe('A1B2C3')
    })

    it('handles empty string', () => {
      expect(normalizeSubscripts('')).toBe('')
    })
  })

  describe('toSubscriptDisplay', () => {
    it('converts plain numbers to Unicode subscripts', () => {
      expect(toSubscriptDisplay('A1')).toBe('A₁')
      expect(toSubscriptDisplay('B2')).toBe('B₂')
    })

    it('does not modify plain letters', () => {
      expect(toSubscriptDisplay('ABC')).toBe('ABC')
    })
  })

  describe('createLabelMap', () => {
    it('returns correct mapping for standard cube labels', () => {
      const userLabels = ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']
      const internalLabels = INTERNAL_LABELS.cube
      const map = createLabelMap(userLabels, internalLabels)

      expect(map.labelToIndex['A']).toBe(0)
      expect(map.labelToIndex['A1']).toBe(4)
      expect(map.indexToLabel[0]).toBe('A')
      expect(map.indexToLabel[4]).toBe('A1')
      expect(map.displayLabels).toHaveLength(8)
    })

    it('returns identity map when no user labels provided', () => {
      const map = createLabelMap(null, INTERNAL_LABELS.cube)
      expect(map).not.toBeNull()
      expect(map.displayLabels).toEqual(INTERNAL_LABELS.cube)
    })

    it('handles longer user label list', () => {
      const map = createLabelMap(['P', 'Q', 'R', 'S', 'T'], INTERNAL_LABELS.pyramid)
      expect(map.labelToIndex['P']).toBe(0)
      expect(map.labelToIndex['T']).toBe(4)
    })
  })

  describe('resolveEdge', () => {
    it('resolves simple two-letter edge', () => {
      const map = createLabelMap(INTERNAL_LABELS.cube, INTERNAL_LABELS.cube)
      const result = resolveEdge('AB', map)
      expect(result).toBe('AB')
    })

    it('resolves edge with subscript user labels', () => {
      const userLabels = ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']
      const map = createLabelMap(userLabels, INTERNAL_LABELS.cube)
      // A1 (index 4 = E) to B (index 1 = B) → EB
      const result = resolveEdge('A1B', map)
      expect(result).toBe('BE')
    })

    it('returns null for unknown edges', () => {
      const map = createLabelMap(INTERNAL_LABELS.cube, INTERNAL_LABELS.cube)
      const result = resolveEdge('XY', map)
      expect(result).toBeNull()
    })

    it('returns null for empty input', () => {
      const map = createLabelMap(INTERNAL_LABELS.cube, INTERNAL_LABELS.cube)
      expect(resolveEdge('', map)).toBeNull()
      expect(resolveEdge(null, map)).toBeNull()
    })
  })

  describe('extractVerticesFromText', () => {
    it('extracts ABCD-EFGH pattern', () => {
      const result = extractVerticesFromText('正方体ABCD-EFGH棱长为2')
      expect(result).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
    })

    it('extracts subscript pattern ABCD-A₁B₁C₁D₁', () => {
      const result = extractVerticesFromText('正方体ABCD-A₁B₁C₁D₁的棱长为2')
      expect(result).toEqual(['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'])
    })

    it('extracts pyramid pattern P-ABCD', () => {
      const result = extractVerticesFromText('正四棱锥P-ABCD底面边长为4')
      // Actual order: apex first, then base vertices
      expect(result).toEqual(['P', 'A', 'B', 'C', 'D'])
    })

    it('returns null for text without vertex labels', () => {
      const result = extractVerticesFromText('求一个球体的体积')
      expect(result).toBeNull()
    })

    it('returns null for empty text', () => {
      expect(extractVerticesFromText('')).toBeNull()
      expect(extractVerticesFromText(null)).toBeNull()
    })
  })

  describe('validateLabels', () => {
    it('returns valid for matching label sets', () => {
      const result = validateLabels(INTERNAL_LABELS.cube, INTERNAL_LABELS.cube)
      expect(result.valid).toBe(true)
      expect(result.warning).toBeNull()
    })

    it('returns invalid for mismatched lengths', () => {
      const result = validateLabels(['A', 'B'], INTERNAL_LABELS.cube)
      expect(result.valid).toBe(false)
      expect(result.warning).toContain('数量不匹配')
    })

    it('returns invalid for duplicate labels', () => {
      const result = validateLabels(['A', 'A', 'C', 'D', 'E', 'F', 'G', 'H'], INTERNAL_LABELS.cube)
      expect(result.valid).toBe(false)
      expect(result.warning).toContain('重复')
    })

    it('returns invalid for null input', () => {
      expect(validateLabels(null, null).valid).toBe(false)
    })
  })
})
