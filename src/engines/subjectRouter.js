/**
 * subjectRouter — 统一入口：本地识别专题 + Hub 热门样例
 */
import { MVP_EXAMPLES } from './logicIR/schema.js'
import { TOPIC_EXAMPLES, TOPIC_EXAMPLE_LABELS } from './topics/explainIR.js'
import { getGroupIdForTopic } from './topics/physics.js'

/**
 * @typedef {'geometry'|'combo'|'derivative'|'conic'|string} SubjectId
 * @typedef {{
 *   id: string,
 *   subject: SubjectId,
 *   label: string,
 *   hint: string,
 *   text?: string,
 *   sampleKey?: string,
 *   tag: string,
 * }} HubSample
 */

/**
 * 本地启发式专题识别（不调用 AI）
 * @param {string} text
 * @returns {{ subject: SubjectId, confidence: 'high'|'low', hint?: string }}
 */
export function detectSubject(text) {
  const t = String(text || '').trim()
  if (t.length < 2) {
    return {
      subject: 'geometry',
      confidence: 'low',
      hint: '已按立体几何理解，可换专题',
    }
  }

  if (
    /排列|组合|概率|抽球|红白|不放回|正副|组长|选法|有多少种|搭配|乘法原理|分类讨论/.test(
      t,
    )
  ) {
    return { subject: 'combo', confidence: 'high' }
  }

  if (
    /导数|求导|切线|单调|极值|f\s*'|f′|导函数|增减/.test(t) ||
    /f\s*\(\s*x\s*\)/.test(t)
  ) {
    return { subject: 'derivative', confidence: 'high' }
  }

  if (
    /椭圆|双曲线|抛物线|离心率|焦点|准线|圆锥曲线|x\s*²\s*\/|y\s*²\s*\//.test(
      t,
    )
  ) {
    return { subject: 'conic', confidence: 'high' }
  }

  if (
    /欧姆|电阻|电压|电流|U\s*=\s*IR|电路/.test(t)
  ) {
    return { subject: 'phys_circuit', confidence: 'high' }
  }
  if (/电场|场强|试探电荷|E\s*=\s*F\/q/.test(t)) {
    return { subject: 'phys_efield', confidence: 'high' }
  }
  if (/洛伦兹|磁场|绕圈/.test(t)) {
    return { subject: 'phys_bfield', confidence: 'high' }
  }
  if (/感应|法拉第|磁通|电动势/.test(t)) {
    return { subject: 'phys_induction', confidence: 'high' }
  }
  if (
    /牛顿|F\s*=\s*ma|合力|重力|G\s*=\s*mg|动能|势能|做功|功\s*=/.test(t)
  ) {
    return { subject: 'phys_dynamics', confidence: 'high' }
  }
  if (
    /从静止|加速度|末速度|位移|运动学|v\s*=|s\s*=|匀加速/.test(t)
  ) {
    return { subject: 'phys_motion', confidence: 'high' }
  }
  if (/静力|受力平衡/.test(t)) {
    return { subject: 'phys_static', confidence: 'high' }
  }

  if (
    /正方体|长方体|棱锥|棱柱|圆柱|圆锥|圆台|球体|立体|体积|表面积|侧面积|体对角线|面对角线|空间|棱长|底面|高为/.test(
      t,
    )
  ) {
    return { subject: 'geometry', confidence: 'high' }
  }

  return {
    subject: 'geometry',
    confidence: 'low',
    hint: '已按立体几何理解，可换专题',
  }
}

/**
 * 将 subjectId 拆成 domain / mathTopic / physicsTopic / physicsGroup
 * @param {SubjectId} subject
 */
export function resolveSubjectNav(subject) {
  if (typeof subject === 'string' && subject.startsWith('phys_')) {
    return {
      domain: 'physics',
      mathTopic: 'combo',
      physicsTopic: subject,
      physicsGroup: getGroupIdForTopic(subject),
    }
  }
  return {
    domain: 'math',
    mathTopic: subject || 'geometry',
    physicsTopic: 'phys_motion',
    physicsGroup: 'mechanics',
  }
}

/** @type {HubSample[]} */
export const HUB_SAMPLES = Object.freeze([
  {
    id: 'geo-cube',
    subject: 'geometry',
    tag: '立体几何',
    label: '正方体对角线',
    hint: '棱长 2 → 体对角线',
    text: '正方体棱长为2，求体对角线AG的长度',
  },
  {
    id: 'combo-seat',
    subject: 'combo',
    tag: '排列组合',
    label: '正副组长',
    hint: '有序 · 分步相乘',
    sampleKey: 'multiply_add',
    text: MVP_EXAMPLES.multiply_add.goal,
  },
  {
    id: 'combo-prob',
    subject: 'combo',
    tag: '概率',
    label: '红白球',
    hint: '不放回 · 古典概率',
    sampleKey: 'classical_prob',
    text: MVP_EXAMPLES.classical_prob.goal,
  },
  {
    id: 'deriv-poly',
    subject: 'derivative',
    tag: '导数',
    label: TOPIC_EXAMPLE_LABELS.derivative.deriv_poly,
    hint: '多项式逐项求导',
    sampleKey: 'deriv_poly',
    text: TOPIC_EXAMPLES.derivative.deriv_poly.goal,
  },
  {
    id: 'conic-e',
    subject: 'conic',
    tag: '圆锥曲线',
    label: TOPIC_EXAMPLE_LABELS.conic.ellipse_e,
    hint: '先认 a、b、c',
    sampleKey: 'ellipse_e',
    text: TOPIC_EXAMPLES.conic.ellipse_e.goal,
  },
  {
    id: 'phys-bfield-square',
    subject: 'phys_bfield',
    tag: '物理·高考',
    label: '正方形磁场出射',
    hint: '2019全国Ⅱ · 轨迹定半径',
    text:
      '如图，边长为l的正方形abcd内存在匀强磁场，磁感应强度大小为B，方向垂直于纸面（abcd所在平面）向外。ab边中点有一电子发源O，可向磁场内沿垂直于ab边的方向发射电子。已知电子的比荷为k。则从a、d两点射出的电子的速度大小分别为',
  },
  {
    id: 'phys-motion',
    subject: 'phys_motion',
    tag: '物理',
    label: '从静止加速求速度',
    hint: '运动学 · 方法动画',
    sampleKey: 'phys_kinematic',
    text: TOPIC_EXAMPLES.phys_motion.phys_kinematic.goal,
  },
  {
    id: 'geo-sphere',
    subject: 'geometry',
    tag: '立体几何',
    label: '球体体积',
    hint: '半径 3 → 体积与表面积',
    text: '球体半径为3，求体积和表面积',
  },
  {
    id: 'combo-comb',
    subject: 'combo',
    tag: '排列组合',
    label: '选代表',
    hint: '无序 · 组合',
    sampleKey: 'perm_comb',
    text: MVP_EXAMPLES.perm_comb.goal,
  },
])

export function isPhysicsSubject(subject) {
  return typeof subject === 'string' && subject.startsWith('phys_')
}
