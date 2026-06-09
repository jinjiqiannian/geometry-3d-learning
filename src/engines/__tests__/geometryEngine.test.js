import { describe, it, expect } from 'vitest'
import {
  createGeometry,
  isPolyhedral,
  calculateVolume,
  calculateSurfaceArea,
  getVertexAndEdgeInfo,
} from '../geometryEngine'

describe('geometryEngine', () => {
  describe('getVertexAndEdgeInfo', () => {
    it('returns vertices, edges, labels for cube', () => {
      const info = getVertexAndEdgeInfo('cube', { size: 2 })
      expect(info).toHaveProperty('vertices')
      expect(info).toHaveProperty('edges')
      expect(info).toHaveProperty('labels')
      expect(info.vertices).toHaveLength(8)
      expect(info.edges).toHaveLength(12)
      expect(info.labels).toHaveLength(8)
    })

    it('returns labels for sphere', () => {
      const info = getVertexAndEdgeInfo('sphere', { size: 2 })
      expect(info).toHaveProperty('labels')
      expect(info.labels.length).toBeGreaterThan(0)
    })

    it('returns labels for cylinder', () => {
      const info = getVertexAndEdgeInfo('cylinder', { size: 2 })
      expect(info).toHaveProperty('labels')
    })

    it('returns labels for cone', () => {
      const info = getVertexAndEdgeInfo('cone', { size: 2 })
      expect(info).toHaveProperty('labels')
    })

    it('returns vertices for pyramid', () => {
      const info = getVertexAndEdgeInfo('pyramid', { size: 2 })
      expect(info).toHaveProperty('vertices')
      expect(info.vertices.length).toBe(5)
      // Pyramid labels: A, B, C, D, P
      expect(info.labels).toEqual(['A', 'B', 'C', 'D', 'P'])
    })

    it('returns vertices for prism', () => {
      const info = getVertexAndEdgeInfo('prism', { size: 2 })
      expect(info).toHaveProperty('vertices')
      expect(info.vertices.length).toBe(6)
    })

    it('returns vertices for cuboid', () => {
      const info = getVertexAndEdgeInfo('cuboid', { size: 2 })
      expect(info).toHaveProperty('vertices')
      expect(info.vertices.length).toBe(8)
    })

    it('returns vertices for squareFrustum', () => {
      const info = getVertexAndEdgeInfo('squareFrustum', { size: 2 })
      expect(info).toHaveProperty('vertices')
    })

    it('returns vertices for circularFrustum', () => {
      const info = getVertexAndEdgeInfo('circularFrustum', { size: 2 })
      expect(info).toHaveProperty('labels')
    })

    it('edges connect valid vertex indices', () => {
      const info = getVertexAndEdgeInfo('cube', { size: 2 })
      for (const [from, to] of info.edges) {
        expect(from).toBeGreaterThanOrEqual(0)
        expect(from).toBeLessThan(info.vertices.length)
        expect(to).toBeGreaterThanOrEqual(0)
        expect(to).toBeLessThan(info.vertices.length)
        expect(from).not.toBe(to)
      }
    })

    it('uses custom labels when provided', () => {
      const customLabels = ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W']
      const info = getVertexAndEdgeInfo('cube', { size: 2 }, null, customLabels)
      expect(info.labels).toEqual(customLabels)
    })

    it('uses custom vertices in free mode for polyhedral types', () => {
      const customVerts = [
        [0,0,0],[2,0,0],[2,0,2],[0,0,2],
        [0,2,0],[2,2,0],[2,2,2],[0,2,2],
      ]
      const info = getVertexAndEdgeInfo('cube', { size: 2 }, customVerts)
      expect(info.vertices).toEqual(customVerts)
      // Should still have edges topology
      expect(info.edges.length).toBe(12)
    })
  })

  describe('createGeometry', () => {
    it('creates Three.js geometry for all types without throwing', () => {
      const types = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'prism', 'cuboid', 'squareFrustum', 'circularFrustum']
      for (const t of types) {
        expect(() => createGeometry(t, { size: 2 })).not.toThrow()
      }
    })

    it('returns Three.js BufferGeometry for cube', () => {
      const geo = createGeometry('cube', { size: 2 })
      expect(geo).toBeDefined()
      expect(geo.type).toBe('BufferGeometry')
    })
  })

  describe('isPolyhedral', () => {
    it('returns true for cube', () => expect(isPolyhedral('cube')).toBe(true))
    it('returns true for cuboid', () => expect(isPolyhedral('cuboid')).toBe(true))
    it('returns true for pyramid', () => expect(isPolyhedral('pyramid')).toBe(true))
    it('returns true for prism', () => expect(isPolyhedral('prism')).toBe(true))
    it('returns true for squareFrustum', () => expect(isPolyhedral('squareFrustum')).toBe(true))
    it('returns false for sphere', () => expect(isPolyhedral('sphere')).toBe(false))
    it('returns false for cylinder', () => expect(isPolyhedral('cylinder')).toBe(false))
    it('returns false for cone', () => expect(isPolyhedral('cone')).toBe(false))
  })

  describe('calculateVolume', () => {
    it('calculates cube volume (size=side length)', () => {
      expect(calculateVolume('cube', { size: 2 })).toBeCloseTo(8)
    })

    // size=2 for sphere means diameter=2, radius=1
    it('calculates sphere volume with size as diameter', () => {
      // V = (4/3)π(1)³ ≈ 4.189
      expect(calculateVolume('sphere', { size: 2 })).toBeCloseTo(4.189, 2)
    })

    it('calculates sphere volume with size 6 (radius=3)', () => {
      // V = (4/3)π(3)³ ≈ 113.1
      expect(calculateVolume('sphere', { size: 6 })).toBeCloseTo(113.1, 0)
    })

    it('calculates cylinder volume', () => {
      // size=4 → radius=2, height=4, V = π(2)²(4) ≈ 50.27
      expect(calculateVolume('cylinder', { size: 4 })).toBeCloseTo(50.27, 1)
    })

    it('calculates cone volume', () => {
      // size=4 → radius=2, height=4, V = (1/3)π(2)²(4) ≈ 16.76
      expect(calculateVolume('cone', { size: 4 })).toBeCloseTo(16.76, 1)
    })

    it('calculates pyramid volume', () => {
      // V = (1/3)(size)³ = (1/3)(2³) ≈ 2.667
      expect(calculateVolume('pyramid', { size: 2 })).toBeCloseTo(2.667, 1)
    })

    it('returns 0 for unknown type', () => {
      expect(calculateVolume('unknown', { size: 2 })).toBe(0)
    })
  })

  describe('calculateSurfaceArea', () => {
    it('calculates cube surface area', () => {
      // S = 6(size)² = 24
      expect(calculateSurfaceArea('cube', { size: 2 })).toBeCloseTo(24)
    })

    it('calculates sphere surface area with size as diameter', () => {
      // size=2 → radius=1, S = 4π(1)² ≈ 12.57
      expect(calculateSurfaceArea('sphere', { size: 2 })).toBeCloseTo(12.57, 1)
    })

    it('returns 0 for unknown type', () => {
      expect(calculateSurfaceArea('unknown', { size: 2 })).toBe(0)
    })
  })
})
