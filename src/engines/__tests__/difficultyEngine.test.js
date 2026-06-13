import { describe, it, expect } from 'vitest'
import { recommendProblems, analyzeHistory, DIFFICULTY_LEVELS } from '../difficultyEngine'

describe('difficultyEngine', () => {
  describe('DIFFICULTY_LEVELS', () => {
    it('has three difficulty levels', () => {
      expect(DIFFICULTY_LEVELS).toHaveProperty('easy')
      expect(DIFFICULTY_LEVELS).toHaveProperty('medium')
      expect(DIFFICULTY_LEVELS).toHaveProperty('hard')
    })

    it('each level has types array', () => {
      expect(Array.isArray(DIFFICULTY_LEVELS.easy)).toBe(true)
      expect(Array.isArray(DIFFICULTY_LEVELS.medium)).toBe(true)
      expect(Array.isArray(DIFFICULTY_LEVELS.hard)).toBe(true)
    })
  })

  describe('analyzeHistory', () => {
    it('returns empty stats for empty history', () => {
      const stats = analyzeHistory([])
      expect(stats.totalProblems).toBe(0)
      expect(stats.typedCount).toEqual({})
      expect(stats.level).toBe('beginner')
    })

    it('returns empty stats for null history', () => {
      const stats = analyzeHistory(null)
      expect(stats.totalProblems).toBe(0)
    })

    it('counts problems by type correctly', () => {
      const history = [
        { text: '正方体', type: 'cube', steps: [] },
        { text: '正方体2', type: 'cube', steps: [] },
        { text: '球体', type: 'sphere', steps: [] },
      ]
      const stats = analyzeHistory(history)
      expect(stats.totalProblems).toBe(3)
      expect(stats.typedCount.cube).toBe(2)
      expect(stats.typedCount.sphere).toBe(1)
    })

    it('detects advanced user (10+ problems)', () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        text: `题目${i}`,
        type: 'cube',
        steps: [],
      }))
      const stats = analyzeHistory(history)
      expect(stats.level).toBe('advanced')
    })

    it('detects intermediate user (3-9 problems)', () => {
      const history = Array.from({ length: 5 }, (_, i) => ({
        text: `题目${i}`,
        type: 'cube',
        steps: [],
      }))
      const stats = analyzeHistory(history)
      expect(stats.level).toBe('intermediate')
    })

    it('identifies unused geometry types', () => {
      const history = [
        { text: '正方体', type: 'cube', steps: [] },
        { text: '球体', type: 'sphere', steps: [] },
      ]
      const stats = analyzeHistory(history)
      expect(stats.unused).toContain('cone')
      expect(stats.unused).toContain('pyramid')
      // Already used types should not be in unused
      expect(stats.unused).not.toContain('cube')
      expect(stats.unused).not.toContain('sphere')
    })
  })

  describe('recommendProblems', () => {
    it('returns default recommends for empty history', () => {
      const result = recommendProblems([])
      expect(result).toHaveProperty('recommendations')
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.reason).toBeTruthy()
    })

    it('returns recommendations from unused types when available', () => {
      const history = [
        { text: '正方体', type: 'cube', steps: [] },
        { text: '长方体', type: 'cuboid', steps: [] },
      ]
      const result = recommendProblems(history)
      expect(result.recommendations.length).toBeGreaterThan(0)
      // Should recommend from unused types
      const types = result.recommendations.map(r => r.type)
      expect(new Set(types).size).toBeGreaterThan(0)
    })

    it('each recommendation has required fields', () => {
      const result = recommendProblems([])
      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty('type')
        expect(rec).toHaveProperty('title')
        expect(rec).toHaveProperty('reason')
        expect(rec).toHaveProperty('difficulty')
      }
    })

    it('returns up to 3 recommendations', () => {
      const result = recommendProblems([])
      expect(result.recommendations.length).toBeLessThanOrEqual(3)
    })

    it('advanced users get harder recommendations', () => {
      const history = Array.from({ length: 15 }, (_, i) => ({
        text: `题目${i}`,
        type: i % 4 === 0 ? 'cube' : i % 4 === 1 ? 'sphere' : i % 4 === 2 ? 'cylinder' : 'cone',
        steps: [],
      }))
      const result = recommendProblems(history)
      // Advanced users should see medium or hard recommendations
      const difficulties = result.recommendations.map(r => r.difficulty)
      expect(difficulties.some(d => d === 'medium' || d === 'hard')).toBe(true)
    })
  })
})
