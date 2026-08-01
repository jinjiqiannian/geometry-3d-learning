/**
 * @module validators
 * @description 构造验证器 - 验证几何构造的有效性
 * @author Geometry 3D Learning
 */

/**
 * 验证结果
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 是否有效
 * @property {string} reason - 验证原因/失败原因
 * @property {Object[]} generatedFacts - 生成的事实列表
 */

/**
 * 验证点构造
 * @param {Object} object - 构造对象
 * @param {Object} context - 上下文（包含现有对象和事实）
 * @returns {ValidationResult} 验证结果
 */
function validatePoint(object, context) {
  const { label } = object;
  const { existingPoints = [] } = context;

  if (!label) {
    return {
      valid: false,
      reason: "点必须有标签",
      generatedFacts: [],
    };
  }

  if (existingPoints.includes(label)) {
    return {
      valid: false,
      reason: `点 ${label} 已存在`,
      generatedFacts: [],
    };
  }

  return {
    valid: true,
    reason: `点 ${label} 构造有效`,
    generatedFacts: [
      {
        type: "point",
        subjects: [label],
        description: `点 ${label} 存在`,
      },
    ],
  };
}

/**
 * 验证线相交构造
 * @param {Object} object - 构造对象
 * @param {Object} context - 上下文
 * @returns {ValidationResult} 验证结果
 */
function validateLineIntersection(object, context) {
  const { points, parameters } = object;
  const { lines = new Map(), facts = [] } = context;

  const line1 = parameters?.line1 || (points && points[0]);
  const line2 = parameters?.line2 || (points && points[1]);

  if (!line1 || !line2) {
    return {
      valid: false,
      reason: "必须指定两条线",
      generatedFacts: [],
    };
  }

  const line1Obj =
    lines.get(line1) ||
    facts.find((f) => {
      if (f.type !== "line") return false;
      const subjects = f.subjects || [];
      const lineStr = subjects.join("-");
      const lineStrNoDash = subjects.join("");
      return (
        lineStr === line1 || lineStrNoDash === line1 || subjects.includes(line1)
      );
    });
  const line2Obj =
    lines.get(line2) ||
    facts.find((f) => {
      if (f.type !== "line") return false;
      const subjects = f.subjects || [];
      const lineStr = subjects.join("-");
      const lineStrNoDash = subjects.join("");
      return (
        lineStr === line2 || lineStrNoDash === line2 || subjects.includes(line2)
      );
    });

  if (!line1Obj) {
    return {
      valid: false,
      reason: `线 ${line1} 不存在`,
      generatedFacts: [],
    };
  }

  if (!line2Obj) {
    return {
      valid: false,
      reason: `线 ${line2} 不存在`,
      generatedFacts: [],
    };
  }

  const line1Points = line1Obj.subjects || line1Obj.points || [];
  const line2Points = line2Obj.subjects || line2Obj.points || [];

  const sharedPoints = line1Points.filter((p) => line2Points.includes(p));

  if (sharedPoints.length >= 2) {
    return {
      valid: false,
      reason: "两条线重合，无法确定唯一交点",
      generatedFacts: [],
    };
  }

  if (sharedPoints.length === 1) {
    return {
      valid: true,
      reason: `两条线交于点 ${sharedPoints[0]}`,
      generatedFacts: [
        {
          type: "intersection",
          subjects: [line1, line2, sharedPoints[0]],
          description: `${line1} 与 ${line2} 交于 ${sharedPoints[0]}`,
        },
      ],
    };
  }

  const isParallel = checkLinesParallel(line1Points, line2Points, facts);
  if (isParallel) {
    return {
      valid: false,
      reason: "两条线平行，无交点",
      generatedFacts: [],
    };
  }

  return {
    valid: true,
    reason: `两条线相交于新点 ${object.label}`,
    generatedFacts: [
      {
        type: "intersection",
        subjects: [line1, line2, object.label],
        description: `${line1} 与 ${line2} 交于 ${object.label}`,
      },
      {
        type: "point",
        subjects: [object.label],
        description: `点 ${object.label} 存在`,
      },
    ],
  };
}

/**
 * 验证平面相交构造
 * @param {Object} object - 构造对象
 * @param {Object} context - 上下文
 * @returns {ValidationResult} 验证结果
 */
function validatePlaneIntersection(object, context) {
  const { points, parameters } = object;
  const { planes = new Map(), facts = [] } = context;

  const plane1 = parameters?.plane1 || (points && points[0]);
  const plane2 = parameters?.plane2 || (points && points[1]);

  if (!plane1 || !plane2) {
    return {
      valid: false,
      reason: "必须指定两个平面",
      generatedFacts: [],
    };
  }

  const plane1Obj =
    planes.get(plane1) ||
    facts.find((f) => {
      if (f.type !== "plane") return false;
      const subjects = f.subjects || [];
      return subjects.includes(plane1) || f.description?.includes(plane1);
    });
  const plane2Obj =
    planes.get(plane2) ||
    facts.find((f) => {
      if (f.type !== "plane") return false;
      const subjects = f.subjects || [];
      return subjects.includes(plane2) || f.description?.includes(plane2);
    });

  if (!plane1Obj) {
    return {
      valid: false,
      reason: `平面 ${plane1} 不存在`,
      generatedFacts: [],
    };
  }

  if (!plane2Obj) {
    return {
      valid: false,
      reason: `平面 ${plane2} 不存在`,
      generatedFacts: [],
    };
  }

  const plane1Points = plane1Obj.subjects || plane1Obj.points || [];
  const plane2Points = plane2Obj.subjects || plane2Obj.points || [];

  const isParallel = checkPlanesParallel(plane1Points, plane2Points, facts);
  if (isParallel) {
    return {
      valid: false,
      reason: "两个平面平行，无交线",
      generatedFacts: [],
    };
  }

  return {
    valid: true,
    reason: `两个平面相交`,
    generatedFacts: [
      {
        type: "intersection",
        subjects: [plane1, plane2],
        description: `${plane1} 与 ${plane2} 相交`,
      },
    ],
  };
}

/**
 * 检查两条线是否平行（简化版）
 * @param {string[]} line1Points - 线1的点
 * @param {string[]} line2Points - 线2的点
 * @param {Object[]} facts - 已知事实
 * @returns {boolean} 是否平行
 */
function checkLinesParallel(line1Points, line2Points, facts) {
  const line1Str = line1Points.join("-");
  const line1StrNoDash = line1Points.join("");
  const line2Str = line2Points.join("-");
  const line2StrNoDash = line2Points.join("");

  const parallelFact = facts.find((f) => {
    if (f.type !== "parallel") return false;
    const subjects = f.subjects || [];
    if (subjects.length < 2) return false;

    const hasLine1 = subjects.some(
      (s) => s === line1Str || s === line1StrNoDash || line1Points.includes(s)
    );
    const hasLine2 = subjects.some(
      (s) => s === line2Str || s === line2StrNoDash || line2Points.includes(s)
    );

    return hasLine1 && hasLine2;
  });

  return !!parallelFact;
}

/**
 * 检查两个平面是否平行（简化版）
 * @param {string[]} plane1Points - 平面1的点
 * @param {string[]} plane2Points - 平面2的点
 * @param {Object[]} facts - 已知事实
 * @returns {boolean} 是否平行
 */
function checkPlanesParallel(plane1Points, plane2Points, facts) {
  const plane1Str = plane1Points.join("");
  const plane2Str = plane2Points.join("");

  const parallelFact = facts.find((f) => {
    if (f.type !== "parallel") return false;
    const subjects = f.subjects || [];
    if (subjects.length < 2) return false;

    const hasPlane1 = subjects.some(
      (s) => s === plane1Str || plane1Points.some((p) => s.includes(p))
    );
    const hasPlane2 = subjects.some(
      (s) => s === plane2Str || plane2Points.some((p) => s.includes(p))
    );

    return hasPlane1 && hasPlane2;
  });

  return !!parallelFact;
}

/**
 * 构造验证器映射
 */
const VALIDATORS = {
  point: validatePoint,
  line_intersection: validateLineIntersection,
  plane_intersection: validatePlaneIntersection,
};

/**
 * 验证构造对象
 * @param {Object} object - 构造对象
 * @param {Object} context - 上下文
 * @returns {ValidationResult} 验证结果
 */
export function validateConstruction(object, context = {}) {
  const { type } = object;
  const validator = VALIDATORS[type];

  if (!validator) {
    return {
      valid: false,
      reason: `不支持的构造类型: ${type}`,
      generatedFacts: [],
    };
  }

  return validator(object, context);
}

/**
 * 注册自定义验证器
 * @param {string} type - 构造类型
 * @param {Function} validator - 验证函数
 */
export function registerValidator(type, validator) {
  VALIDATORS[type] = validator;
}

/**
 * 获取所有注册的验证器类型
 * @returns {string[]} 验证器类型列表
 */
export function getValidatorTypes() {
  return Object.keys(VALIDATORS);
}
