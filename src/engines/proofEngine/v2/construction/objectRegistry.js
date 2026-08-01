/**
 * @module objectRegistry
 * @description 构造对象注册表 - 管理几何构造对象的生命周期
 * @author Geometry 3D Learning
 */

/**
 * 对象生命周期状态枚举
 */
export const CONSTRUCTION_STATUS = {
  PROPOSED: "proposed", // 已提出
  VALIDATING: "validating", // 验证中
  ACTIVE: "active", // 已激活
  CONSUMED: "consumed", // 已消费
  EXPLAINED: "explained", // 已解释
  REJECTED: "rejected", // 已拒绝
  REDUNDANT: "redundant", // 重复
};

/**
 * 构造对象注册表类
 */
export class ObjectRegistry {
  constructor() {
    /** @private */
    this.objects = new Map();
    /** @private */
    this.idToObject = new Map();
    /** @private */
    this.objectsByCreator = new Map();
    /** @private */
    this.objectsByStatus = new Map();
  }

  /**
   * 生成构造对象的规范化ID
   * 确保相同构造产生相同ID
   * @param {Object} object - 构造对象
   * @returns {string} 规范化ID
   */
  generateObjectId(object) {
    const { type, points, parameters } = object;
    const sortedPoints = points ? [...points].sort() : [];

    let paramsStr = "";
    if (parameters) {
      const sortedParams = {};
      Object.keys(parameters)
        .sort()
        .forEach((key) => {
          const value = parameters[key];
          if (Array.isArray(value)) {
            sortedParams[key] = [...value].sort();
          } else {
            sortedParams[key] = value;
          }
        });
      if (sortedParams.line1 && sortedParams.line2) {
        const lines = [sortedParams.line1, sortedParams.line2].sort();
        sortedParams.line1 = lines[0];
        sortedParams.line2 = lines[1];
      }
      if (sortedParams.plane1 && sortedParams.plane2) {
        const planes = [sortedParams.plane1, sortedParams.plane2].sort();
        sortedParams.plane1 = planes[0];
        sortedParams.plane2 = planes[1];
      }
      paramsStr = JSON.stringify(sortedParams);
    }

    return `${type}|${sortedPoints.join(",")}|${paramsStr}`;
  }

  /**
   * 注册构造对象
   * @param {Object} object - 构造对象
   * @param {string} object.id - 对象ID（可选，自动生成）
   * @param {string} object.type - 构造类型
   * @param {string[]} object.points - 组成点的标签列表
   * @param {string} [object.label] - 显示标签
   * @param {boolean} [object.isAuxiliary] - 是否为辅助对象
   * @param {string} [object.creatorRule] - 创建规则ID
   * @param {string[]} [object.dependencies] - 依赖对象ID列表
   * @param {Object} [object.parameters] - 构造参数
   * @returns {Object} 注册的对象（包含状态）
   */
  register(object) {
    const objectId = object.id || this.generateObjectId(object);

    if (this.idToObject.has(objectId)) {
      return this.idToObject.get(objectId);
    }

    const registeredObject = {
      id: objectId,
      type: object.type,
      points: object.points || [],
      label: object.label || "",
      isAuxiliary: object.isAuxiliary || false,
      creatorRule: object.creatorRule || "",
      dependencies: object.dependencies || [],
      parameters: object.parameters || {},
      status: CONSTRUCTION_STATUS.PROPOSED,
      createdAt: Date.now(),
      validationResult: null,
      spawnedFacts: [],
    };

    this.idToObject.set(objectId, registeredObject);
    this.objects.set(object.type, this.objects.get(object.type) || new Map());
    this.objects.get(object.type).set(objectId, registeredObject);

    if (registeredObject.creatorRule) {
      if (!this.objectsByCreator.has(registeredObject.creatorRule)) {
        this.objectsByCreator.set(registeredObject.creatorRule, new Map());
      }
      this.objectsByCreator
        .get(registeredObject.creatorRule)
        .set(objectId, registeredObject);
    }

    this._updateStatusIndex(objectId, CONSTRUCTION_STATUS.PROPOSED);

    return registeredObject;
  }

  /**
   * 根据ID获取对象
   * @param {string} id - 对象ID
   * @returns {Object|null} 对象或null
   */
  get(id) {
    return this.idToObject.get(id) || null;
  }

  /**
   * 检查是否存在指定ID的对象
   * @param {string} id - 对象ID
   * @returns {boolean} 是否存在
   */
  has(id) {
    return this.idToObject.has(id);
  }

  /**
   * 更新对象状态
   * @param {string} id - 对象ID
   * @param {string} status - 新状态
   */
  updateStatus(id, status) {
    const object = this.get(id);
    if (!object) return;

    this._updateStatusIndex(id, object.status, true);
    object.status = status;
    object.updatedAt = Date.now();
    this._updateStatusIndex(id, status);
  }

  /**
   * 获取所有激活状态的对象
   * @returns {Object[]} 激活对象列表
   */
  getActiveObjects() {
    return this._getObjectsByStatus(CONSTRUCTION_STATUS.ACTIVE);
  }

  /**
   * 根据创建规则获取对象
   * @param {string} ruleId - 规则ID
   * @returns {Object[]} 对象列表
   */
  findByCreatorRule(ruleId) {
    const ruleMap = this.objectsByCreator.get(ruleId);
    if (!ruleMap) return [];
    return Array.from(ruleMap.values());
  }

  /**
   * 根据类型获取对象
   * @param {string} type - 构造类型
   * @returns {Object[]} 对象列表
   */
  getByType(type) {
    const typeMap = this.objects.get(type);
    if (!typeMap) return [];
    return Array.from(typeMap.values());
  }

  /**
   * 获取所有对象
   * @returns {Object[]} 所有对象列表
   */
  getAllObjects() {
    return Array.from(this.idToObject.values());
  }

  /**
   * 获取指定状态的对象
   * @param {string} status - 状态
   * @returns {Object[]} 对象列表
   */
  getByStatus(status) {
    return this._getObjectsByStatus(status);
  }

  /**
   * 获取注册表大小
   * @returns {number} 对象数量
   */
  size() {
    return this.idToObject.size;
  }

  /**
   * 清空注册表
   */
  clear() {
    this.objects.clear();
    this.idToObject.clear();
    this.objectsByCreator.clear();
    this.objectsByStatus.clear();
  }

  /**
   * 更新状态索引（私有方法）
   * @private
   */
  _updateStatusIndex(id, status, remove = false) {
    if (!this.objectsByStatus.has(status)) {
      this.objectsByStatus.set(status, new Set());
    }
    if (remove) {
      this.objectsByStatus.get(status).delete(id);
    } else {
      this.objectsByStatus.get(status).add(id);
    }
  }

  /**
   * 根据状态获取对象（私有方法）
   * @private
   */
  _getObjectsByStatus(status) {
    const statusSet = this.objectsByStatus.get(status);
    if (!statusSet) return [];
    return Array.from(statusSet)
      .map((id) => this.idToObject.get(id))
      .filter(Boolean);
  }
}

/**
 * 创建默认对象注册表实例
 * @returns {ObjectRegistry} 注册表实例
 */
export function createObjectRegistry() {
  return new ObjectRegistry();
}
