/**
 * 2019 人教：数学必修1–2 + 选必1–3；物理必修1–3 + 选必1–3
 * 每个叶子都有 model；有引擎的带 subject/text
 */

function L(id, label, model, extra = {}) {
  return { id, label, model, hint: extra.hint || "", ...extra };
}

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
            id: "m1-set",
            label: "集合与逻辑用语",
            leaves: [
              L("m-set", "集合的含义与运算", "venn", {
                idea: "用元素是否属于集合来定义交、并、补。",
                formulas: ["A∩B", "A∪B", "∁ᵤA"],
                steps: ["看清全集 U", "用元素判定法列交/并", "补集是 U 里不属于 A 的元素"],
              }),
              L("m-logic", "充分必要条件", "function", {
                idea: "p⇒q 为充分，q⇒p 为必要，互推为充要。",
                formulas: ["p⇒q", "p⇔q"],
                steps: ["先写清 p、q", "只推得去：充分", "两边互推：充要"],
              }),
            ],
          },
          {
            id: "m1-ineq",
            label: "二次函数、方程与不等式",
            leaves: [
              L("m-quad", "二次函数与图像", "quadratic", {
                idea: "开口、对称轴、顶点决定图象。",
                formulas: ["y=ax²+bx+c", "x=−b/(2a)"],
                steps: ["看 a 定开口", "算对称轴", "顶点代入得最值"],
              }),
              L("m-ineq", "一元二次不等式", "quadratic", {
                idea: "先求根，再看开口决定解集。",
                formulas: ["ax²+bx+c>0"],
                steps: ["化标准形", "求根或判别式", "结合开口取区间"],
              }),
            ],
          },
          {
            id: "m1-fn",
            label: "函数概念与性质",
            leaves: [
              L("m-fn-def", "函数的概念", "function", {
                idea: "每个 x 对应唯一 y。",
                formulas: ["y=f(x)"],
                steps: ["认定义域", "检查单值对应", "写值域"],
              }),
              L("m-fn-mono", "单调性", "derivative", {
                idea: "增函数：x 增大，f(x) 增大。",
                formulas: ["x₁<x₂ ⇒ f(x₁)<f(x₂)"],
                subject: "derivative",
                sampleKey: "deriv_mono",
                text: "求 f(x)=x³−3x 的单调区间",
                hint: "也可用导数判断",
              }),
              L("m-fn-even", "奇偶性", "function", {
                idea: "偶函数关于 y 轴对称，奇函数关于原点对称。",
                formulas: ["f(−x)=f(x)", "f(−x)=−f(x)"],
                steps: ["先看定义域是否关于原点对称", "算 f(−x)", "对照定义"],
              }),
            ],
          },
          {
            id: "m1-explog",
            label: "指数与对数函数",
            leaves: [
              L("m-exp", "指数函数", "explog", {
                idea: "y=aˣ (a>0,a≠1) 恒过 (0,1)。",
                formulas: ["y=aˣ", "aˣ·aʸ=aˣ⁺ʸ"],
                steps: ["看底数 a>1 还是 0<a<1", "过 (0,1)", "用运算性质化简"],
              }),
              L("m-log", "对数函数", "explog", {
                idea: "对数是指数的逆运算。",
                formulas: ["log_a(xy)=log_a x+log_a y", "a^{log_a x}=x"],
                steps: ["对齐底数", "真数>0", "用运算性质合并"],
              }),
            ],
          },
          {
            id: "m1-trig",
            label: "三角函数",
            leaves: [
              L("m-rad", "任意角与弧度", "unit-circle", {
                idea: "弧度是半径弧长对应的圆心角。",
                formulas: ["π rad = 180°", "l=|α|r"],
                steps: ["度→弧度乘 π/180", "落到 0～2π", "在单位圆上标点"],
              }),
              L("m-unit", "单位圆与三角函数", "unit-circle", {
                idea: "单位圆上点的坐标就是 (cosα, sinα)。",
                formulas: ["sin²α+cos²α=1"],
                steps: ["画单位圆", "标终边", "读坐标得正弦余弦"],
              }),
              L("m-trig-id", "诱导公式", "unit-circle", {
                idea: "化到锐角再求值。",
                formulas: ["sin(π−α)=sinα", "cos(π−α)=−cosα"],
                steps: ["看象限定符号", "用诱导化锐角", "代入特殊值"],
              }),
            ],
          },
        ],
      },
      {
        id: "math-req-2",
        label: "必修第二册",
        children: [
          {
            id: "m2-vec",
            label: "平面向量",
            leaves: [
              L("m-vec-op", "向量加减与数乘", "vector", {
                idea: "几何上是平移合成，坐标上是分量运算。",
                formulas: ["a+b", "λa"],
                steps: ["画平行四边形", "或拆成坐标", "数乘只改长度与方向"],
              }),
              L("m-vec-dot", "数量积", "vector", {
                idea: "a·b=|a||b|cosθ，可判垂直。",
                formulas: ["a·b=x₁x₂+y₁y₂"],
                steps: ["写坐标", "算点积", "为 0 则垂直"],
              }),
            ],
          },
          {
            id: "m2-cx",
            label: "复数",
            leaves: [
              L("m-cx", "复数的几何意义", "complex", {
                idea: "a+bi 对应复平面点 (a,b)。",
                formulas: ["|z|=√(a²+b²)", "z=a+bi"],
                steps: ["实部横轴、虚部纵轴", "模是到原点距离", "加法即向量加法"],
              }),
            ],
          },
          {
            id: "m2-solid",
            label: "立体几何初步",
            leaves: [
              L("m-cube-d", "正方体体对角线", "cube", {
                hint: "空间对角线",
                subject: "geometry",
                text: "正方体棱长为2，求体对角线AG的长度",
                formulas: ["ℓ=a√3"],
              }),
              L("m-cube-s", "正方体表面积与体积", "cube", {
                subject: "geometry",
                text: "正方体棱长为3，求体积和表面积",
                formulas: ["V=a³", "S=6a²"],
              }),
              L("m-cuboid", "长方体对角线", "cuboid", {
                subject: "geometry",
                text: "长方体长4宽3高12，求体对角线",
                formulas: ["ℓ=√(a²+b²+c²)"],
              }),
              L("m-pyr", "棱锥体积", "pyramid", {
                subject: "geometry",
                text: "正四棱锥底面边长为4，高为3，求体积",
                formulas: ["V=⅓Sh"],
              }),
              L("m-cyl", "圆柱体积与侧面积", "cylinder", {
                subject: "geometry",
                text: "圆柱底面半径为2，高为5，求体积和侧面积",
                formulas: ["V=πr²h", "S侧=2πrh"],
              }),
              L("m-cone", "圆锥体积", "cone", {
                subject: "geometry",
                text: "圆锥底面半径为3，高为4，求体积",
                formulas: ["V=⅓πr²h"],
              }),
              L("m-sph", "球的体积与表面积", "sphere", {
                subject: "geometry",
                text: "球体半径为3，求体积和表面积",
                formulas: ["V=⁴⁄₃πr³", "S=4πr²"],
              }),
              L("m-fru", "圆台体积", "frustum", {
                subject: "geometry",
                text: "圆台上底半径2，下底半径4，高3，求体积",
                formulas: ["V=⅓πh(R²+Rr+r²)"],
              }),
            ],
          },
          {
            id: "m2-stat",
            label: "统计与概率",
            leaves: [
              L("m-hist", "抽样与直方图", "hist", {
                idea: "用频率分布直方图看数据形态。",
                formulas: ["频率=频数/总数"],
                steps: ["分组", "算频率", "高=频率/组距"],
              }),
              L("m-prob", "古典概型", "prob", {
                subject: "combo",
                sampleKey: "classical_prob",
                text: "袋中有3红2白，不放回摸2球，求两球都红的概率",
                formulas: ["P=n/m"],
                hint: "等可能",
              }),
            ],
          },
        ],
      },
      {
        id: "math-opt-1",
        label: "选择性必修第一册",
        children: [
          {
            id: "mo1-space",
            label: "空间向量与立体几何",
            leaves: [
              L("m-space-d", "空间中的体对角线", "cube", {
                subject: "geometry",
                text: "正方体棱长为2，求体对角线AG的长度",
                formulas: ["AG=a√3"],
                hint: "用空间想象或坐标",
              }),
              L("m-perp", "线面垂直的判定", "cube", {
                idea: "线垂直面上两条相交直线 ⇒ 线面垂直。",
                formulas: ["n·d=0（方向与法向）"],
                steps: ["在面内找两条相交直线", "证与已知线都垂直", "下结论"],
                subject: "geometry",
                text: "正方体棱长为2，求体对角线AG的长度",
              }),
            ],
          },
          {
            id: "mo1-line",
            label: "直线与圆",
            leaves: [
              L("m-line", "直线方程", "line-circle", {
                idea: "点斜式、一般式可以互化。",
                formulas: ["y−y₀=k(x−x₀)", "Ax+By+C=0"],
                steps: ["有点有斜率用点斜式", "化一般式", "看斜率与截距"],
              }),
              L("m-circle", "圆的方程", "line-circle", {
                idea: "标准方程看圆心半径。",
                formulas: ["(x−a)²+(y−b)²=r²"],
                subject: "conic",
                sampleKey: "circle_r",
                text: "将 x²+y²−4x+6y−3=0 化为标准方程，求圆心和半径",
              }),
            ],
          },
          {
            id: "mo1-conic",
            label: "圆锥曲线",
            leaves: [
              L("m-ell", "椭圆离心率", "ellipse", {
                subject: "conic",
                sampleKey: "ellipse_e",
                text: "椭圆 x²/25+y²/16=1 的离心率",
                formulas: ["e=c/a", "c²=a²−b²"],
              }),
              L("m-hyp", "双曲线焦点", "hyperbola", {
                subject: "conic",
                sampleKey: "hyper_focus",
                text: "双曲线 x²/9−y²/16=1 的焦点坐标",
                formulas: ["c²=a²+b²"],
              }),
              L("m-par", "抛物线定义", "parabola", {
                idea: "到焦点与准线距离相等。",
                formulas: ["y²=2px"],
                steps: ["认焦点与准线", "用定义列式", "化标准形"],
              }),
            ],
          },
        ],
      },
      {
        id: "math-opt-2",
        label: "选择性必修第二册",
        children: [
          {
            id: "mo2-seq",
            label: "数列",
            leaves: [
              L("m-arith", "等差数列", "sequence", {
                idea: "公差固定，通项线性。",
                formulas: ["aₙ=a₁+(n−1)d", "Sₙ=n(a₁+aₙ)/2"],
                steps: ["认首项与公差", "写通项", "用求和公式"],
              }),
              L("m-geo", "等比数列", "sequence", {
                idea: "公比固定，通项指数。",
                formulas: ["aₙ=a₁qⁿ⁻¹", "Sₙ=a₁(1−qⁿ)/(1−q)"],
                steps: ["认首项与公比", "q≠1 用等比求和", "q=1 直接 n·a₁"],
              }),
            ],
          },
          {
            id: "mo2-der",
            label: "导数及其应用",
            leaves: [
              L("m-der-poly", "多项式求导", "derivative", {
                subject: "derivative",
                sampleKey: "deriv_poly",
                text: "求 f(x)=x³−3x 的导数",
                formulas: ["(xⁿ)′=n xⁿ⁻¹"],
              }),
              L("m-der-tan", "切线方程", "derivative", {
                subject: "derivative",
                sampleKey: "deriv_tangent",
                text: "求曲线 y=x³−3x 在 x=1 处的切线方程",
                formulas: ["y−y₀=f′(x₀)(x−x₀)"],
              }),
              L("m-der-mono", "导数与单调性", "derivative", {
                subject: "derivative",
                sampleKey: "deriv_mono",
                text: "求 f(x)=x³−3x 的单调区间",
                formulas: ["f′>0 增", "f′<0 减"],
              }),
            ],
          },
        ],
      },
      {
        id: "math-opt-3",
        label: "选择性必修第三册",
        children: [
          {
            id: "mo3-count",
            label: "计数原理",
            leaves: [
              L("m-mul", "分类分步计数", "count", {
                subject: "combo",
                sampleKey: "multiply_add",
                text: "从正副组长各 1 名的选法：正组长 5 选 1，副组长 4 选 1，共多少种？",
                formulas: ["分步相乘", "分类相加"],
              }),
              L("m-comb", "排列与组合", "count", {
                subject: "combo",
                sampleKey: "perm_comb",
                text: "从 5 名同学中选 3 名代表，有多少种选法？",
                formulas: ["Aₙᵐ=n!/(n−m)!", "Cₙᵐ=n!/(m!(n−m)!)"],
              }),
            ],
          },
          {
            id: "mo3-rv",
            label: "随机变量",
            leaves: [
              L("m-dist", "离散型分布列", "dist", {
                idea: "每个取值对应一个概率，和为 1。",
                formulas: ["∑pᵢ=1", "E(X)=∑xᵢpᵢ"],
                steps: ["列出所有取值", "算每个概率", "检查和为 1"],
              }),
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
            id: "p1-motion",
            label: "运动的描述",
            leaves: [
              L("p-v", "匀变速求末速度", "vt", {
                subject: "phys_motion",
                sampleKey: "phys_kinematic",
                text: "物体初速为 0，加速度 2 m/s²，求 3 s 后的速度",
                formulas: ["v=v₀+at"],
              }),
              L("p-s", "匀变速求位移", "vt", {
                subject: "phys_motion",
                sampleKey: "phys_displacement",
                text: "初速为 0，加速度 2 m/s²，求 4 s 内的位移",
                formulas: ["s=v₀t+½at²"],
              }),
              L("p-v2", "速度位移公式", "vt", {
                subject: "phys_motion",
                sampleKey: "phys_v2as",
                text: "初速 0，加速度 3 m/s²，位移 6 m，求末速度",
                formulas: ["v²=v₀²+2as"],
              }),
            ],
          },
          {
            id: "p1-force",
            label: "相互作用与牛顿定律",
            leaves: [
              L("p-g", "重力", "force", {
                subject: "phys_static",
                sampleKey: "phys_weight",
                text: "质量 5 kg，取 g=10，求重力大小",
                formulas: ["G=mg"],
              }),
              L("p-n2", "牛顿第二定律", "force", {
                subject: "phys_dynamics",
                sampleKey: "phys_newton",
                text: "质量 2 kg 的物体受到 10 N 的合力，求加速度",
                formulas: ["F=ma"],
              }),
              L("p-free", "受力分析", "force", {
                idea: "先重力，再弹力摩擦力，最后看其他力。",
                formulas: ["∑F=ma"],
                steps: ["隔离物体", "画力", "正交分解列方程"],
              }),
            ],
          },
        ],
      },
      {
        id: "phys-req-2",
        label: "必修第二册",
        children: [
          {
            id: "p2-energy",
            label: "机械能",
            leaves: [
              L("p-w", "恒力做功", "energy", {
                subject: "phys_dynamics",
                sampleKey: "phys_work",
                text: "20 N 的力同向推动物体 3 m，求功",
                formulas: ["W=Fs cosθ"],
              }),
              L("p-ke", "动能", "energy", {
                subject: "phys_dynamics",
                sampleKey: "phys_ke",
                text: "质量 2 kg、速度 3 m/s，求动能",
                formulas: ["Eₖ=½mv²"],
              }),
              L("p-pe", "重力势能", "energy", {
                subject: "phys_dynamics",
                sampleKey: "phys_pe",
                text: "质量 2 kg、高度 5 m，取 g=10，求重力势能",
                formulas: ["Eₚ=mgh"],
              }),
            ],
          },
          {
            id: "p2-curve",
            label: "曲线运动与万有引力",
            leaves: [
              L("p-proj", "平抛运动", "projectile", {
                idea: "水平匀速，竖直自由落体。",
                formulas: ["x=v₀t", "y=½gt²"],
                steps: ["分解水平和竖直", "时间由竖直决定", "合位移合成"],
              }),
              L("p-circ", "匀速圆周", "orbit", {
                idea: "合力提供向心力。",
                formulas: ["aₙ=v²/r", "F=mv²/r"],
                steps: ["找圆心与半径", "认向心力来源", "列牛顿定律"],
              }),
              L("p-grav", "万有引力", "orbit", {
                idea: "天体可看作质点，引力提供向心力。",
                formulas: ["F=GMm/r²", "v=√(GM/r)"],
                steps: ["写引力公式", "等于向心力", "求周期或速度"],
              }),
            ],
          },
        ],
      },
      {
        id: "phys-req-3",
        label: "必修第三册",
        children: [
          {
            id: "p3-em",
            label: "电磁学初步",
            leaves: [
              L("p-e", "电场强度", "charge", {
                subject: "phys_efield",
                sampleKey: "phys_efield_def",
                text: "电荷受电场力 4 N，电荷量 2×10⁻⁶ C，求场强",
                formulas: ["E=F/q"],
              }),
              L("p-ohm", "欧姆定律", "circuit", {
                subject: "phys_circuit",
                sampleKey: "phys_ohm",
                text: "电阻 5 Ω，电流 2 A，求电压",
                formulas: ["U=IR"],
              }),
              L("p-emw", "电磁波初步", "wave", {
                idea: "变化的电磁场传播形成电磁波。",
                formulas: ["c=λf"],
                steps: ["认波速 c", "频率与波长互算", "记住真空中 c"],
              }),
            ],
          },
        ],
      },
      {
        id: "phys-opt-1",
        label: "选择性必修第一册",
        children: [
          {
            id: "po1",
            label: "动量、振动、波与光",
            leaves: [
              L("p-mom", "动量守恒", "momentum", {
                idea: "系统合外力为零时动量守恒。",
                formulas: ["p=mv", "m₁v₁+m₂v₂=常数"],
                steps: ["判断系统", "选正方向", "列守恒式"],
              }),
              L("p-spr", "简谐运动", "spring", {
                idea: "回复力与位移成正比反向。",
                formulas: ["F=−kx", "T=2π√(m/k)"],
                steps: ["认平衡位置", "写回复力", "周期公式"],
              }),
              L("p-wave", "机械波", "wave", {
                idea: "振动在介质中传播，质点不随波迁移。",
                formulas: ["v=λf"],
                steps: ["认波长周期", "v=λ/T", "画波形"],
              }),
              L("p-lens", "光的折射", "lens", {
                idea: "折射定律决定光线偏折。",
                formulas: ["n₁sinθ₁=n₂sinθ₂"],
                steps: ["作法线", "标入射折射角", "代折射率"],
              }),
            ],
          },
        ],
      },
      {
        id: "phys-opt-2",
        label: "选择性必修第二册",
        children: [
          {
            id: "po2",
            label: "磁场与电磁感应",
            leaves: [
              L("p-lor", "洛伦兹力", "lorentz", {
                subject: "phys_bfield",
                sampleKey: "phys_lorentz",
                text: "带电粒子垂直进入匀强磁场做匀速圆周运动（定性理解）",
                formulas: ["F=qvB"],
              }),
              L("p-far", "法拉第电磁感应", "induction", {
                subject: "phys_induction",
                sampleKey: "phys_faraday",
                text: "磁通量在 0.2 s 内变化 0.4 Wb，求感应电动势大小",
                formulas: ["ε=ΔΦ/Δt"],
              }),
              L("p-ac", "交变电流", "ac", {
                idea: "e=Eₘsinωt，有效值用于热效应。",
                formulas: ["Eₘ=NBSω", "E=Eₘ/√2"],
                steps: ["认最大值", "有效值除以 √2", "算功率用有效值"],
              }),
            ],
          },
        ],
      },
      {
        id: "phys-opt-3",
        label: "选择性必修第三册",
        children: [
          {
            id: "po3",
            label: "热学与近代物理",
            leaves: [
              L("p-gas", "理想气体", "gas", {
                idea: "宏观量 p、V、T 由状态方程联系。",
                formulas: ["pV=nRT"],
                steps: ["认状态量", "等温/等容/等压", "代状态方程"],
              }),
              L("p-atom", "原子结构", "atom", {
                idea: "原子核外电子分层，能级跃迁发光。",
                formulas: ["ΔE=hν"],
                steps: ["认能级差", "频率 ν=ΔE/h", "光谱对应跃迁"],
              }),
            ],
          },
        ],
      },
    ],
  },
];

export function flattenCurriculumLeaves(subjects = CURRICULUM) {
  const out = [];
  for (const subj of subjects) {
    for (const book of subj.books || []) walk(book, out);
  }
  return out;
}

function walk(node, out) {
  if (node.leaves) out.push(...node.leaves);
  if (node.children) node.children.forEach((c) => walk(c, out));
}

export function findLeafById(id) {
  return flattenCurriculumLeaves().find((l) => l.id === id) || null;
}

export function curriculumStats() {
  const leaves = flattenCurriculumLeaves();
  return {
    subjects: CURRICULUM.length,
    books: CURRICULUM.reduce((n, s) => n + (s.books?.length || 0), 0),
    points: leaves.length,
    models: new Set(leaves.map((l) => l.model)).size,
    playable: leaves.filter((l) => l.subject && l.text).length,
  };
}
