/**
 * @module ruleRegistry
 * @description 规则注册表 - 管理推理规则的注册和查询
 * @author Geometry 3D Learning
 */

/**
 * 规则注册表类
 */
export class RuleRegistry {
  constructor() {
    /** @private */
    this.rules = new Map()
    /** @private */
    this.rulesByTier = new Map()
    /** @private */
    this.rulesByTag = new Map()
  }

  /**
   * 注册规则
   * @param {Object} rule - 规则对象
   * @param {string} rule.id - 规则唯一标识
   * @param {string} rule.name - 规则名称
   * @param {string} rule.description - 规则描述
   * @param {string} rule.tier - 规则层级 (axiom/definition/theorem/corollary/lemma/heuristic)
   * @param {Object[]} rule.premises - 前提条件
   * @param {string} rule.conclusion - 结论类型
   * @param {Function} rule.match - 匹配函数
   * @param {Function} rule.apply - 应用函数
   * @param {string[]} [rule.tags] - 标签
   * @param {number} [rule.priority] - 优先级 (默认0，数值越大优先级越高)
   * @returns {Object} 注册的规则
   */

  /**
   * 验证规则契约
   * @param {Object} rule
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateRule(rule) {
    const errors = []
    if (!rule.id || typeof rule.id !== 'string') errors.push('Rule must have a string "id"')
    if (!rule.name || typeof rule.name !== 'string') errors.push('Rule must have a string "name"')
    if (!rule.tier || typeof rule.tier !== 'string') errors.push('Rule must have a string "tier"')
    if (typeof rule.condition !== 'function' && typeof rule.match !== 'function') errors.push('Rule must have "condition" or "match" function')
    if (typeof rule.apply !== 'function') errors.push('Rule must have an "apply" function')
    if (rule.priority !== undefined && typeof rule.priority !== 'number') errors.push('Rule "priority" must be a number')
    return { valid: errors.length === 0, errors }
  }

  registerRule(rule) {
    const validation = this.validateRule(rule)
    if (!validation.valid) {
      throw new Error(`Invalid rule "${rule?.id || '?'}": ${validation.errors.join('; ')}`)
    }

    const {
      id,
      name,
      description,
      tier,
      premises,
      conclusion,
      condition,
      match,
      apply,
      tags = [],
      priority = 0,
      salience,
    } = rule

    // 完整保留契约字段，禁止丢 condition / salience / priority
    const registeredRule = {
      id,
      name,
      description,
      tier,
      premises,
      conclusion,
      condition,
      match,
      apply,
      tags: Array.isArray(tags) ? [...tags] : [],
      priority: typeof priority === 'number' ? priority : 0,
      salience: salience ?? priority ?? 0,
      registeredAt: Date.now(),
    }

    this.rules.set(id, registeredRule)

    if (!this.rulesByTier.has(tier)) {
      this.rulesByTier.set(tier, new Map())
    }
    this.rulesByTier.get(tier).set(id, registeredRule)

    tags.forEach((tag) => {
      if (!this.rulesByTag.has(tag)) {
        this.rulesByTag.set(tag, new Map())
      }
      this.rulesByTag.get(tag).set(id, registeredRule)
    })

    return registeredRule
  }

  /**
   * 根据ID获取规则
   * @param {string} id - 规则ID
   * @returns {Object|null} 规则对象或null
   */
  getRule(id) {
    return this.rules.get(id) || null
  }

  /**
   * 根据层级获取规则
   * @param {string} tier - 规则层级
   * @returns {Object[]} 规则列表
   */
  getRulesByTier(tier) {
    const tierMap = this.rulesByTier.get(tier)
    if (!tierMap) return []
    return Array.from(tierMap.values())
  }

  /**
   * 根据标签获取规则
   * @param {string} tag - 标签
   * @returns {Object[]} 规则列表
   */
  getRulesByTag(tag) {
    const tagMap = this.rulesByTag.get(tag)
    if (!tagMap) return []
    return Array.from(tagMap.values())
  }

  /**
   * 获取所有规则
   * @returns {Object[]} 所有规则列表
   */
  getAllRules() {
    return Array.from(this.rules.values())
  }

  /**
   * 获取所有规则层级
   * @returns {string[]} 层级列表
   */
  getAllTiers() {
    return Array.from(this.rulesByTier.keys())
  }

  /**
   * 获取所有标签
   * @returns {string[]} 标签列表
   */
  getAllTags() {
    return Array.from(this.rulesByTag.keys())
  }

  /**
   * 获取规则数量
   * @returns {number} 规则数量
   */
  size() {
    return this.rules.size
  }

  /**
   * 根据优先级排序的规则列表
   * @returns {Object[]} 排序后的规则列表
   */
  getRulesByPriority() {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority)
  }

  /**
   * 移除规则
   * @param {string} id - 规则ID
   */
  removeRule(id) {
    const rule = this.rules.get(id)
    if (!rule) return

    this.rules.delete(id)

    if (this.rulesByTier.has(rule.tier)) {
      this.rulesByTier.get(rule.tier).delete(id)
    }

    rule.tags.forEach((tag) => {
      if (this.rulesByTag.has(tag)) {
        this.rulesByTag.get(tag).delete(id)
      }
    })
  }

  /**
   * 清空注册表
   */
  clear() {
    this.rules.clear()
    this.rulesByTier.clear()
    this.rulesByTag.clear()
  }

  /**
   * 批量注册规则
   * @param {Object[]} rules - 规则数组
   */
  registerRules(rules) {
    rules.forEach((rule) => {
      this.registerRule(rule)
    })
  }
}

/**
 * 创建默认规则注册表实例
 * @returns {RuleRegistry} 注册表实例
 */
export function createRuleRegistry() {
  return new RuleRegistry()
}