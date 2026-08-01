/**
 * @module constructionManager
 * @description 构造管理器 - 管理几何构造的完整生命周期
 * @author Geometry 3D Learning
 */

import { ObjectRegistry, CONSTRUCTION_STATUS, createObjectRegistry } from './objectRegistry.js'
import { validateConstruction } from './validators.js'

/**
 * 构造管理器类
 */
export class ConstructionManager {
  constructor() {
    /** @private */
    this.objectRegistry = createObjectRegistry()
    /** @private */
    this.factRegistry = null
    /** @private */
    this.ruleRegistry = null
  }

  /**
   * 设置事实注册表
   * @param {Object} registry - 事实注册表
   */
  setFactRegistry(registry) {
    this.factRegistry = registry
  }

  /**
   * 设置规则注册表
   * @param {Object} registry - 规则注册表
   */
  setRuleRegistry(registry) {
    this.ruleRegistry = registry
  }

  /**
   * 提出构造（完整流程）
   * @param {Object} object - 构造对象
   * @returns {Object} 处理后的对象
   */
  proposeConstruction(object) {
    const objectId = this.objectRegistry.generateObjectId(object)

    if (this.objectRegistry.has(objectId)) {
      const existing = this.objectRegistry.get(objectId)
      this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.REDUNDANT)
      return {
        ...existing,
        status: CONSTRUCTION_STATUS.REDUNDANT,
      }
    }

    const registered = this.objectRegistry.register(object)
    this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.PROPOSED)

    return this.validateAndActivate(objectId)
  }

  /**
   * 验证并激活构造
   * @param {string} objectId - 对象ID
   * @returns {Object} 处理后的对象
   */
  validateAndActivate(objectId) {
    const object = this.objectRegistry.get(objectId)
    if (!object) return null

    this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.VALIDATING)

    const context = this._buildValidationContext()
    const validationResult = validateConstruction(object, context)

    object.validationResult = validationResult

    if (validationResult.valid) {
      this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.ACTIVE)

      if (this.factRegistry && validationResult.generatedFacts.length > 0) {
        const spawnedFacts = validationResult.generatedFacts.map((fact) => {
          return this.factRegistry.addFact(fact)
        })
        object.spawnedFacts = spawnedFacts.map((f) => f.id)
      } else {
        object.spawnedFacts = validationResult.generatedFacts.map((f) => f.id || '')
      }
    } else {
      this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.REJECTED)
    }

    return object
  }

  /**
   * 标记对象为已消费
   * @param {string} objectId - 对象ID
   */
  markConsumed(objectId) {
    this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.CONSUMED)
  }

  /**
   * 标记对象为已解释
   * @param {string} objectId - 对象ID
   */
  markExplained(objectId) {
    this.objectRegistry.updateStatus(objectId, CONSTRUCTION_STATUS.EXPLAINED)
  }

  /**
   * 获取对象
   * @param {string} id - 对象ID
   * @returns {Object|null} 对象或null
   */
  getObject(id) {
    return this.objectRegistry.get(id)
  }

  /**
   * 获取所有激活的对象
   * @returns {Object[]} 激活对象列表
   */
  getActiveObjects() {
    return this.objectRegistry.getActiveObjects()
  }

  /**
   * 根据创建规则获取对象
   * @param {string} ruleId - 规则ID
   * @returns {Object[]} 对象列表
   */
  findByCreatorRule(ruleId) {
    return this.objectRegistry.findByCreatorRule(ruleId)
  }

  /**
   * 获取所有对象
   * @returns {Object[]} 所有对象列表
   */
  getAllObjects() {
    return this.objectRegistry.getAllObjects()
  }

  /**
   * 获取指定状态的对象
   * @param {string} status - 状态
   * @returns {Object[]} 对象列表
   */
  getByStatus(status) {
    return this.objectRegistry.getByStatus(status)
  }

  /**
   * 获取管理器状态摘要
   * @returns {Object} 状态摘要
   */
  getSummary() {
    return {
      totalObjects: this.objectRegistry.size(),
      byStatus: {
        proposed: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.PROPOSED).length,
        validating: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.VALIDATING).length,
        active: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.ACTIVE).length,
        consumed: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.CONSUMED).length,
        explained: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.EXPLAINED).length,
        rejected: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.REJECTED).length,
        redundant: this.objectRegistry.getByStatus(CONSTRUCTION_STATUS.REDUNDANT).length,
      },
    }
  }

  /**
   * 清空管理器
   */
  clear() {
    this.objectRegistry.clear()
  }

  /**
   * 构建验证上下文（私有方法）
   * @private
   */
  _buildValidationContext() {
    const facts = this.factRegistry ? this.factRegistry.getAllFacts() : []
    const lines = new Map()
    const planes = new Map()
    const existingPoints = []

    facts.forEach((fact) => {
      if (fact.type === 'point') {
        existingPoints.push(...(fact.subjects || []))
      } else if (fact.type === 'line') {
        const label = fact.subjects?.join('-') || ''
        lines.set(label, fact)
      } else if (fact.type === 'plane') {
        const label = fact.subjects?.[0] || ''
        planes.set(label, fact)
      }
    })

    return {
      facts,
      lines,
      planes,
      existingPoints,
      objects: this.objectRegistry.getAllObjects(),
    }
  }
}

/**
 * 创建默认构造管理器实例
 * @returns {ConstructionManager} 管理器实例
 */
export function createConstructionManager() {
  return new ConstructionManager()
}