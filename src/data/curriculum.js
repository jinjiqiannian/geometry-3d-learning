/**
 * 高中数学 / 物理课程目录（新人教 A 版册次结构）
 * 叶子节点可挂 subject + sample（样例键）或 text（直接开讲）
 */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   subject?: string,
 *   sampleKey?: string,
 *   text?: string,
 *   hint?: string,
 * }} CurriculumLeaf */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   children?: (CurriculumNode)[],
 *   leaves?: CurriculumLeaf[],
 * }} CurriculumNode */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   books: CurriculumNode[],
 * }} CurriculumSubject */

/** @type {CurriculumSubject[]} */
export const CURRICULUM = [
  {
    id: "math",
    label: "数学",
    books: [
      {
        id: "math-req-1",
        label: "必修第一册",
        children: [
          {
            id: "math-req-1-fn",
            label: "函数的单调性",
            leaves: [
              {
                id: "math-fn-mono",
                label: "用导数看增减",
                subject: "derivative",
                sampleKey: "deriv_mono",
                text: "求 f(x)=x³−3x 的单调区间",
                hint: "导数符号 ↔ 单调性",
              },
            ],
          },
        ],
      },
      {
        id: "math-req-3",
        label: "必修第三册",
        children: [
          {
            id: "math-req-3-solid",
            label: "立体几何初步",
            leaves: [
              {
                id: "math-solid-cube-diag",
                label: "正方体的体对角线",
                subject: "geometry",
                text: "正方体棱长为2，求体对角线AG的长度",
                hint: "空间对角线 · 可旋转观察",
              },
              {
                id: "math-solid-sphere",
                label: "球的体积与表面积",
                subject: "geometry",
                text: "球体半径为3，求体积和表面积",
                hint: "球面与体积公式",
              },
              {
                id: "math-solid-pyramid",
                label: "棱锥的高与体积（例）",
                subject: "geometry",
                text: "正四棱锥底面边长为4，高为3，求体积",
                hint: "V=⅓Sh",
              },
            ],
          },
          {
            id: "math-req-3-stat",
            label: "统计与概率初步",
            leaves: [
              {
                id: "math-prob-ball",
                label: "古典概型",
                subject: "combo",
                sampleKey: "classical_prob",
                text: "袋中有3红2白，不放回摸2球，求两球都红的概率",
                hint: "古典概率",
              },
            ],
          },
        ],
      },
      {
        id: "math-opt-1",
        label: "选择性必修第一册",
        children: [
          {
            id: "math-opt-1-space",
            label: "空间向量与立体几何",
            leaves: [
              {
                id: "math-space-cube",
                label: "用空间想象看体对角线",
                subject: "geometry",
                text: "正方体棱长为2，求体对角线AG的长度",
                hint: "与必修立体几何呼应",
              },
            ],
          },
        ],
      },
      {
        id: "math-opt-2",
        label: "选择性必修第二册",
        children: [
          {
            id: "math-opt-2-deriv",
            label: "导数及其应用",
            leaves: [
              {
                id: "math-deriv-poly",
                label: "多项式求导",
                subject: "derivative",
                sampleKey: "deriv_poly",
                text: "求 f(x)=x³−3x 的导数",
                hint: "幂法则",
              },
              {
                id: "math-deriv-tangent",
                label: "切线方程",
                subject: "derivative",
                sampleKey: "deriv_tangent",
                text: "求曲线 y=x³−3x 在 x=1 处的切线方程",
                hint: "先求导再点斜式",
              },
            ],
          },
        ],
      },
      {
        id: "math-opt-3",
        label: "选择性必修第三册",
        children: [
          {
            id: "math-opt-3-conic",
            label: "圆锥曲线的方程",
            leaves: [
              {
                id: "math-conic-e",
                label: "椭圆的离心率",
                subject: "conic",
                sampleKey: "ellipse_e",
                text: "椭圆 x²/25+y²/16=1 的离心率",
                hint: "先认 a、b、c",
              },
              {
                id: "math-conic-focus",
                label: "双曲线的焦点",
                subject: "conic",
                sampleKey: "hyper_focus",
                text: "双曲线 x²/9−y²/16=1 的焦点坐标",
                hint: "c²=a²+b²",
              },
            ],
          },
          {
            id: "math-opt-3-count",
            label: "计数原理",
            leaves: [
              {
                id: "math-count-perm",
                label: "排列与分步计数",
                subject: "combo",
                sampleKey: "multiply_add",
                text: "从正副组长各 1 名的选法：正组长 5 选 1，副组长 4 选 1，共多少种？",
                hint: "分步相乘",
              },
              {
                id: "math-count-comb",
                label: "组合",
                subject: "combo",
                sampleKey: "perm_comb",
                text: "从 5 名同学中选 3 名代表，有多少种选法？",
                hint: "无序选取",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "physics",
    label: "物理",
    books: [
      {
        id: "phys-req-1",
        label: "必修第一册",
        children: [
          {
            id: "phys-req-1-motion",
            label: "运动的描述",
            leaves: [
              {
                id: "phys-kinematic",
                label: "匀变速：求末速度",
                subject: "phys_motion",
                sampleKey: "phys_kinematic",
                text: "物体初速为 0，加速度 2 m/s²，求 3 s 后的速度",
                hint: "v = v₀ + at",
              },
              {
                id: "phys-displace",
                label: "匀变速：求位移",
                subject: "phys_motion",
                sampleKey: "phys_displacement",
                text: "初速为 0，加速度 2 m/s²，求 4 s 内的位移",
                hint: "s = v₀t + ½at²",
              },
            ],
          },
          {
            id: "phys-req-1-force",
            label: "相互作用与牛顿定律",
            leaves: [
              {
                id: "phys-newton",
                label: "牛顿第二定律求加速度",
                subject: "phys_dynamics",
                sampleKey: "phys_newton",
                text: "质量 2 kg 的物体受到 10 N 的合力，求加速度",
                hint: "a = F/m",
              },
              {
                id: "phys-weight",
                label: "重力 G = mg",
                subject: "phys_static",
                sampleKey: "phys_weight",
                text: "质量 5 kg，取 g=10，求重力大小",
                hint: "G = mg",
              },
            ],
          },
        ],
      },
      {
        id: "phys-req-2",
        label: "必修第二册",
        children: [
          {
            id: "phys-req-2-energy",
            label: "机械能守恒定律",
            leaves: [
              {
                id: "phys-ke",
                label: "动能",
                subject: "phys_dynamics",
                sampleKey: "phys_ke",
                text: "质量 2 kg、速度 3 m/s，求动能",
                hint: "Ek = ½mv²",
              },
              {
                id: "phys-pe",
                label: "重力势能",
                subject: "phys_dynamics",
                sampleKey: "phys_pe",
                text: "质量 2 kg、高度 5 m，取 g=10，求重力势能",
                hint: "Ep = mgh",
              },
              {
                id: "phys-work",
                label: "恒力做功",
                subject: "phys_dynamics",
                sampleKey: "phys_work",
                text: "20 N 的力同向推动物体 3 m，求功",
                hint: "W = Fs",
              },
            ],
          },
        ],
      },
      {
        id: "phys-req-3",
        label: "必修第三册",
        children: [
          {
            id: "phys-req-3-circuit",
            label: "电路与欧姆定律",
            leaves: [
              {
                id: "phys-ohm",
                label: "欧姆定律",
                subject: "phys_circuit",
                sampleKey: "phys_ohm",
                text: "电阻 5 Ω，电流 2 A，求电压",
                hint: "U = IR",
              },
            ],
          },
        ],
      },
      {
        id: "phys-opt-1",
        label: "选择性必修第一册",
        children: [
          {
            id: "phys-opt-1-field",
            label: "匀变速公式",
            leaves: [
              {
                id: "phys-v2as",
                label: "速度位移公式",
                subject: "phys_motion",
                sampleKey: "phys_v2as",
                text: "初速 0，加速度 3 m/s²，位移 6 m，求末速度",
                hint: "v² = v₀² + 2as",
              },
            ],
          },
        ],
      },
      {
        id: "phys-opt-2",
        label: "选择性必修第二册",
        children: [
          {
            id: "phys-opt-2-em",
            label: "电磁场",
            leaves: [
              {
                id: "phys-efield",
                label: "电场强度",
                subject: "phys_efield",
                sampleKey: "phys_efield_def",
                text: "电荷受电场力 4 N，电荷量 2×10⁻⁶ C，求场强",
                hint: "E = F/q",
              },
              {
                id: "phys-lorentz",
                label: "洛伦兹力与圆周",
                subject: "phys_bfield",
                sampleKey: "phys_lorentz",
                text: "带电粒子垂直进入匀强磁场做匀速圆周运动（定性理解）",
                hint: "左手定则",
              },
            ],
          },
        ],
      },
      {
        id: "phys-opt-3",
        label: "选择性必修第三册",
        children: [
          {
            id: "phys-opt-3-ind",
            label: "电磁感应",
            leaves: [
              {
                id: "phys-faraday",
                label: "法拉第电磁感应",
                subject: "phys_induction",
                sampleKey: "phys_faraday",
                text: "磁通量在 0.2 s 内变化 0.4 Wb，求感应电动势大小",
                hint: "ε = ΔΦ/Δt",
              },
            ],
          },
        ],
      },
    ],
  },
];

/** 扁平化所有叶子，便于按 id 查找 */
export function flattenCurriculumLeaves(subjects = CURRICULUM) {
  /** @type {CurriculumLeaf[]} */
  const out = [];
  for (const subj of subjects) {
    for (const book of subj.books || []) {
      walkNodes(book, out);
    }
  }
  return out;
}

function walkNodes(node, out) {
  if (node.leaves) out.push(...node.leaves);
  if (node.children) {
    for (const child of node.children) walkNodes(child, out);
  }
}

export function findLeafById(id) {
  return flattenCurriculumLeaves().find((l) => l.id === id) || null;
}
