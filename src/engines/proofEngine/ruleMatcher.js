/**
 * @module ruleMatcher
 * @description 规则匹配器 - 用几何规则匹配事实，生成推论
 * @author Geometry 3D Learning
 */

/**
 * 推理规则定义
 * @typedef {Object} InferenceRule
 * @property {string} id - 规则唯一标识
 * @property {string} name - 规则名称
 * @property {string} description - 规则描述
 * @property {string[]} premises - 前提条件类型列表
 * @property {string} conclusion - 结论类型
 * @property {Function} match - 匹配函数，返回匹配结果或null
 * @property {Function} apply - 应用规则，生成结论
 */

/**
 * 推理步骤
 * @typedef {Object} InferenceStep
 * @property {string} ruleId - 使用的规则ID
 * @property {string} ruleName - 规则名称
 * @property {string} premise - 前提描述
 * @property {string} conclusion - 结论描述
 * @property {string} explanation - 推理过程解释
 */

/**
 * 内置推理规则库
 * @type {InferenceRule[]}
 */
const RULES = [
  {
    id: "midpoint_divides_segment",
    name: "中点分线段",
    description: "若E是AD中点，则AE = ED",
    premises: ["midpoint"],
    conclusion: "equality",
    match: (facts) => {
      const midpointFacts = facts.filter((f) => f.type === "midpoint");
      return midpointFacts.length > 0 ? midpointFacts : [];
    },
    apply: (fact) => {
      const [point, from, to] = fact.subjects;
      return {
        type: "equality",
        subjects: [`${point}${from}`, `${point}${to}`],
        description: `${point}是${from}${to}的中点，所以${from}${point} = ${point}${to}`,
      };
    },
  },
  {
    id: "parallel_line_plane",
    name: "线面平行性质",
    description: "若直线a平行于平面α，则a与α无交点",
    premises: ["parallel"],
    conclusion: "no_intersection",
    match: (facts) => {
      const parallelFacts = facts.filter((f) => f.type === "parallel");
      return parallelFacts.length > 0 ? parallelFacts : [];
    },
    apply: (fact) => {
      const [line, plane] = fact.subjects;
      return {
        type: "no_intersection",
        subjects: [line, plane],
        description: `${line}平行于平面${plane}，所以${line}与${plane}没有交点`,
      };
    },
  },
  {
    id: "line_on_plane",
    name: "直线在平面内",
    description: "若直线上两点在平面内，则直线在平面内",
    premises: ["line", "plane"],
    conclusion: "line_in_plane",
    match: (facts) => {
      const lineFacts = facts.filter((f) => f.type === "line");
      const planeFacts = facts.filter((f) => f.type === "plane");
      if (lineFacts.length === 0 || planeFacts.length === 0) return null;

      const matches = [];
      lineFacts.forEach((line) => {
        planeFacts.forEach((plane) => {
          const linePoints = line.subjects;
          const planePoints = plane.subjects;
          const lineOnPlane = linePoints.every((p) => planePoints.includes(p));
          if (lineOnPlane) {
            matches.push({ line, plane });
          }
        });
      });
      return matches.length > 0 ? matches : null;
    },
    apply: (matchResult) => {
      const { line, plane } = matchResult;
      const lineName = line.subjects.join("");
      const planeName = plane.subjects.join("");
      return {
        type: "line_in_plane",
        subjects: [lineName, planeName],
        description: `直线${lineName}在平面${planeName}内`,
      };
    },
  },
  {
    id: "three_points_define_plane",
    name: "三点确定平面",
    description: "不共线的三点确定一个平面",
    premises: ["point"],
    conclusion: "plane",
    match: (facts) => {
      const pointFacts = facts.filter((f) => f.type === "point");
      if (pointFacts.length < 3) return [];
      return [{ points: pointFacts.slice(0, 3) }];
    },
    apply: (matchResult) => {
      const points = matchResult.points.map((p) => p.subjects[0]);
      return {
        type: "plane",
        subjects: points,
        description: `点${points.join("、")}确定平面`,
      };
    },
  },
];

/**
 * 匹配规则库中的所有规则
 * @param {Object[]} facts - 几何事实列表
 * @returns {InferenceStep[]} 推理步骤列表
 */
export function matchRules(facts) {
  const steps = [];

  RULES.forEach((rule) => {
    const matchResults = rule.match(facts);
    if (matchResults && matchResults.length > 0) {
      matchResults.forEach((matchResult) => {
        const conclusion = rule.apply(matchResult);
        steps.push({
          ruleId: rule.id,
          ruleName: rule.name,
          premise: matchResult.description || JSON.stringify(matchResult),
          conclusion: conclusion.description,
          explanation: `${rule.description} → ${conclusion.description}`,
        });
      });
    }
  });

  return steps;
}

/**
 * 根据规则ID匹配特定规则
 * @param {Object[]} facts - 几何事实列表
 * @param {string} ruleId - 规则ID
 * @returns {InferenceStep[]} 推理步骤列表
 */
export function matchRuleById(facts, ruleId) {
  const rule = RULES.find((r) => r.id === ruleId);
  if (!rule) return [];

  const matchResults = rule.match(facts);
  if (!matchResults || matchResults.length === 0) return [];

  const steps = [];
  matchResults.forEach((matchResult) => {
    const conclusion = rule.apply(matchResult);
    steps.push({
      ruleId: rule.id,
      ruleName: rule.name,
      premise: matchResult.description || JSON.stringify(matchResult),
      conclusion: conclusion.description,
      explanation: `${rule.description} → ${conclusion.description}`,
    });
  });
  return steps;
}

/**
 * 获取所有可用规则
 * @returns {InferenceRule[]} 规则列表
 */
export function getAvailableRules() {
  return RULES;
}