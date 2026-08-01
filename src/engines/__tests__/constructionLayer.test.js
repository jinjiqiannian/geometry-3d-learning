/**
 * Construction Layer 测试 - 几何构造生命周期验证
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ConstructionManager, createConstructionManager } from '../proofEngine/v2/construction/constructionManager.js'
import { CONSTRUCTION_STATUS } from '../proofEngine/v2/construction/objectRegistry.js'
import { validateConstruction } from '../proofEngine/v2/construction/validators.js'
import { createFactRegistry } from '../proofEngine/v2/factRegistry.js'

describe('Construction Layer', () => {
  let manager
  let factRegistry

  beforeEach(() => {
    manager = createConstructionManager()
    factRegistry = createFactRegistry()
    manager.setFactRegistry(factRegistry)
  })

  describe('A. ObjectRegistry - 基本操作', () => {
    it('注册对象并获取', () => {
      const obj = {
        type: 'point',
        points: ['G'],
        label: 'G',
      }
      const registered = manager.getObject(manager.objectRegistry.register(obj).id)
      expect(registered).not.toBeNull()
      expect(registered.label).toBe('G')
    })

    it('检查对象是否存在', () => {
      const obj = { type: 'point', points: ['G'], label: 'G' }
      const id = manager.objectRegistry.register(obj).id
      expect(manager.objectRegistry.has(id)).toBe(true)
      expect(manager.objectRegistry.has('nonexistent')).toBe(false)
    })

    it('更新对象状态', () => {
      const obj = { type: 'point', points: ['G'], label: 'G' }
      const id = manager.objectRegistry.register(obj).id
      manager.objectRegistry.updateStatus(id, CONSTRUCTION_STATUS.ACTIVE)
      expect(manager.getObject(id).status).toBe(CONSTRUCTION_STATUS.ACTIVE)
    })
  })

  describe('B. Validators - 验证器', () => {
    it('点构造验证 - 新点', () => {
      const result = validateConstruction(
        { type: 'point', label: 'G', points: ['G'] },
        { existingPoints: ['A', 'B', 'C'] }
      )
      expect(result.valid).toBe(true)
      expect(result.generatedFacts.length).toBeGreaterThan(0)
    })

    it('点构造验证 - 重复点', () => {
      const result = validateConstruction(
        { type: 'point', label: 'A', points: ['A'] },
        { existingPoints: ['A', 'B', 'C'] }
      )
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('已存在')
    })

    it('线相交验证 - 有效', () => {
      const facts = [
        { type: 'line', subjects: ['B', 'E'], description: '线 BE' },
        { type: 'line', subjects: ['A', 'C'], description: '线 AC' },
      ]
      const result = validateConstruction(
        { type: 'line_intersection', label: 'G', parameters: { line1: 'BE', line2: 'AC' } },
        { facts }
      )
      expect(result.valid).toBe(true)
    })

    it('线相交验证 - 平行线', () => {
      const facts = [
        { type: 'line', subjects: ['A', 'B'], description: '线 AB' },
        { type: 'line', subjects: ['C', 'D'], description: '线 CD' },
        { type: 'parallel', subjects: ['AB', 'CD'], description: 'AB 平行 CD' },
      ]
      const result = validateConstruction(
        { type: 'line_intersection', label: 'G', parameters: { line1: 'AB', line2: 'CD' } },
        { facts }
      )
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('平行')
    })

    it('平面相交验证 - 有效', () => {
      const facts = [
        { type: 'plane', subjects: ['A', 'B', 'C'], description: '平面 ABC' },
        { type: 'plane', subjects: ['D', 'E', 'F'], description: '平面 DEF' },
      ]
      const result = validateConstruction(
        { type: 'plane_intersection', label: 'L', parameters: { plane1: 'ABC', plane2: 'DEF' } },
        { facts }
      )
      expect(result.valid).toBe(true)
    })

    it('平面相交验证 - 平行平面', () => {
      const facts = [
        { type: 'plane', subjects: ['A', 'B', 'C'], description: '平面 ABC' },
        { type: 'plane', subjects: ['A1', 'B1', 'C1'], description: '平面 A1B1C1' },
        { type: 'parallel', subjects: ['ABC', 'A1B1C1'], description: 'ABC 平行 A1B1C1' },
      ]
      const result = validateConstruction(
        { type: 'plane_intersection', label: 'L', parameters: { plane1: 'ABC', plane2: 'A1B1C1' } },
        { facts }
      )
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('平行')
    })
  })

  describe('C. ConstructionManager - 生命周期流程', () => {
    it('Case 1: G = BE ∩ AC → PROPOSED → VALIDATING → ACTIVE', () => {
      factRegistry.addFact({ type: 'line', subjects: ['B', 'E'], description: '线 BE' })
      factRegistry.addFact({ type: 'line', subjects: ['A', 'C'], description: '线 AC' })

      const result = manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'BE', line2: 'AC' },
        creatorRule: 'intersection_rule',
      })

      expect(result.status).toBe(CONSTRUCTION_STATUS.ACTIVE)
      expect(result.validationResult.valid).toBe(true)
      expect(result.spawnedFacts.length).toBeGreaterThan(0)
    })

    it('Case 2: 平行线求交点 → REJECTED', () => {
      factRegistry.addFact({ type: 'line', subjects: ['A', 'B'], description: '线 AB' })
      factRegistry.addFact({ type: 'line', subjects: ['C', 'D'], description: '线 CD' })
      factRegistry.addFact({ type: 'parallel', subjects: ['AB', 'CD'], description: 'AB 平行 CD' })

      const result = manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'AB', line2: 'CD' },
      })

      expect(result.status).toBe(CONSTRUCTION_STATUS.REJECTED)
      expect(result.validationResult.valid).toBe(false)
      expect(result.validationResult.reason).toContain('平行')
    })

    it('Case 3: 重复构造 → REDUNDANT', () => {
      factRegistry.addFact({ type: 'line', subjects: ['B', 'E'], description: '线 BE' })
      factRegistry.addFact({ type: 'line', subjects: ['A', 'C'], description: '线 AC' })

      const result1 = manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'BE', line2: 'AC' },
      })

      expect(result1.status).toBe(CONSTRUCTION_STATUS.ACTIVE)

      const result2 = manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'AC', line2: 'BE' },
      })

      expect(result2.status).toBe(CONSTRUCTION_STATUS.REDUNDANT)
    })

    it('标记对象为已消费', () => {
      factRegistry.addFact({ type: 'line', subjects: ['B', 'E'], description: '线 BE' })
      factRegistry.addFact({ type: 'line', subjects: ['A', 'C'], description: '线 AC' })

      const result = manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'BE', line2: 'AC' },
      })

      manager.markConsumed(result.id)
      expect(manager.getObject(result.id).status).toBe(CONSTRUCTION_STATUS.CONSUMED)
    })

    it('标记对象为已解释', () => {
      factRegistry.addFact({ type: 'line', subjects: ['B', 'E'], description: '线 BE' })
      factRegistry.addFact({ type: 'line', subjects: ['A', 'C'], description: '线 AC' })

      const result = manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'BE', line2: 'AC' },
      })

      manager.markExplained(result.id)
      expect(manager.getObject(result.id).status).toBe(CONSTRUCTION_STATUS.EXPLAINED)
    })
  })

  describe('D. 获取对象列表', () => {
    it('获取所有激活对象', () => {
      factRegistry.addFact({ type: 'line', subjects: ['B', 'E'], description: '线 BE' })
      factRegistry.addFact({ type: 'line', subjects: ['A', 'C'], description: '线 AC' })

      manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'BE', line2: 'AC' },
      })

      const active = manager.getActiveObjects()
      expect(active.length).toBe(1)
    })

    it('根据创建规则查找对象', () => {
      factRegistry.addFact({ type: 'line', subjects: ['B', 'E'], description: '线 BE' })
      factRegistry.addFact({ type: 'line', subjects: ['A', 'C'], description: '线 AC' })

      manager.proposeConstruction({
        type: 'line_intersection',
        label: 'G',
        parameters: { line1: 'BE', line2: 'AC' },
        creatorRule: 'my_rule',
      })

      const found = manager.findByCreatorRule('my_rule')
      expect(found.length).toBe(1)
      expect(found[0].label).toBe('G')
    })

    it('获取状态摘要', () => {
      const summary = manager.getSummary()
      expect(summary.totalObjects).toBe(0)
      expect(summary.byStatus.active).toBe(0)
    })
  })
})