/**
 * 物理板块 ExplainIR — 高中力学，分三个二级专题
 * 运动学 · 牛顿定律 · 功与能
 */

const V = 1

export const EX_PHYS_KINEMATIC = Object.freeze({
  version: V,
  problemType: 'phys_kinematic',
  topic: 'phys_motion',
  goal: '物体初速为 0，加速度 2 m/s²，求 3 s 后的速度',
  coreIdea: '匀变速：v = v₀ + at，先认清三个量再代入。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: '匀变速直线',
      kind: 'choice',
      children: ['v0', 'a', 't'],
      why: '加速度恒定 → 用匀变速公式',
    },
    { id: 'v0', label: 'v₀ = 0', kind: 'outcome', children: [], why: '初速' },
    { id: 'a', label: 'a = 2', kind: 'outcome', children: [], why: '加速度' },
    { id: 't', label: 't = 3 s', kind: 'outcome', children: [], why: '时间' },
  ],
  steps: [
    {
      index: 1,
      title: '选题型',
      content: '加速度不变 → 匀变速直线运动。',
      why: '不要一上来乱套公式',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '列公式',
      content: 'v = v₀ + at',
      why: '速度随时间线性增加',
      formula: 'v=v₀+at',
      highlightNodeIds: ['root'],
    },
    {
      index: 3,
      title: '代入',
      content: 'v = 0 + 2×3 = 6',
      why: '单位用 m/s',
      formula: '2×3=6',
      highlightNodeIds: ['v0', 'a', 't'],
    },
    {
      index: 4,
      title: '结论',
      content: '3 s 后速度为 6 m/s',
      why: '方向与加速度同向（加速）',
      formula: '6 m/s',
      highlightNodeIds: ['root'],
    },
  ],
  answer: '6 m/s',
})

export const EX_PHYS_NEWTON = Object.freeze({
  version: V,
  problemType: 'phys_newton',
  topic: 'phys_force',
  goal: '质量 2 kg 的物体受到 10 N 的合力，求加速度',
  coreIdea: '牛顿第二定律：F = ma ⇒ a = F/m。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'F = ma',
      kind: 'choice',
      children: ['F', 'm', 'a'],
      why: '合力决定加速度',
    },
    { id: 'F', label: 'F = 10 N', kind: 'outcome', children: [], why: '合力' },
    { id: 'm', label: 'm = 2 kg', kind: 'outcome', children: [], why: '质量' },
    { id: 'a', label: 'a = 5 m/s²', kind: 'outcome', children: [], why: 'a=F/m' },
  ],
  steps: [
    {
      index: 1,
      title: '认定律',
      content: '求加速度且已知 F、m → 牛顿第二定律。',
      why: 'F 必须是合力',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '变形',
      content: 'a = F / m',
      why: '不要写成 a = m/F',
      formula: 'a=F/m',
      highlightNodeIds: ['F', 'm'],
    },
    {
      index: 3,
      title: '代入',
      content: 'a = 10 / 2 = 5',
      why: '单位：N/kg = m/s²',
      formula: '10/2=5',
      highlightNodeIds: ['a'],
    },
    {
      index: 4,
      title: '结论',
      content: '加速度为 5 m/s²，方向与合力相同',
      why: '加速度方向跟 F 同向',
      formula: '5 m/s²',
      highlightNodeIds: ['a'],
    },
  ],
  answer: '5 m/s²',
})

export const EX_PHYS_WORK = Object.freeze({
  version: V,
  problemType: 'phys_work',
  topic: 'phys_energy',
  goal: '用 20 N 的力把物体沿力的方向推动 3 m，求力做的功',
  coreIdea: '恒力做功：W = Fs（力与位移同向时）。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'W = Fs',
      kind: 'choice',
      children: ['F', 's', 'W'],
      why: '同向恒力 → 直接相乘',
    },
    { id: 'F', label: 'F = 20 N', kind: 'outcome', children: [], why: '力的大小' },
    { id: 's', label: 's = 3 m', kind: 'outcome', children: [], why: '位移' },
    { id: 'W', label: 'W = 60 J', kind: 'outcome', children: [], why: '功的单位焦耳' },
  ],
  steps: [
    {
      index: 1,
      title: '判断',
      content: '力与位移同向，用 W = Fs。',
      why: '有夹角时才是 W = Fs cosθ',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '代入',
      content: 'W = 20 × 3 = 60',
      why: 'N·m = J',
      formula: '20×3=60',
      highlightNodeIds: ['F', 's'],
    },
    {
      index: 3,
      title: '结论',
      content: '力做功 60 J',
      why: '功是过程量，可正可负',
      formula: '60 J',
      highlightNodeIds: ['W'],
    },
  ],
  answer: '60 J',
})

export const EX_PHYS_DISPLACEMENT = Object.freeze({
  version: V,
  problemType: 'phys_displacement',
  topic: 'phys_motion',
  goal: '物体初速为 0，加速度 2 m/s²，求 4 s 内的位移',
  coreIdea: '匀变速位移：s = v₀t + ½at²。初速为 0 时 s = ½at²。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 's = v₀t + ½at²',
      kind: 'choice',
      children: ['v0', 'a', 't'],
      why: '加速度恒定才用这套公式',
    },
    { id: 'v0', label: 'v₀ = 0', kind: 'outcome', children: [], why: '初速为 0' },
    { id: 'a', label: 'a = 2', kind: 'outcome', children: [], why: '加速度' },
    { id: 't', label: 't = 4 s', kind: 'outcome', children: [], why: '时间' },
  ],
  steps: [
    {
      index: 1,
      title: '选题型',
      content: '求位移且 a 恒定 → 用位移公式。',
      why: '别和 v=v₀+at 搞混',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '化简',
      content: 'v₀=0 ⇒ s = ½at²',
      why: '少一项，少算错',
      formula: 's=½at²',
      highlightNodeIds: ['v0'],
    },
    {
      index: 3,
      title: '代入',
      content: 's = ½×2×4² = 16',
      why: '先算 t²=16',
      formula: '½×2×16=16',
      highlightNodeIds: ['a', 't'],
    },
    {
      index: 4,
      title: '结论',
      content: '4 s 内位移为 16 m',
      why: '方向与加速度同向',
      formula: '16 m',
      highlightNodeIds: ['root'],
    },
  ],
  answer: '16 m',
})

export const EX_PHYS_V2AS = Object.freeze({
  version: V,
  problemType: 'phys_v2as',
  topic: 'phys_motion',
  goal: '物体初速为 0，加速度 4 m/s²，位移 8 m，求末速度',
  coreIdea: '不含时间时用：v² = v₀² + 2as。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'v² = v₀² + 2as',
      kind: 'choice',
      children: ['v0', 'a', 's'],
      why: '已知 a、s，未知 t → 用此式',
    },
    { id: 'v0', label: 'v₀ = 0', kind: 'outcome', children: [], why: '初速' },
    { id: 'a', label: 'a = 4', kind: 'outcome', children: [], why: '加速度' },
    { id: 's', label: 's = 8 m', kind: 'outcome', children: [], why: '位移' },
  ],
  steps: [
    {
      index: 1,
      title: '选题型',
      content: '题目没给时间 → 用 v² = v₀² + 2as。',
      why: '三个匀变速公式要会挑',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '化简',
      content: 'v₀=0 ⇒ v² = 2as',
      why: '初速为 0 更简单',
      formula: 'v²=2as',
      highlightNodeIds: ['v0'],
    },
    {
      index: 3,
      title: '代入',
      content: 'v² = 2×4×8 = 64 ⇒ v = 8',
      why: '速度取正值（与 a 同向）',
      formula: '√64=8',
      highlightNodeIds: ['a', 's'],
    },
    {
      index: 4,
      title: '结论',
      content: '末速度为 8 m/s',
      why: '平方关系，别忘开方',
      formula: '8 m/s',
      highlightNodeIds: ['root'],
    },
  ],
  answer: '8 m/s',
})

export const EX_PHYS_WEIGHT = Object.freeze({
  version: V,
  problemType: 'phys_weight',
  topic: 'phys_force',
  goal: '质量 5 kg 的物体，取 g=10 m/s²，求重力大小',
  coreIdea: '重力 G = mg，方向竖直向下。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'G = mg',
      kind: 'choice',
      children: ['m', 'g', 'G'],
      why: '地球附近近似恒定',
    },
    { id: 'm', label: 'm = 5 kg', kind: 'outcome', children: [], why: '质量' },
    { id: 'g', label: 'g = 10', kind: 'outcome', children: [], why: '重力加速度' },
    { id: 'G', label: 'G = 50 N', kind: 'outcome', children: [], why: '重力' },
  ],
  steps: [
    {
      index: 1,
      title: '认公式',
      content: '求重力 → G = mg。',
      why: '质量 ≠ 重力',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '代入',
      content: 'G = 5 × 10 = 50',
      why: 'kg·m/s² = N',
      formula: '5×10=50',
      highlightNodeIds: ['m', 'g'],
    },
    {
      index: 3,
      title: '结论',
      content: '重力大小为 50 N，方向竖直向下',
      why: '力有方向',
      formula: '50 N',
      highlightNodeIds: ['G'],
    },
  ],
  answer: '50 N',
})

export const EX_PHYS_FIND_F = Object.freeze({
  version: V,
  problemType: 'phys_find_F',
  topic: 'phys_force',
  goal: '质量 3 kg 的物体加速度为 2 m/s²，求所需合力',
  coreIdea: '反过来用 F = ma：已知 m、a 求合力。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'F = ma',
      kind: 'choice',
      children: ['m', 'a', 'F'],
      why: '加速度由合力产生',
    },
    { id: 'm', label: 'm = 3 kg', kind: 'outcome', children: [], why: '质量' },
    { id: 'a', label: 'a = 2 m/s²', kind: 'outcome', children: [], why: '加速度' },
    { id: 'F', label: 'F = 6 N', kind: 'outcome', children: [], why: '合力' },
  ],
  steps: [
    {
      index: 1,
      title: '认定律',
      content: '已知 m、a 求力 → F = ma。',
      why: '和 a=F/m 是同一式',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '代入',
      content: 'F = 3 × 2 = 6',
      why: '合力方向与 a 同向',
      formula: '3×2=6',
      highlightNodeIds: ['m', 'a'],
    },
    {
      index: 3,
      title: '结论',
      content: '所需合力为 6 N',
      why: '若有摩擦，合力 = 外力 − 阻力',
      formula: '6 N',
      highlightNodeIds: ['F'],
    },
  ],
  answer: '6 N',
})

export const EX_PHYS_KE = Object.freeze({
  version: V,
  problemType: 'phys_ke',
  topic: 'phys_energy',
  goal: '质量 2 kg 的物体速度为 3 m/s，求动能',
  coreIdea: '动能 Ek = ½mv²，只与质量和速率有关。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'Ek = ½mv²',
      kind: 'choice',
      children: ['m', 'v', 'Ek'],
      why: '动能是标量、非负',
    },
    { id: 'm', label: 'm = 2 kg', kind: 'outcome', children: [], why: '质量' },
    { id: 'v', label: 'v = 3 m/s', kind: 'outcome', children: [], why: '速率' },
    { id: 'Ek', label: 'Ek = 9 J', kind: 'outcome', children: [], why: '动能' },
  ],
  steps: [
    {
      index: 1,
      title: '认公式',
      content: '求动能 → Ek = ½mv²。',
      why: '别漏掉 ½，也别忘平方',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '代入',
      content: 'Ek = ½×2×3² = 9',
      why: '先算 v²=9',
      formula: '½×2×9=9',
      highlightNodeIds: ['m', 'v'],
    },
    {
      index: 3,
      title: '结论',
      content: '动能为 9 J',
      why: '速度方向变、速率不变 → 动能不变',
      formula: '9 J',
      highlightNodeIds: ['Ek'],
    },
  ],
  answer: '9 J',
})

export const EX_PHYS_PE = Object.freeze({
  version: V,
  problemType: 'phys_pe',
  topic: 'phys_energy',
  goal: '质量 2 kg 的物体升高 5 m，取 g=10 m/s²，求重力势能增加量',
  coreIdea: '重力势能 Ep = mgh（相对某一零势能面）。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'Ep = mgh',
      kind: 'choice',
      children: ['m', 'g', 'h'],
      why: '升高 → 势能增加',
    },
    { id: 'm', label: 'm = 2 kg', kind: 'outcome', children: [], why: '质量' },
    { id: 'g', label: 'g = 10', kind: 'outcome', children: [], why: '取 10' },
    { id: 'h', label: 'h = 5 m', kind: 'outcome', children: [], why: '高度变化' },
  ],
  steps: [
    {
      index: 1,
      title: '认公式',
      content: '重力势能变化 ΔEp = mgh（h 为升高量）。',
      why: '零势能面可自选，变化量与选取无关',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '代入',
      content: 'ΔEp = 2 × 10 × 5 = 100',
      why: '单位焦耳',
      formula: '2×10×5=100',
      highlightNodeIds: ['m', 'g', 'h'],
    },
    {
      index: 3,
      title: '结论',
      content: '重力势能增加 100 J',
      why: '升高做正功于势能，降低则减少',
      formula: '100 J',
      highlightNodeIds: ['root'],
    },
  ],
  answer: '100 J',
})

/** 电路 · 欧姆定律方法样例 */
export const EX_PHYS_OHM = Object.freeze({
  version: V,
  problemType: 'phys_ohm',
  topic: 'phys_circuit',
  goal: '电阻 6 Ω 的导体中电流为 2 A，求两端电压',
  coreIdea: '先认欧姆定律 U = IR，再代入。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'U = IR',
      kind: 'choice',
      children: ['I', 'R', 'U'],
      why: '一段电阻的电压、电流、电阻关系',
    },
    { id: 'I', label: 'I = 2 A', kind: 'outcome', children: [], why: '电流' },
    { id: 'R', label: 'R = 6 Ω', kind: 'outcome', children: [], why: '电阻' },
    { id: 'U', label: 'U = 12 V', kind: 'outcome', children: [], why: '电压' },
  ],
  steps: [
    {
      index: 1,
      title: '选题型',
      content: '已知 I、R 求 U → 欧姆定律。',
      why: '不要先背串并联公式',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '列式',
      content: 'U = IR',
      why: '电压 = 电流 × 电阻',
      formula: 'U=IR',
      highlightNodeIds: ['I', 'R'],
    },
    {
      index: 3,
      title: '代入',
      content: 'U = 2 × 6 = 12',
      why: '单位：A·Ω = V',
      formula: '2×6=12',
      highlightNodeIds: ['U'],
    },
    {
      index: 4,
      title: '结论',
      content: '两端电压为 12 V',
      why: '方向：电流从高电势流向低电势',
      formula: '12 V',
      highlightNodeIds: ['U'],
    },
  ],
  answer: '12 V',
})

/** 电场 · 场强定义方法样例 */
export const EX_PHYS_EFIELD = Object.freeze({
  version: V,
  problemType: 'phys_efield_def',
  topic: 'phys_efield',
  goal: '电荷量 2×10⁻⁶ C 的试探电荷在电场中受力 4×10⁻³ N，求该点场强',
  coreIdea: '场强定义：E = F / q（与试探电荷无关）。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'E = F / q',
      kind: 'choice',
      children: ['F', 'q', 'E'],
      why: '用试探电荷测出场，再除掉电荷量',
    },
    { id: 'F', label: 'F = 4×10⁻³ N', kind: 'outcome', children: [], why: '电场力' },
    { id: 'q', label: 'q = 2×10⁻⁶ C', kind: 'outcome', children: [], why: '试探电荷' },
    { id: 'E', label: 'E = 2×10³ N/C', kind: 'outcome', children: [], why: '场强' },
  ],
  steps: [
    {
      index: 1,
      title: '认定义',
      content: '求场强且给了 F、q → E = F/q。',
      why: 'E 描述场本身，不是力',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '代入',
      content: 'E = 4×10⁻³ / 2×10⁻⁶ = 2×10³',
      why: '先算数量级：10⁻³/10⁻⁶ = 10³',
      formula: 'E=F/q',
      highlightNodeIds: ['F', 'q'],
    },
    {
      index: 3,
      title: '结论',
      content: '该点场强为 2×10³ N/C，方向与正电荷受力同向',
      why: '正试探电荷受力方向 = 场强方向',
      formula: '2×10³ N/C',
      highlightNodeIds: ['E'],
    },
  ],
  answer: '2×10³ N/C',
})

/** 磁场 · 洛伦兹力方法样例 */
export const EX_PHYS_LORENTZ = Object.freeze({
  version: V,
  problemType: 'phys_lorentz',
  topic: 'phys_bfield',
  goal: '带电粒子垂直进入匀强磁场，说明它做什么运动并指出方法',
  coreIdea: 'v⊥B 时洛伦兹力提供向心力 → 匀速圆周运动；方向用左手定则。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'F = qvB',
      kind: 'choice',
      children: ['hand', 'circle', 'r'],
      why: '垂直入射：力始终垂直速度',
    },
    { id: 'hand', label: '左手定则定方向', kind: 'outcome', children: [], why: '掌心、指、拇' },
    { id: 'circle', label: '匀速圆周', kind: 'outcome', children: [], why: 'F ⊥ v，速率不变' },
    { id: 'r', label: 'r = mv/(qB)', kind: 'outcome', children: [], why: '向心力公式' },
  ],
  steps: [
    {
      index: 1,
      title: '看关系',
      content: '速度与磁场垂直 → 用 F = qvB。',
      why: '平行分量不受洛伦兹力',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '定方向',
      content: '左手定则：磁感线穿掌心，四指指向正电荷运动方向，拇指为力。',
      why: '负电荷四指反向',
      highlightNodeIds: ['hand'],
    },
    {
      index: 3,
      title: '判运动',
      content: 'F 始终垂直 v → 只改方向不改大小 → 匀速圆周。',
      why: '不做功，动能不变',
      highlightNodeIds: ['circle'],
    },
    {
      index: 4,
      title: '结论',
      content: '做匀速圆周运动；半径 r = mv/(qB)',
      why: 'qvB = mv²/r',
      formula: 'r=mv/(qB)',
      highlightNodeIds: ['r'],
    },
  ],
  answer: '匀速圆周，r=mv/(qB)',
})

/** 电磁感应 · 法拉第方法样例 */
export const EX_PHYS_FARADAY = Object.freeze({
  version: V,
  problemType: 'phys_faraday',
  topic: 'phys_induction',
  goal: '穿过线圈的磁通量在 0.2 s 内从 0.01 Wb 变为 0.05 Wb，求感应电动势大小',
  coreIdea: '法拉第电磁感应：ε = |ΔΦ/Δt|（单匝）。',
  rootId: 'root',
  nodes: [
    {
      id: 'root',
      label: 'ε = |ΔΦ/Δt|',
      kind: 'choice',
      children: ['dPhi', 'dt', 'eps'],
      why: '磁通量变化率决定电动势',
    },
    { id: 'dPhi', label: 'ΔΦ = 0.04 Wb', kind: 'outcome', children: [], why: '0.05−0.01' },
    { id: 'dt', label: 'Δt = 0.2 s', kind: 'outcome', children: [], why: '时间' },
    { id: 'eps', label: 'ε = 0.2 V', kind: 'outcome', children: [], why: '电动势' },
  ],
  steps: [
    {
      index: 1,
      title: '认公式',
      content: '求感应电动势 → ε = |ΔΦ/Δt|。',
      why: '多匝再乘 N',
      highlightNodeIds: ['root'],
    },
    {
      index: 2,
      title: '算变化',
      content: 'ΔΦ = 0.05 − 0.01 = 0.04 Wb',
      why: '只看变化量',
      formula: 'ΔΦ=0.04',
      highlightNodeIds: ['dPhi'],
    },
    {
      index: 3,
      title: '代入',
      content: 'ε = 0.04 / 0.2 = 0.2 V',
      why: 'Wb/s = V',
      formula: '0.04/0.2=0.2',
      highlightNodeIds: ['dt', 'eps'],
    },
    {
      index: 4,
      title: '结论',
      content: '感应电动势大小为 0.2 V（方向用楞次定律另判）',
      why: '大小与方向分开想',
      formula: '0.2 V',
      highlightNodeIds: ['eps'],
    },
  ],
  answer: '0.2 V',
})

/** 重点：力学 + 电磁（光学 / 热学·近代暂不开放） */
export const PHYSICS_GROUPS = Object.freeze([
  {
    id: 'mechanics',
    label: '力学',
    topics: ['phys_static', 'phys_motion', 'phys_dynamics'],
  },
  {
    id: 'electro',
    label: '电磁',
    topics: ['phys_circuit', 'phys_efield', 'phys_bfield', 'phys_induction'],
  },
])

export const PHYSICS_SECTION_IDS = Object.freeze(
  PHYSICS_GROUPS.flatMap((g) => g.topics),
)

export const PHYSICS_SECTIONS = Object.freeze({
  phys_static: {
    id: 'phys_static',
    label: '静力学',
    navLabel: '静力学',
    group: 'mechanics',
    kicker: '物理 · 力学 · 静力学',
    title: '先看清受力再列方程',
    placeholder:
      '例如：质量 5 kg，取 g=10，求重力大小\n或：质量 3 kg，加速度 2 m/s²，求所需合力',
    hint: '本地支持：G=mg、F=ma。平衡类可点样例或交给 AI。',
  },
  phys_motion: {
    id: 'phys_motion',
    label: '运动学',
    navLabel: '运动学',
    group: 'mechanics',
    kicker: '物理 · 力学 · 运动学',
    title: '用动画看清速度怎么变',
    placeholder:
      '例如：初速 0，加速度 2 m/s²，求 3 s 后的速度\n或：初速 0，a=2，求 4 s 内位移',
    hint: '本地支持：v=v₀+at、s=v₀t+½at²、v²=v₀²+2as。点样例看方法动画。',
  },
  phys_dynamics: {
    id: 'phys_dynamics',
    label: '动力学',
    navLabel: '动力学',
    group: 'mechanics',
    kicker: '物理 · 力学 · 动力学',
    title: '用动画看清力如何产生运动与做功',
    placeholder:
      '例如：质量 2 kg 受 10 N 合力求加速度\n或：20 N 同向推动 3 m 求功；质量 2 kg、v=3 求动能',
    hint: '本地支持：a=F/m、F=ma、G=mg、W=Fs、Ek=½mv²、Ep=mgh。点样例看方法动画。',
  },
  phys_circuit: {
    id: 'phys_circuit',
    label: '电路',
    navLabel: '电路',
    group: 'electro',
    kicker: '物理 · 电磁 · 电路',
    title: '先认清串并联再算',
    placeholder: '例如：串联电阻、欧姆定律、电功率相关题目',
    hint: '本地样例：欧姆定律 U=IR。点样例看方法动画。',
  },
  phys_efield: {
    id: 'phys_efield',
    label: '电场',
    navLabel: '电场',
    group: 'electro',
    kicker: '物理 · 电磁 · 电场',
    title: '先建立场的图像再算',
    placeholder: '例如：点电荷场强、电势差、带电粒子在电场中的运动',
    hint: '本地样例：场强定义 E=F/q。点样例看方法动画。',
  },
  phys_bfield: {
    id: 'phys_bfield',
    label: '磁场',
    navLabel: '磁场',
    group: 'electro',
    kicker: '物理 · 电磁 · 磁场',
    title: '看清左手定则与圆周',
    placeholder: '例如：安培力、洛伦兹力、带电粒子圆周运动',
    hint: '本地样例：洛伦兹力 → 匀速圆周。点样例看方法动画。',
  },
  phys_induction: {
    id: 'phys_induction',
    label: '电磁感应',
    navLabel: '电磁感应',
    group: 'electro',
    kicker: '物理 · 电磁 · 电磁感应',
    title: '磁通量变化 → 感应电动势',
    placeholder: '例如：法拉第电磁感应定律、楞次定律、导体棒切割',
    hint: '本地样例：ε=ΔΦ/Δt。点样例看方法动画。',
  },
})

export const PHYSICS_EXAMPLES = Object.freeze({
  phys_static: {
    phys_weight: EX_PHYS_WEIGHT,
    phys_find_F: EX_PHYS_FIND_F,
  },
  phys_motion: {
    phys_kinematic: EX_PHYS_KINEMATIC,
    phys_displacement: EX_PHYS_DISPLACEMENT,
    phys_v2as: EX_PHYS_V2AS,
  },
  phys_dynamics: {
    phys_newton: EX_PHYS_NEWTON,
    phys_weight: EX_PHYS_WEIGHT,
    phys_find_F: EX_PHYS_FIND_F,
    phys_work: EX_PHYS_WORK,
    phys_ke: EX_PHYS_KE,
    phys_pe: EX_PHYS_PE,
  },
  phys_circuit: {
    phys_ohm: EX_PHYS_OHM,
  },
  phys_efield: {
    phys_efield_def: EX_PHYS_EFIELD,
  },
  phys_bfield: {
    phys_lorentz: EX_PHYS_LORENTZ,
  },
  phys_induction: {
    phys_faraday: EX_PHYS_FARADAY,
  },
})

export const PHYSICS_EXAMPLE_LABELS = Object.freeze({
  phys_static: {
    phys_weight: '重力 G=mg',
    phys_find_F: '求合力 F=ma',
  },
  phys_motion: {
    phys_kinematic: '从静止加速求速度',
    phys_displacement: '从静止走多远',
    phys_v2as: '没给时间求末速',
  },
  phys_dynamics: {
    phys_newton: '牛顿第二定律',
    phys_weight: '重力 G=mg',
    phys_find_F: '求合力 F=ma',
    phys_work: '恒力做功',
    phys_ke: '动能',
    phys_pe: '重力势能',
  },
  phys_circuit: {
    phys_ohm: '欧姆定律 U=IR',
  },
  phys_efield: {
    phys_efield_def: '场强 E=F/q',
  },
  phys_bfield: {
    phys_lorentz: '洛伦兹力圆周',
  },
  phys_induction: {
    phys_faraday: 'ε=ΔΦ/Δt',
  },
})

/** @deprecated 旧入口映射 */
export const PHYSICS_LEGACY_TOPIC_MAP = Object.freeze({
  phys_force: 'phys_dynamics',
  phys_energy: 'phys_dynamics',
  physics: 'phys_motion',
})

export const PHYSICS_TOPIC = PHYSICS_SECTIONS.phys_motion

export function getPhysicsGroup(groupId) {
  return PHYSICS_GROUPS.find((g) => g.id === groupId) || PHYSICS_GROUPS[0]
}

export function getGroupIdForTopic(topic) {
  const sec = PHYSICS_SECTIONS[topic]
  if (sec?.group) return sec.group
  const mapped = PHYSICS_LEGACY_TOPIC_MAP[topic]
  return PHYSICS_SECTIONS[mapped]?.group || 'mechanics'
}

export function isPhysicsTopic(topic) {
  return (
    PHYSICS_SECTION_IDS.includes(topic) ||
    Boolean(PHYSICS_LEGACY_TOPIC_MAP[topic]) ||
    topic === 'physics'
  )
}

export function resolvePhysicsSectionId(sectionId) {
  if (!sectionId || sectionId === 'physics') return null
  return PHYSICS_LEGACY_TOPIC_MAP[sectionId] || sectionId
}

/**
 * @param {string} text
 * @param {string} [sectionId]
 */
export function solvePhysics(text, sectionId) {
  const raw = (text || '').trim()
  if (raw.length < 4) return null

  const MOTION = new Set(['phys_kinematic', 'phys_displacement', 'phys_v2as'])
  const FORCE = new Set(['phys_newton', 'phys_weight', 'phys_find_F'])
  const ENERGY = new Set(['phys_work', 'phys_ke', 'phys_pe'])
  const CIRCUIT = new Set(['phys_ohm'])
  const EFIELD = new Set(['phys_efield_def'])
  const BFIELD = new Set(['phys_lorentz'])
  const INDUCTION = new Set(['phys_faraday'])
  const resolved = resolvePhysicsSectionId(sectionId)

  const allow = (type) => {
    if (!sectionId || sectionId === 'physics') return true
    if (resolved === 'phys_motion') return MOTION.has(type)
    if (resolved === 'phys_static') return FORCE.has(type)
    if (
      resolved === 'phys_dynamics' ||
      sectionId === 'phys_force' ||
      sectionId === 'phys_energy'
    ) {
      return FORCE.has(type) || ENERGY.has(type)
    }
    if (resolved === 'phys_circuit') return CIRCUIT.has(type)
    if (resolved === 'phys_efield') return EFIELD.has(type)
    if (resolved === 'phys_bfield') return BFIELD.has(type)
    if (resolved === 'phys_induction') return INDUCTION.has(type)
    return false
  }

  const fmt = (n) =>
    Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4))).replace(/\.?0+$/, '')

  if (allow('phys_newton')) {
    const newton = raw.match(
      /质量\s*(\d+(?:\.\d+)?)\s*kg.*?(\d+(?:\.\d+)?)\s*N|(\d+(?:\.\d+)?)\s*N.*?质量\s*(\d+(?:\.\d+)?)\s*kg/i,
    )
    if (newton || (/加速度|牛顿|合力/.test(raw) && /kg/.test(raw) && /N/.test(raw))) {
      let m
      let F
      if (newton) {
        if (newton[1] && newton[2]) {
          m = Number(newton[1])
          F = Number(newton[2])
        } else {
          F = Number(newton[3])
          m = Number(newton[4])
        }
      }
      if (m > 0 && F >= 0) {
        const a = F / m
        const aStr = Number.isInteger(a) ? String(a) : a.toFixed(2).replace(/\.?0+$/, '')
        return {
          version: V,
          problemType: 'phys_newton',
          topic: 'phys_force',
          goal: raw,
          coreIdea: 'a = F/m，F 取合力。',
          rootId: 'root',
          nodes: [
            {
              id: 'root',
              label: 'F = ma',
              kind: 'choice',
              children: ['F', 'm', 'a'],
              why: '牛顿第二定律',
            },
            { id: 'F', label: `F = ${F} N`, kind: 'outcome', children: [], why: '合力' },
            { id: 'm', label: `m = ${m} kg`, kind: 'outcome', children: [], why: '质量' },
            {
              id: 'a',
              label: `a = ${aStr} m/s²`,
              kind: 'outcome',
              children: [],
              why: 'a=F/m',
            },
          ],
          steps: [
            {
              index: 1,
              title: '公式',
              content: 'a = F / m',
              why: 'F 必须是合力',
              formula: 'a=F/m',
              highlightNodeIds: ['root'],
            },
            {
              index: 2,
              title: '代入',
              content: `a = ${F} / ${m} = ${aStr}`,
              why: '单位 N/kg = m/s²',
              formula: `${aStr} m/s²`,
              highlightNodeIds: ['F', 'm', 'a'],
            },
          ],
          answer: `${aStr} m/s²`,
        }
      }
    }
  }

  // 位移 / 速度–位移式优先于「求速度」，避免抢答
  if (allow('phys_displacement') && /位移|路程/.test(raw)) {
    const d = raw.match(
      /初速[度为]?\s*(\d+(?:\.\d+)?)[\s\S]*?加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?(\d+(?:\.\d+)?)\s*s/,
    )
    const d2 = raw.match(
      /加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?(\d+(?:\.\d+)?)\s*s/,
    )
    let v0 = 0
    let a
    let t
    if (d) {
      v0 = Number(d[1])
      a = Number(d[2])
      t = Number(d[3])
    } else if (d2) {
      a = Number(d2[1])
      t = Number(d2[2])
      const v0m = raw.match(/初速[度为]?\s*(\d+(?:\.\d+)?)/)
      if (v0m) v0 = Number(v0m[1])
    }
    if (a != null && t != null && !/末速|速度为|求.*速度/.test(raw)) {
      const s = v0 * t + 0.5 * a * t * t
      return {
        version: V,
        problemType: 'phys_displacement',
        topic: 'phys_motion',
        goal: raw,
        coreIdea: 's = v₀t + ½at²',
        rootId: 'root',
        nodes: [
          { id: 'root', label: 's = v₀t + ½at²', kind: 'choice', children: ['v0', 'a', 't'], why: '匀变速位移' },
          { id: 'v0', label: `v₀ = ${fmt(v0)}`, kind: 'outcome', children: [], why: '初速' },
          { id: 'a', label: `a = ${fmt(a)}`, kind: 'outcome', children: [], why: '加速度' },
          { id: 't', label: `t = ${fmt(t)} s`, kind: 'outcome', children: [], why: '时间' },
        ],
        steps: [
          { index: 1, title: '公式', content: 's = v₀t + ½at²', why: '求位移用这个', formula: 's=v₀t+½at²', highlightNodeIds: ['root'] },
          { index: 2, title: '代入', content: `s = ${fmt(v0)}×${fmt(t)} + ½×${fmt(a)}×${fmt(t)}² = ${fmt(s)} m`, why: '单位 m', formula: `${fmt(s)} m`, highlightNodeIds: ['v0', 'a', 't'] },
        ],
        answer: `${fmt(s)} m`,
      }
    }
  }

  if (allow('phys_v2as') && /位移|路程/.test(raw) && !/\d+\s*s\b|秒/.test(raw.replace(/m\/s/g, ''))) {
    const v2 = raw.match(
      /初速[度为]?\s*(\d+(?:\.\d+)?)[\s\S]*?加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?(?:位移|路程)\s*(\d+(?:\.\d+)?)/,
    )
    const v2b = raw.match(
      /加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?(?:位移|路程)\s*(\d+(?:\.\d+)?)/,
    )
    let v0 = 0
    let a
    let s
    if (v2) {
      v0 = Number(v2[1])
      a = Number(v2[2])
      s = Number(v2[3])
    } else if (v2b) {
      a = Number(v2b[1])
      s = Number(v2b[2])
      const v0m = raw.match(/初速[度为]?\s*(\d+(?:\.\d+)?)/)
      if (v0m) v0 = Number(v0m[1])
    }
    if (a != null && s != null) {
      const v2val = v0 * v0 + 2 * a * s
      if (v2val >= 0) {
        const v = Math.sqrt(v2val)
        return {
          version: V,
          problemType: 'phys_v2as',
          topic: 'phys_motion',
          goal: raw,
          coreIdea: 'v² = v₀² + 2as',
          rootId: 'root',
          nodes: [
            { id: 'root', label: 'v² = v₀² + 2as', kind: 'choice', children: ['v0', 'a', 's'], why: '不含时间' },
            { id: 'v0', label: `v₀ = ${fmt(v0)}`, kind: 'outcome', children: [], why: '初速' },
            { id: 'a', label: `a = ${fmt(a)}`, kind: 'outcome', children: [], why: '加速度' },
            { id: 's', label: `s = ${fmt(s)} m`, kind: 'outcome', children: [], why: '位移' },
          ],
          steps: [
            { index: 1, title: '公式', content: 'v² = v₀² + 2as', why: '没给 t 时用', formula: 'v²=v₀²+2as', highlightNodeIds: ['root'] },
            { index: 2, title: '代入', content: `v² = ${fmt(v0)}² + 2×${fmt(a)}×${fmt(s)} = ${fmt(v2val)} ⇒ v = ${fmt(v)}`, why: '开方取与 a 同向', formula: `${fmt(v)} m/s`, highlightNodeIds: ['v0', 'a', 's'] },
          ],
          answer: `${fmt(v)} m/s`,
        }
      }
    }
  }

  if (allow('phys_kinematic') && !/位移|路程/.test(raw)) {
    const kin = raw.match(
      /初速[度为]?\s*(\d+(?:\.\d+)?)[\s\S]*?加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?(\d+(?:\.\d+)?)\s*s/,
    )
    const kin2 = raw.match(
      /加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?(\d+(?:\.\d+)?)\s*s[\s\S]*?初速[度为]?\s*(\d+(?:\.\d+)?)/,
    )
    if (kin || kin2 || (/匀变速|初速/.test(raw) && /加速/.test(raw) && /\d\s*s/.test(raw))) {
      let v0 = 0
      let a
      let t
      if (kin) {
        v0 = Number(kin[1])
        a = Number(kin[2])
        t = Number(kin[3])
      } else if (kin2) {
        a = Number(kin2[1])
        t = Number(kin2[2])
        v0 = Number(kin2[3])
      }
      if (a != null && t != null) {
        const v = v0 + a * t
        const vStr = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')
        return {
          version: V,
          problemType: 'phys_kinematic',
          topic: 'phys_motion',
          goal: raw,
          coreIdea: 'v = v₀ + at',
          rootId: 'root',
          nodes: [
            {
              id: 'root',
              label: 'v = v₀ + at',
              kind: 'choice',
              children: ['v0', 'a', 't'],
              why: '匀变速',
            },
            { id: 'v0', label: `v₀ = ${v0}`, kind: 'outcome', children: [], why: '初速' },
            { id: 'a', label: `a = ${a}`, kind: 'outcome', children: [], why: '加速度' },
            { id: 't', label: `t = ${t} s`, kind: 'outcome', children: [], why: '时间' },
          ],
          steps: [
            {
              index: 1,
              title: '公式',
              content: 'v = v₀ + at',
              why: '加速度恒定才可用',
              formula: 'v=v₀+at',
              highlightNodeIds: ['root'],
            },
            {
              index: 2,
              title: '代入',
              content: `v = ${v0} + ${a}×${t} = ${vStr}`,
              why: '单位 m/s',
              formula: `${vStr} m/s`,
              highlightNodeIds: ['v0', 'a', 't'],
            },
          ],
          answer: `${vStr} m/s`,
        }
      }
    }
  }

  if (allow('phys_work')) {
    const work = raw.match(
      /(\d+(?:\.\d+)?)\s*N[\s\S]*?(\d+(?:\.\d+)?)\s*m|(\d+(?:\.\d+)?)\s*m[\s\S]*?(\d+(?:\.\d+)?)\s*N/,
    )
    if (work && /功|推动|做功/.test(raw)) {
      let F
      let s
      if (work[1] && work[2]) {
        F = Number(work[1])
        s = Number(work[2])
      } else {
        s = Number(work[3])
        F = Number(work[4])
      }
      const W = F * s
      const wStr = Number.isInteger(W) ? String(W) : W.toFixed(2).replace(/\.?0+$/, '')
      return {
        version: V,
        problemType: 'phys_work',
        topic: 'phys_energy',
        goal: raw,
        coreIdea: '同向恒力：W = Fs',
        rootId: 'root',
        nodes: [
          {
            id: 'root',
            label: 'W = Fs',
            kind: 'choice',
            children: ['F', 's', 'W'],
            why: '同向直接乘',
          },
          { id: 'F', label: `F = ${F} N`, kind: 'outcome', children: [], why: '力' },
          { id: 's', label: `s = ${s} m`, kind: 'outcome', children: [], why: '位移' },
          { id: 'W', label: `W = ${wStr} J`, kind: 'outcome', children: [], why: '功' },
        ],
        steps: [
          {
            index: 1,
            title: '公式',
            content: 'W = Fs',
            why: '有夹角用 cosθ',
            formula: 'W=Fs',
            highlightNodeIds: ['root'],
          },
          {
            index: 2,
            title: '代入',
            content: `W = ${F} × ${s} = ${wStr} J`,
            why: 'N·m = J',
            formula: `${wStr} J`,
            highlightNodeIds: ['F', 's', 'W'],
          },
        ],
        answer: `${wStr} J`,
      }
    }
  }

  if (allow('phys_weight')) {
    const w = raw.match(/质量\s*(\d+(?:\.\d+)?)\s*kg[\s\S]*?g\s*=\s*(\d+(?:\.\d+)?)|质量\s*(\d+(?:\.\d+)?)\s*kg[\s\S]*?重力/)
    if (w || (/重力/.test(raw) && /kg/.test(raw))) {
      const m = Number(w?.[1] || w?.[3] || raw.match(/(\d+(?:\.\d+)?)\s*kg/)?.[1])
      const g = Number(w?.[2] || raw.match(/g\s*=\s*(\d+(?:\.\d+)?)/)?.[1] || 10)
      if (m > 0 && g > 0) {
        const G = m * g
        return {
          version: V,
          problemType: 'phys_weight',
          topic: 'phys_force',
          goal: raw,
          coreIdea: 'G = mg',
          rootId: 'root',
          nodes: [
            { id: 'root', label: 'G = mg', kind: 'choice', children: ['m', 'g', 'G'], why: '重力' },
            { id: 'm', label: `m = ${fmt(m)} kg`, kind: 'outcome', children: [], why: '质量' },
            { id: 'g', label: `g = ${fmt(g)}`, kind: 'outcome', children: [], why: '重力加速度' },
            { id: 'G', label: `G = ${fmt(G)} N`, kind: 'outcome', children: [], why: '重力' },
          ],
          steps: [
            { index: 1, title: '公式', content: 'G = mg', why: '质量≠重力', formula: 'G=mg', highlightNodeIds: ['root'] },
            { index: 2, title: '代入', content: `G = ${fmt(m)} × ${fmt(g)} = ${fmt(G)} N`, why: '方向竖直向下', formula: `${fmt(G)} N`, highlightNodeIds: ['m', 'g', 'G'] },
          ],
          answer: `${fmt(G)} N`,
        }
      }
    }
  }

  if (allow('phys_find_F')) {
    const ff = raw.match(
      /质量\s*(\d+(?:\.\d+)?)\s*kg[\s\S]*?加速[度]?\s*(\d+(?:\.\d+)?)|加速[度]?\s*(\d+(?:\.\d+)?)[\s\S]*?质量\s*(\d+(?:\.\d+)?)\s*kg/,
    )
    if (ff && /合力|求力|所需|F\s*=/.test(raw) && !/N/.test(raw)) {
      let m
      let a
      if (ff[1] && ff[2]) {
        m = Number(ff[1])
        a = Number(ff[2])
      } else {
        a = Number(ff[3])
        m = Number(ff[4])
      }
      if (m > 0 && a >= 0) {
        const F = m * a
        return {
          version: V,
          problemType: 'phys_find_F',
          topic: 'phys_force',
          goal: raw,
          coreIdea: 'F = ma',
          rootId: 'root',
          nodes: [
            { id: 'root', label: 'F = ma', kind: 'choice', children: ['m', 'a', 'F'], why: '牛顿第二定律' },
            { id: 'm', label: `m = ${fmt(m)} kg`, kind: 'outcome', children: [], why: '质量' },
            { id: 'a', label: `a = ${fmt(a)} m/s²`, kind: 'outcome', children: [], why: '加速度' },
            { id: 'F', label: `F = ${fmt(F)} N`, kind: 'outcome', children: [], why: '合力' },
          ],
          steps: [
            { index: 1, title: '公式', content: 'F = ma', why: '与 a=F/m 同一式', formula: 'F=ma', highlightNodeIds: ['root'] },
            { index: 2, title: '代入', content: `F = ${fmt(m)} × ${fmt(a)} = ${fmt(F)} N`, why: '方向与 a 同向', formula: `${fmt(F)} N`, highlightNodeIds: ['m', 'a', 'F'] },
          ],
          answer: `${fmt(F)} N`,
        }
      }
    }
  }

  if (allow('phys_ke')) {
    const ke = raw.match(
      /质量\s*(\d+(?:\.\d+)?)\s*kg[\s\S]*?速度[为]?\s*(\d+(?:\.\d+)?)|速度[为]?\s*(\d+(?:\.\d+)?)[\s\S]*?质量\s*(\d+(?:\.\d+)?)\s*kg/,
    )
    if (ke && /动能/.test(raw)) {
      let m
      let v
      if (ke[1] && ke[2]) {
        m = Number(ke[1])
        v = Number(ke[2])
      } else {
        v = Number(ke[3])
        m = Number(ke[4])
      }
      if (m > 0 && v >= 0) {
        const Ek = 0.5 * m * v * v
        return {
          version: V,
          problemType: 'phys_ke',
          topic: 'phys_energy',
          goal: raw,
          coreIdea: 'Ek = ½mv²',
          rootId: 'root',
          nodes: [
            { id: 'root', label: 'Ek = ½mv²', kind: 'choice', children: ['m', 'v', 'Ek'], why: '动能' },
            { id: 'm', label: `m = ${fmt(m)} kg`, kind: 'outcome', children: [], why: '质量' },
            { id: 'v', label: `v = ${fmt(v)} m/s`, kind: 'outcome', children: [], why: '速率' },
            { id: 'Ek', label: `Ek = ${fmt(Ek)} J`, kind: 'outcome', children: [], why: '动能' },
          ],
          steps: [
            { index: 1, title: '公式', content: 'Ek = ½mv²', why: '别漏 ½ 和平方', formula: 'Ek=½mv²', highlightNodeIds: ['root'] },
            { index: 2, title: '代入', content: `Ek = ½×${fmt(m)}×${fmt(v)}² = ${fmt(Ek)} J`, why: '标量', formula: `${fmt(Ek)} J`, highlightNodeIds: ['m', 'v', 'Ek'] },
          ],
          answer: `${fmt(Ek)} J`,
        }
      }
    }
  }

  if (allow('phys_pe')) {
    const pe = raw.match(
      /质量\s*(\d+(?:\.\d+)?)\s*kg[\s\S]*?(?:升高|高度|h)\s*(\d+(?:\.\d+)?)|质量\s*(\d+(?:\.\d+)?)\s*kg[\s\S]*?(\d+(?:\.\d+)?)\s*m[\s\S]*?(?:势能|重力势)/,
    )
    if (pe || (/势能|重力势/.test(raw) && /kg/.test(raw) && /m/.test(raw))) {
      const m = Number(pe?.[1] || pe?.[3] || raw.match(/(\d+(?:\.\d+)?)\s*kg/)?.[1])
      const h = Number(
        pe?.[2] ||
          pe?.[4] ||
          raw.match(/(?:升高|高度|h)\s*(\d+(?:\.\d+)?)/)?.[1] ||
          raw.match(/(\d+(?:\.\d+)?)\s*m/)?.[1],
      )
      const g = Number(raw.match(/g\s*=\s*(\d+(?:\.\d+)?)/)?.[1] || 10)
      if (m > 0 && h >= 0) {
        const Ep = m * g * h
        return {
          version: V,
          problemType: 'phys_pe',
          topic: 'phys_energy',
          goal: raw,
          coreIdea: 'Ep = mgh',
          rootId: 'root',
          nodes: [
            { id: 'root', label: 'Ep = mgh', kind: 'choice', children: ['m', 'g', 'h'], why: '重力势能' },
            { id: 'm', label: `m = ${fmt(m)} kg`, kind: 'outcome', children: [], why: '质量' },
            { id: 'g', label: `g = ${fmt(g)}`, kind: 'outcome', children: [], why: '重力加速度' },
            { id: 'h', label: `h = ${fmt(h)} m`, kind: 'outcome', children: [], why: '高度' },
          ],
          steps: [
            { index: 1, title: '公式', content: 'Ep = mgh', why: 'h 相对零势能面', formula: 'Ep=mgh', highlightNodeIds: ['root'] },
            { index: 2, title: '代入', content: `Ep = ${fmt(m)} × ${fmt(g)} × ${fmt(h)} = ${fmt(Ep)} J`, why: '升高则增加', formula: `${fmt(Ep)} J`, highlightNodeIds: ['m', 'g', 'h'] },
          ],
          answer: `${fmt(Ep)} J`,
        }
      }
    }
  }

  // 2019全国Ⅱ：正方形有界磁场，ab 中点发射电子，求 a、d 射出速度
  if (
    allow('phys_lorentz') &&
    /正方形/.test(raw) &&
    /磁场/.test(raw) &&
    /中点/.test(raw) &&
    /(射出|飞出)/.test(raw) &&
    /(比荷|电子)/.test(raw)
  ) {
    return {
      version: V,
      problemType: 'phys_lorentz',
      topic: 'phys_bfield',
      goal: raw,
      coreIdea:
        '有界正方形磁场中电子做匀速圆周；用弦长定半径，再由 r = v/(kB) 求速度。',
      rootId: 'root',
      nodes: [
        {
          id: 'root',
          label: 'r = v/(kB)',
          kind: 'choice',
          children: ['track_a', 'track_d', 'va', 'vd'],
          why: '比荷 k = e/m，故 r = mv/(eB) = v/(kB)',
        },
        {
          id: 'track_a',
          label: '从 a 出：Ra = l/4',
          kind: 'outcome',
          children: [],
          why: 'O 为 ab 中点，弦 Oa = l/2 = 2Ra',
        },
        {
          id: 'track_d',
          label: '从 d 出：Rd = 5l/4',
          kind: 'outcome',
          children: [],
          why: '几何：R² = (R − l/2)² + l² → R = 5l/4',
        },
        {
          id: 'va',
          label: 'va = kBl/4',
          kind: 'outcome',
          children: [],
          why: 'va = kB · Ra',
        },
        {
          id: 'vd',
          label: 'vd = 5kBl/4',
          kind: 'outcome',
          children: [],
          why: 'vd = kB · Rd',
        },
      ],
      steps: [
        {
          index: 1,
          title: '定模型',
          content: '电子垂直 B 入射 → 洛伦兹力提供向心力 → 匀速圆周，r = v/(kB)。',
          why: '电子带负电，左手定则四指反向',
          highlightNodeIds: ['root'],
        },
        {
          index: 2,
          title: '从 a 射出',
          content: 'O 为 ab 中点，垂直 ab 射入。从 a 射出时弦 Oa = l/2，故直径为 l/2，Ra = l/4。',
          why: '圆心在过 O 且垂直初速度的直线上',
          formula: 'Ra=l/4',
          highlightNodeIds: ['track_a'],
        },
        {
          index: 3,
          title: '从 d 射出',
          content: '从 d 射出：R² = (R − l/2)² + l²，解得 Rd = 5l/4。',
          why: '轨迹圆心仍在 ab 延长相关几何上',
          formula: 'Rd=5l/4',
          highlightNodeIds: ['track_d'],
        },
        {
          index: 4,
          title: '求速度',
          content: 'v = kBr → va = kBl/4，vd = 5kBl/4。',
          why: '半径越大，射出所需速率越大',
          formula: 'kBl/4，5kBl/4',
          highlightNodeIds: ['va', 'vd'],
        },
      ],
      answer: 'kBl/4，5kBl/4',
    }
  }

  // 方法样例：只认样例题干，勿把高考真题整题替换成试样例
  if (
    allow('phys_faraday') &&
    /0\.01\s*Wb/.test(raw) &&
    /0\.05\s*Wb/.test(raw) &&
    /0\.2\s*s/.test(raw)
  ) {
    return structuredClone({ ...EX_PHYS_FARADAY, goal: raw })
  }
  if (allow('phys_ohm') && /6\s*Ω/.test(raw) && /2\s*A/.test(raw)) {
    return structuredClone({ ...EX_PHYS_OHM, goal: raw })
  }
  if (
    allow('phys_efield_def') &&
    /2\s*[×xX\*]\s*10\s*[⁻\-]?\s*6|2×10⁻⁶/.test(raw) &&
    /4\s*[×xX\*]\s*10/.test(raw)
  ) {
    return structuredClone({ ...EX_PHYS_EFIELD, goal: raw })
  }
  if (
    allow('phys_lorentz') &&
    /垂直进入/.test(raw) &&
    /磁场/.test(raw) &&
    /(说明|做什么运动|指出方法)/.test(raw) &&
    !/正方形|边长|射出|比荷/.test(raw)
  ) {
    return structuredClone({ ...EX_PHYS_LORENTZ, goal: raw })
  }
  if (allow('phys_kinematic') && /初速为 0|初速为0/.test(raw) && /2/.test(raw) && /3/.test(raw) && !/位移|路程/.test(raw)) {
    return structuredClone(EX_PHYS_KINEMATIC)
  }
  if (allow('phys_newton') && /2 kg|2kg/.test(raw) && /10/.test(raw) && /加速/.test(raw)) {
    return structuredClone(EX_PHYS_NEWTON)
  }
  if (allow('phys_work') && /20 N|20N/.test(raw) && /3 m|3m/.test(raw)) {
    return structuredClone(EX_PHYS_WORK)
  }
  if (allow('phys_displacement') && /位移/.test(raw) && /4/.test(raw) && /2/.test(raw)) {
    return structuredClone(EX_PHYS_DISPLACEMENT)
  }
  if (allow('phys_v2as') && /位移 8|位移8/.test(raw)) {
    return structuredClone(EX_PHYS_V2AS)
  }
  if (allow('phys_weight') && /5 kg|5kg/.test(raw) && /重力/.test(raw)) {
    return structuredClone(EX_PHYS_WEIGHT)
  }
  if (allow('phys_find_F') && /3 kg|3kg/.test(raw) && /2/.test(raw) && /合力|求力/.test(raw)) {
    return structuredClone(EX_PHYS_FIND_F)
  }
  if (allow('phys_ke') && /动能/.test(raw) && /2 kg|2kg/.test(raw) && /3/.test(raw)) {
    return structuredClone(EX_PHYS_KE)
  }
  if (allow('phys_pe') && /势能|重力势/.test(raw) && /2 kg|2kg/.test(raw) && /5/.test(raw)) {
    return structuredClone(EX_PHYS_PE)
  }
  return null
}
