// 高中物理高考知识点体系（按考纲分类，标注考频，配原创例题）
// 考频：★★★★★ 年年必考 / ★★★★ 高频 / ★★★ 中频 / ★★ 低频 / ★ 偶尔
// 例题均为原创设计，紧扣高考考点，非真题原文

export const PHYSICS_CATEGORIES = [
  { id: 'mechanics', name: '力学', weight: '35%-40%', color: '#E8551F', desc: '高考分值最大板块，选择题+计算题主力' },
  { id: 'electromagnetism', name: '电磁学', weight: '27%-35%', color: '#2563EB', desc: '高分关键，压轴题常出磁场+电磁感应综合' },
  { id: 'thermo', name: '热学', weight: '8%-12%', color: '#059669', desc: '选择题为主，理想气体状态方程必考' },
  { id: 'optics', name: '光学', weight: '6%-10%', color: '#7C3AED', desc: '几何光学+波动光学，难度适中' },
  { id: 'atomic', name: '原子物理', weight: '4%-8%', color: '#DC2626', desc: '记忆性为主，光电效应与核反应常考' },
  { id: 'experiment', name: '实验', weight: '16%-20%', color: '#EA580C', desc: '一力一电两道实验，必拿分项' },
]

export const PHYSICS_KNOWLEDGE = [
  // ==================== 力学 ====================
  {
    id: 'uniform-accel', name: '匀变速直线运动', category: 'mechanics',
    frequency: 5, type: 'knowledge',
    description: '速度、位移、加速度三者关系，v-t 图像与 x-t 图像分析',
    examTips: '高考常考图像分析、追及相遇问题；注意加速度的矢量性，刹车问题要先判断停车时间',
    formula: 'v = v₀ + at\nx = v₀t + ½at²\nv² - v₀² = 2ax',
    example: {
      question: '一辆汽车以 20 m/s 的速度在平直公路上行驶，司机发现前方障碍物后立即刹车，加速度大小为 4 m/s²。求汽车刹车后 6 s 内的位移。',
      solution: '刹车停车时间 t₀ = v₀/a = 20/4 = 5 s < 6 s，说明 5 s 后汽车已停止。\n位移 x = v₀²/(2a) = 20²/(2×4) = 50 m。\n易错点：直接用 x = v₀t - ½at² 代入 t=6s 会得到 x = 20×6 - ½×4×36 = 48 m（错误），因为 5s 后车已停。',
      answer: '50 m'
    }
  },
  {
    id: 'force-analysis', name: '受力分析与共点力平衡', category: 'mechanics',
    frequency: 5, type: 'knowledge',
    description: '重力、弹力、摩擦力分析，正交分解法，整体法与隔离法',
    examTips: '摩擦力方向判断是重点；动摩擦因数只与材料和粗糙程度有关，与正压力无关',
    formula: 'F = μN（滑动摩擦力）\n0 ≤ f静 ≤ fmax',
    example: {
      question: '质量为 m 的物块放在倾角为 θ 的斜面上恰好匀速下滑，求物块与斜面间的动摩擦因数。',
      solution: '匀速下滑 → 合力为零。沿斜面方向：mgsinθ = μmgcosθ\n解得 μ = tanθ。\n这是斜面模型的重要结论：恰好匀速下滑时 μ = tanθ。',
      answer: 'μ = tanθ'
    }
  },
  {
    id: 'newton-laws', name: '牛顿运动定律', category: 'mechanics',
    frequency: 5, type: 'knowledge',
    description: '牛顿三定律，超重失重，连接体与传送带问题',
    examTips: '连接体问题优先整体法求加速度，再隔离法求内力；传送带问题分"加速→共速→匀速"三阶段',
    formula: 'F合 = ma',
    example: {
      question: '光滑水平面上，质量分别为 m₁ 和 m₂ 的两物块用轻绳连接，在水平拉力 F 作用下一起加速运动，求绳中张力。',
      solution: '整体法：a = F/(m₁+m₂)\n隔离 m₂（假设 F 拉 m₁）：T = m₂a = m₂F/(m₁+m₂)\n若 F 拉 m₂：T = m₁F/(m₁+m₂)\n结论：张力与被拉物体的"另一侧"质量成正比。',
      answer: 'T = m₂F/(m₁+m₂)（F拉m₁时）'
    }
  },
  {
    id: 'curvilinear-motion', name: '曲线运动（平抛·圆周）', category: 'mechanics',
    frequency: 4, type: 'knowledge',
    description: '平抛运动分解，匀速圆周运动向心力，竖直面内圆周运动临界条件',
    examTips: '平抛水平匀速、竖直自由落体，分运动等时性；竖直面圆周最高点临界：绳模型 v≥√(gr)，杆模型 v≥0',
    formula: '平抛：x = v₀t, y = ½gt²\n圆周：F向 = mv²/r = mω²r',
    example: {
      question: '从高度 h 处以水平速度 v₀ 抛出一物体，求落地时速度的大小和方向（不计空气阻力）。',
      solution: '竖直方向：vy² = 2gh → vy = √(2gh)\n合速度：v = √(v₀² + vy²) = √(v₀² + 2gh)\n方向：tanθ = vy/v₀ = √(2gh)/v₀\n落地时间由 h 决定：t = √(2h/g)，与 v₀ 无关。',
      answer: 'v = √(v₀² + 2gh)，与水平方向夹角 θ = arctan(√(2gh)/v₀)'
    }
  },
  {
    id: 'gravitation', name: '万有引力与航天', category: 'mechanics',
    frequency: 4, type: 'knowledge',
    description: '开普勒定律，万有引力提供向心力，卫星变轨，双星系统',
    examTips: '记住黄金代换 GM = gR²；近地卫星 v = √(gR) ≈ 7.9 km/s；同步卫星周期 24h',
    formula: 'F = GMm/r²\nGMm/r² = mv²/r = mω²r = m(4π²/T²)r',
    example: {
      question: '已知地球半径 R，地球表面重力加速度 g，求地球的第一宇宙速度和近地卫星的周期。',
      solution: '第一宇宙速度：mg = mv²/R → v = √(gR)\n近地卫星周期：T = 2πR/v = 2π√(R/g)\n代入 R≈6.4×10⁶ m, g≈9.8 m/s²，得 v≈7.9 km/s，T≈84 min。',
      answer: 'v = √(gR) ≈ 7.9 km/s，T = 2π√(R/g) ≈ 84 min'
    }
  },
  {
    id: 'work-energy', name: '功和能（动能定理·机械能守恒）', category: 'mechanics',
    frequency: 5, type: 'knowledge',
    description: '功和功率，动能定理，机械能守恒定律',
    examTips: '动能定理适用于单物体多过程，比牛顿定律更简洁；机械能守恒条件：只有重力或弹力做功',
    formula: 'W = Fscosθ\nW合 = ΔEk = ½mv² - ½mv₀²\nEk + Ep = 恒量（守恒时）',
    example: {
      question: '质量为 m 的物块从光滑曲面顶端由静止滑下，曲面高 h，到底端时速度多大？若曲面不光滑，到底端速度为 √(gh)，求摩擦力做的功。',
      solution: '光滑时机械能守恒：mgh = ½mv² → v = √(2gh)\n不光滑时用动能定理：mgh + Wf = ½m(√gh)² - 0\nWf = ½mgh - mgh = -½mgh\n负号表示摩擦力做负功。',
      answer: '光滑时 v = √(2gh)；Wf = -½mgh'
    }
  },
  {
    id: 'momentum', name: '动量与碰撞', category: 'mechanics',
    frequency: 5, type: 'knowledge',
    description: '动量定理，动量守恒定律，弹性碰撞与非弹性碰撞',
    examTips: '动量守恒条件：系统所受合外力为零（或某一方向合外力为零）；碰撞问题同时考虑动量守恒和能量关系',
    formula: 'p = mv\nFt = Δp（动量定理）\nm₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'（动量守恒）',
    example: {
      question: '质量为 m₁ 的小球以速度 v₀ 与静止的质量为 m₂ 的小球发生弹性正碰，求碰后两球的速度。',
      solution: '动量守恒：m₁v₀ = m₁v₁ + m₂v₂\n动能守恒：½m₁v₀² = ½m₁v₁² + ½m₂v₂²\n联立解得：\nv₁ = (m₁-m₂)v₀/(m₁+m₂)\nv₂ = 2m₁v₀/(m₁+m₂)\n特殊情况：m₁=m₂ 时交换速度。',
      answer: 'v₁=(m₁-m₂)v₀/(m₁+m₂)，v₂=2m₁v₀/(m₁+m₂)'
    }
  },
  {
    id: 'wave-mech', name: '机械振动与机械波', category: 'mechanics',
    frequency: 3, type: 'knowledge',
    description: '简谐运动，单摆周期，波的传播与干涉',
    examTips: '单摆周期 T = 2π√(L/g) 与摆球质量无关；振动图像看单质点随时间变化，波动图像看某一时刻各质点位置',
    formula: '单摆：T = 2π√(L/g)\n波速：v = λf = λ/T',
    example: {
      question: '某单摆的摆长为 1 m，在地球上的周期约为多少？若将其移到月球上（g月 = g地/6），周期变为多少？',
      solution: '地球：T = 2π√(L/g) = 2π√(1/9.8) ≈ 2.0 s\n月球：T\' = 2π√(L/(g/6)) = 2π√(6L/g) = √6 × T ≈ 4.9 s\n周期与重力加速度的平方根成反比。',
      answer: '地球约 2.0 s，月球约 4.9 s'
    }
  },

  // ==================== 电磁学 ====================
  {
    id: 'electric-field', name: '静电场', category: 'electromagnetism',
    frequency: 5, type: 'knowledge',
    description: '电场强度与电势，电容器，带电粒子在电场中的运动',
    examTips: '电场抓"力"和"能"两条线；电容器动态分析：与电源相连 U 不变，断开 Q 不变',
    formula: 'E = F/q\nU = Ed（匀强电场）\nC = Q/U = εS/(4πkd)',
    example: {
      question: '平行板电容器与电源保持相连，若将极板间距增大一倍，电容器的电容、电荷量、板间电场强度如何变化？',
      solution: '与电源相连 → U 不变\nC = εS/(4πkd)，d 增大一倍 → C 减半\nQ = CU → Q 减半\nE = U/d，d 增大一倍 → E 减半\n结论：U 不变时，增大板距使 C、Q、E 均减小。',
      answer: 'C减半，Q减半，E减半'
    }
  },
  {
    id: 'circuit', name: '恒定电流', category: 'electromagnetism',
    frequency: 4, type: 'knowledge',
    description: '欧姆定律，串并联电路，电功率，闭合电路欧姆定律',
    examTips: '动态分析用"局部→整体→局部"思路；电源输出功率最大时外阻等于内阻',
    formula: 'I = U/R\nP = UI = I²R = U²/R\nE = U外 + Ir（闭合电路）',
    example: {
      question: '电动势为 E、内阻为 r 的电源接一可变电阻 R，求 R 为何值时电源输出功率最大，最大值是多少？',
      solution: '输出功率 P = I²R = (E/(R+r))²R\n令 dP/dR = 0，得 R = r\n此时 Pmax = E²/(4r)\n这是电源输出功率最大的条件：外阻等于内阻。',
      answer: 'R = r 时，Pmax = E²/(4r)'
    }
  },
  {
    id: 'magnetic-field', name: '磁场', category: 'electromagnetism',
    frequency: 5, type: 'knowledge',
    description: '安培力，洛伦兹力，带电粒子在磁场中的圆周运动',
    examTips: '左手定则判安培力/洛伦兹力方向；带电粒子圆周运动：定圆心、求半径、画轨迹三步法',
    formula: 'F安 = BIL\nF洛 = qvB\nr = mv/(qB), T = 2πm/(qB)',
    example: {
      question: '带电粒子以速度 v 垂直射入磁感应强度为 B 的匀强磁场中做圆周运动，求轨道半径和周期。若粒子带正电，速度方向水平向右，磁场方向垂直纸面向里，圆心在粒子的哪个方向？',
      solution: '洛伦兹力提供向心力：qvB = mv²/r → r = mv/(qB)\n周期：T = 2πr/v = 2πm/(qB)，与速度无关\n正电荷向右运动，磁场向里，左手定则：洛伦兹力方向向上，所以圆心在粒子的正上方。',
      answer: 'r = mv/(qB)，T = 2πm/(qB)，圆心在粒子正上方'
    }
  },
  {
    id: 'induction', name: '电磁感应', category: 'electromagnetism',
    frequency: 5, type: 'knowledge',
    description: '法拉第电磁感应定律，楞次定律，棒轨模型，自感',
    examTips: '动生 E=BLv，感生 E=nΔΦ/Δt；楞次定律"增反减同"；棒轨模型注意能量转化：克服安培力做功=焦耳热',
    formula: 'E = nΔΦ/Δt\nE = BLv（动生）\nQ = W克安（能量守恒）',
    example: {
      question: '一根长为 L 的导体棒在磁感应强度为 B 的匀强磁场中以速度 v 垂直切割磁感线，棒两端的电动势是多少？若棒的电阻为 R，求感应电流和安培力。',
      solution: '动生电动势：E = BLv\n感应电流：I = E/R = BLv/R\n安培力：F = BIL = B²L²v/R，方向与运动方向相反（阻碍运动）\n外力需 F外 = B²L²v/R 才能维持匀速，外力做功全部转化为焦耳热。',
      answer: 'E = BLv，I = BLv/R，F安 = B²L²v/R'
    }
  },
  {
    id: 'alternating-current', name: '交变电流', category: 'electromagnetism',
    frequency: 3, type: 'knowledge',
    description: '交变电流的产生与描述，变压器，远距离输电',
    examTips: '理想变压器：U₁/U₂ = n₁/n₂，I₁/I₂ = n₂/n₁（仅一个副线圈时）；远距离输电减小电流可降低线损',
    formula: 'e = Emsinωt\nU有效 = Em/√2\nU₁/U₂ = n₁/n₂',
    example: {
      question: '理想变压器原线圈匝数 n₁=1100 匝，接在 220 V 交流电源上，副线圈接"220V 100W"的灯泡且正常发光，求副线圈匝数和原线圈中的电流。',
      solution: 'U₂ = 220 V，由 U₁/U₂ = n₁/n₂ → n₂ = n₁U₂/U₁ = 1100×220/220 = 1100 匝\n副线圈电流：I₂ = P/U₂ = 100/220 = 5/11 A\n理想变压器输入功率=输出功率：I₁U₁ = P → I₁ = 100/220 = 5/11 A\n或用 I₁/I₂ = n₂/n₁ = 1，得 I₁ = I₂。',
      answer: 'n₂ = 1100 匝，I₁ = 5/11 A ≈ 0.45 A'
    }
  },

  // ==================== 热学 ====================
  {
    id: 'molecular-kinetic', name: '分子动理论', category: 'thermo',
    frequency: 2, type: 'knowledge',
    description: '分子热运动，分子间作用力，内能',
    examTips: '温度是分子平均动能的标志；内能由温度、体积、物质的量共同决定；布朗运动是颗粒运动，反映分子运动',
    formula: 'PV = nRT（理想气体状态方程）',
    example: {
      question: '关于布朗运动，下列说法正确的是：\nA. 布朗运动就是分子的热运动\nB. 布朗运动是颗粒分子的运动\nC. 布朗运动是液体分子无规则运动的反映\nD. 液体温度越高，布朗运动越明显',
      solution: 'A 错：布朗运动是悬浮颗粒的运动，不是分子运动。\nB 错：是颗粒整体的运动，不是颗粒分子。\nC 对：颗粒被液体分子撞击而运动，反映液体分子的无规则运动。\nD 对：温度越高，分子运动越剧烈，撞击越频繁且不均匀，布朗运动越明显。',
      answer: 'C、D'
    }
  },
  {
    id: 'gas-law', name: '理想气体状态方程', category: 'thermo',
    frequency: 4, type: 'knowledge',
    description: '玻意耳定律、盖-吕萨克定律、查理定律，理想气体状态方程',
    examTips: '理想气体内能只与温度有关；气体实验定律注意等压/等容/等温条件；热力学温度 T = t + 273',
    formula: 'PV/T = C（一定质量理想气体）\n玻意耳：P₁V₁ = P₂V₂（等温）\n盖-吕萨克：V₁/T₁ = V₂/T₂（等压）\n查理：P₁/T₁ = P₂/T₂（等容）',
    example: {
      question: '一定质量的理想气体，初始状态压强 P₁=1 atm，体积 V₁=1 L，温度 T₁=300 K。先等温膨胀至体积 2 L，再等容升温至压强 2 atm，求最终温度。',
      solution: '第一步等温：P₁V₁ = P₂V₂ → 1×1 = P₂×2 → P₂ = 0.5 atm\n第二步等容：P₂/T₂ = P₃/T₃\nT₂ = T₁ = 300 K（等温），P₃ = 2 atm\nT₃ = P₃T₂/P₂ = 2×300/0.5 = 1200 K\n或直接用状态方程：P₁V₁/T₁ = P₃V₃/T₃\n1×1/300 = 2×2/T₃ → T₃ = 1200 K。',
      answer: '1200 K'
    }
  },
  {
    id: 'thermodynamics', name: '热力学定律', category: 'thermo',
    frequency: 3, type: 'knowledge',
    description: '热力学第一定律（能量守恒），热力学第二定律（方向性）',
    examTips: 'ΔU = Q + W，注意符号规则：外界对气体做功 W>0，气体吸热 Q>0，内能增加 ΔU>0；气体膨胀对外做功 W<0',
    formula: 'ΔU = Q + W（热力学第一定律）',
    example: {
      question: '一定质量的理想气体经历等温膨胀过程，气体对外做功 100 J，求气体吸收的热量和内能变化。',
      solution: '理想气体等温 → 内能不变 ΔU = 0\n气体对外做功 → W = -100 J（外界对气体做功为负）\n由 ΔU = Q + W：0 = Q + (-100) → Q = 100 J\n气体吸收 100 J 热量，全部用来对外做功，内能不变。',
      answer: 'Q = 100 J（吸热），ΔU = 0'
    }
  },

  // ==================== 光学 ====================
  {
    id: 'geometric-optics', name: '几何光学（折射·全反射）', category: 'optics',
    frequency: 3, type: 'knowledge',
    description: '光的折射定律，折射率，全反射',
    examTips: 'n = c/v = sinθ₁/sinθ₂；全反射条件：光从光密→光疏，入射角≥临界角；临界角 sinC = 1/n',
    formula: 'n = sinθ₁/sinθ₂ = c/v\nsinC = 1/n（临界角）',
    example: {
      question: '某透明介质的折射率为 √2，光从该介质射向空气，求临界角。若入射角为 30°，能否发生全反射？',
      solution: '临界角：sinC = 1/n = 1/√2 → C = 45°\n入射角 30° < 45°，不满足全反射条件，会发生折射（同时有反射）。\n只有入射角 ≥ 45° 时才发生全反射。',
      answer: '临界角 45°，入射角 30° 时不发生全反射'
    }
  },
  {
    id: 'wave-optics', name: '光的波动性（干涉·衍射）', category: 'optics',
    frequency: 3, type: 'knowledge',
    description: '光的干涉（双缝干涉、薄膜干涉），光的衍射，电磁波谱',
    examTips: '双缝干涉条纹间距 Δx = λL/d；明暗条纹条件：路程差 = kλ（明）或 (2k+1)λ/2（暗）',
    formula: 'Δx = λL/d（双缝干涉条纹间距）',
    example: {
      question: '双缝干涉实验中，双缝间距 d=0.2 mm，缝到屏距离 L=1 m，用波长 λ=600 nm 的红光照射，求相邻明条纹间距。',
      solution: 'Δx = λL/d = 600×10⁻⁹ × 1 / (0.2×10⁻³) = 3×10⁻³ m = 3 mm\n若改用绿光（λ=530 nm），条纹间距变小：Δx = 530×10⁻⁹×1/(0.2×10⁻³) ≈ 2.65 mm。',
      answer: '3 mm'
    }
  },

  // ==================== 原子物理 ====================
  {
    id: 'photoelectric', name: '光电效应', category: 'atomic',
    frequency: 3, type: 'knowledge',
    description: '光电效应规律，爱因斯坦光电效应方程，遏止电压',
    examTips: '光电效应瞬时发生；存在截止频率（极限频率）；光电子最大初动能随频率增大而增大，与光强无关；光强只影响光电流大小',
    formula: 'Ekm = hν - W₀（光电效应方程）\neUc = Ekm（遏止电压）',
    example: {
      question: '某金属的逸出功为 W₀，用频率为 ν 的光照射（ν > 截止频率），求光电子的最大初动能和遏止电压。',
      solution: '光电效应方程：Ekm = hν - W₀\n遏止电压：eUc = Ekm → Uc = (hν - W₀)/e\n若 ν 增大，Ekm 和 Uc 均增大；若增大光强（频率不变），Ekm 不变，但光电流增大。',
      answer: 'Ekm = hν - W₀，Uc = (hν - W₀)/e'
    }
  },
  {
    id: 'nuclear', name: '原子核', category: 'atomic',
    frequency: 3, type: 'knowledge',
    description: '原子核组成，核反应方程，半衰期，质能方程',
    examTips: '核反应方程遵守质量数守恒和电荷数守恒；α衰变放出 ⁴₂He，β衰变放出 ⁰₋₁e；半衰期只与元素种类有关，与物理化学状态无关',
    formula: 'E = mc²（质能方程）\nΔE = Δmc²（质量亏损释放能量）',
    example: {
      question: '铀核 ²³⁸₉₂U 经过一次 α 衰变和一次 β 衰变后变成什么核？写出核反应方程。',
      solution: 'α衰变：²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He\nβ衰变：²³⁴₉₀Th → ²³⁴₉₁Pa + ⁰₋₁e\n质量数：238-4=234，β衰变质量数不变\n电荷数：92-2=90，90+1=91\n最终核为 ²³⁴₉₁Pa（镤）。',
      answer: '²³⁴₉₁Pa'
    }
  },

  // ==================== 实验 ====================
  {
    id: 'exp-uniform-motion', name: '研究匀变速直线运动', category: 'experiment',
    frequency: 4, type: 'experiment',
    description: '利用打点计时器研究匀变速直线运动，求加速度',
    examTips: '用逐差法求加速度：a = (x₄+x₅+x₆ - x₁-x₂-x₃)/(9T²)；某点瞬时速度等于相邻两段平均速度',
    formula: 'a = (x_{n+3} - x_n)/(3T²)\nv_n = (x_n + x_{n+1})/(2T)',
    example: {
      question: '打点计时器所用电源频率为 50 Hz，某同学得到一条纸带，量得相邻计数点间距依次为 x₁=2.00 cm, x₂=2.50 cm, x₃=3.00 cm, x₄=3.50 cm（计数点间还有4个点未标出）。求加速度和打第2个计数点时的速度。',
      solution: 'T = 5×0.02 = 0.1 s\n逐差法：a = (x₃+x₄ - x₁-x₂)/(4T²) = (3.00+3.50-2.00-2.50)×10⁻²/(4×0.01) = 2.00×10⁻²/0.04 = 0.5 m/s²\nv₂ = (x₂+x₃)/(2T) = (2.50+3.00)×10⁻²/(2×0.1) = 0.275 m/s',
      answer: 'a = 0.5 m/s²，v₂ = 0.275 m/s'
    }
  },
  {
    id: 'exp-spring', name: '探究弹簧弹力与形变量的关系', category: 'experiment',
    frequency: 3, type: 'experiment',
    description: '探究胡克定律 F = kx，求劲度系数',
    examTips: 'F-x 图像斜率为劲度系数 k；注意区分弹簧原长、总长、形变量；图像不过原点可能是弹簧自重',
    formula: 'F = kx',
    example: {
      question: '某弹簧在不受力时长度为 10 cm，挂 2 N 重物时长度为 14 cm，求劲度系数。若要使弹簧长度为 20 cm，需挂多重的物体？',
      solution: 'x₁ = 14 - 10 = 4 cm = 0.04 m\nk = F₁/x₁ = 2/0.04 = 50 N/m\n要使长度 20 cm：x₂ = 20 - 10 = 10 cm = 0.1 m\nF₂ = kx₂ = 50×0.1 = 5 N\n需挂重力为 5 N 的物体（质量约 0.5 kg）。',
      answer: 'k = 50 N/m，需挂 5 N 重物'
    }
  },
  {
    id: 'exp-force-composition', name: '验证力的平行四边形定则', category: 'experiment',
    frequency: 3, type: 'experiment',
    description: '用等效法验证两个力合成遵循平行四边形定则',
    examTips: '两次拉橡皮筋必须到同一结点 O（保证效果相同）；弹簧测力计要与木板平行；读数时视线正对刻度',
    formula: 'F合 = √(F₁² + F₂² + 2F₁F₂cosθ)',
    example: {
      question: '在"验证力的平行四边形定则"实验中，两个弹簧测力计的拉力分别为 F₁=3 N（水平向右）和 F₂=4 N（竖直向上），求理论合力大小和方向。',
      solution: '两力垂直，F合 = √(3²+4²) = 5 N\n方向：与 F₁ 方向夹角 θ，tanθ = F₂/F₁ = 4/3 → θ = 53°\n实验中用一个弹簧测力计拉到同一结点，读数应接近 5 N，方向应接近与水平成 53°。',
      answer: 'F合 = 5 N，与水平方向成 53° 角'
    }
  },
  {
    id: 'exp-newton-second', name: '探究加速度与力、质量的关系', category: 'experiment',
    frequency: 4, type: 'experiment',
    description: '用控制变量法探究 a 与 F、m 的关系',
    examTips: '必须平衡摩擦力；小车质量 M 远大于砝码质量 m 时，拉力 F≈mg；a-F 图像过原点，a-1/M 图像为直线',
    formula: 'a = F/M',
    example: {
      question: '在探究加速度与力的关系时，某同学得到的 a-F 图像不过原点而在 F 轴有截距，可能是什么原因？若图像在 a 轴有截距呢？',
      solution: 'F 轴有截距（需要一定拉力才有加速度）：说明没有平衡摩擦力或平衡不足，摩擦力抵消了部分拉力。\na 轴有截距（F=0 时 a>0）：说明平衡摩擦力过度，小车在无拉力时已加速下滑。',
      answer: 'F轴截距：平衡摩擦力不足；a轴截距：平衡摩擦力过度'
    }
  },
  {
    id: 'exp-mechanical-energy', name: '验证机械能守恒定律', category: 'experiment',
    frequency: 4, type: 'experiment',
    description: '利用自由落体验证机械能守恒',
    examTips: '选第1、2点间距接近 2 mm 的纸带（保证初速度为零）；用 v_n = (h_{n+1}-h_{n-1})/(2T) 求速度；由于阻力存在，动能增加量略小于重力势能减少量',
    formula: 'mgh = ½mv²\nv_n = (h_{n+1} - h_{n-1})/(2T)',
    example: {
      question: '在验证机械能守恒实验中，打点计时器频率 50 Hz，某点到起点距离 h=19.6 mm，下一点距离 h\'=23.5 mm，求该点速度并验证机械能是否守恒（g=9.8 m/s²）。',
      solution: 'T = 0.02 s\nv = (h\'-h)/T = (23.5-19.6)×10⁻³/0.02 = 0.195 m/s\n½v² = 0.0190 m²/s²\ngh = 9.8×19.6×10⁻³ = 0.192 m²/s²\n二者近似相等（误差范围内），验证了机械能守恒。',
      answer: 'v ≈ 0.195 m/s，½v² 与 gh 在误差范围内相等'
    }
  },
  {
    id: 'exp-momentum', name: '验证动量守恒定律', category: 'experiment',
    frequency: 4, type: 'experiment',
    description: '用平抛或气垫导轨验证碰撞过程动量守恒',
    examTips: '平抛法：用水平位移代替速度（因为高度相同，t 相同，v∝x）；入射球质量必须大于被碰球质量；两球半径相同',
    formula: 'm₁v₁ = m₁v₁\' + m₂v₂\'\nv ∝ x（平抛法）',
    example: {
      question: '用平抛法验证动量守恒，入射球质量 m₁=0.2 kg，被碰球质量 m₂=0.1 kg，碰撞前入射球水平位移 x₁=20 cm，碰后入射球位移 x₁\'=10 cm，被碰球位移 x₂=15 cm，验证动量是否守恒。',
      solution: '因平抛高度相同，v∝x，用 mx 代替 mv：\n碰前：m₁x₁ = 0.2×20 = 4 kg·cm\n碰后：m₁x₁\' + m₂x₂ = 0.2×10 + 0.1×15 = 2 + 1.5 = 3.5 kg·cm\n碰前 ≠ 碰后，说明有误差（如碰撞不是正碰、有摩擦）。若在误差范围内相等则守恒。',
      answer: '计算得碰前 4，碰后 3.5，需看误差是否允许'
    }
  },
  {
    id: 'exp-resistivity', name: '测定金属丝的电阻率', category: 'experiment',
    frequency: 4, type: 'experiment',
    description: '用伏安法测电阻，再求电阻率 ρ = RS/L',
    examTips: '金属丝电阻较小，用电流表外接法；螺旋测微器读数要估读；测长度要测有效长度（接入电路的长度）',
    formula: 'R = U/I\nρ = RS/L = πd²R/(4L)',
    example: {
      question: '用伏安法测一段金属丝的电阻，电压表读数 U=2.4 V，电流表读数 I=0.5 A，金属丝直径 d=0.4 mm，长度 L=1.0 m，求电阻率。',
      solution: 'R = U/I = 2.4/0.5 = 4.8 Ω\nS = πd²/4 = π×(0.4×10⁻³)²/4 ≈ 1.257×10⁻⁷ m²\nρ = RS/L = 4.8×1.257×10⁻⁷/1.0 ≈ 6.0×10⁻⁷ Ω·m\n接近镍铬合金的电阻率（约 1.1×10⁻⁶ Ω·m），合理。',
      answer: 'ρ ≈ 6.0×10⁻⁷ Ω·m'
    }
  },
  {
    id: 'exp-emf-internal', name: '测定电源电动势和内阻', category: 'experiment',
    frequency: 5, type: 'experiment',
    description: '用伏安法测电源电动势 E 和内阻 r',
    examTips: 'U-I 图像纵轴截距为 E，斜率绝对值为 r；电流表外接（相对于电源）时测得的 r 偏小（包含电压表分流）；图像纵轴可以不从零开始',
    formula: 'E = U + Ir',
    example: {
      question: '测电源电动势和内阻实验中，得到两组数据：U₁=2.8 V, I₁=0.2 A；U₂=2.4 V, I₂=0.6 A。求 E 和 r。',
      solution: 'E = U₁ + I₁r = U₂ + I₂r\n2.8 + 0.2r = 2.4 + 0.6r\n0.4 = 0.4r → r = 1 Ω\nE = 2.8 + 0.2×1 = 3.0 V\n验证：E = 2.4 + 0.6×1 = 3.0 V ✓',
      answer: 'E = 3.0 V，r = 1 Ω'
    }
  },
  {
    id: 'exp-multimeter', name: '练习使用多用电表', category: 'experiment',
    frequency: 3, type: 'experiment',
    description: '多用电表测电压、电流、电阻，欧姆挡的使用',
    examTips: '欧姆挡每次换挡后都要重新欧姆调零；测量时手不能碰表笔金属部分；测电阻必须将电阻从电路中断开',
    formula: 'R = 读数 × 倍率',
    example: {
      question: '用多用电表欧姆挡测电阻，选择"×100"挡，调零后测量，指针指在 15 处，电阻值是多少？若指针偏角太大，应换用哪个倍率挡？',
      solution: 'R = 15 × 100 = 1500 Ω = 1.5 kΩ\n指针偏角太大说明电阻小，应换用更小倍率"×10"挡（使指针指在中间区域，读数更准确）。换挡后必须重新欧姆调零。',
      answer: 'R = 1.5 kΩ，换"×10"挡'
    }
  },
  {
    id: 'exp-refractive-index', name: '测定玻璃的折射率', category: 'experiment',
    frequency: 3, type: 'experiment',
    description: '用插针法测定玻璃的折射率',
    examTips: '入射角适当大些（减小误差）；大头针间距适当大些；用 n = sinθ₁/sinθ₂ 计算；玻璃砖两个界面要画准确',
    formula: 'n = sinθ₁/sinθ₂',
    example: {
      question: '用插针法测玻璃砖折射率，入射角 θ₁=45°，折射角 θ₂=30°，求折射率。若换用更大入射角，折射率是否变化？',
      solution: 'n = sin45°/sin30° = (√2/2)/(1/2) = √2 ≈ 1.414\n折射率是材料本身的性质，与入射角无关，换用更大入射角 n 仍为 √2。',
      answer: 'n = √2 ≈ 1.414，不随入射角变化'
    }
  },
  {
    id: 'exp-double-slit', name: '用双缝干涉测量光的波长', category: 'experiment',
    frequency: 3, type: 'experiment',
    description: '用双缝干涉条纹间距公式测量光的波长',
    examTips: '条纹间距 Δx 是相邻两条明（暗）纹的距离，测量 n 条间距除以 (n-1)；测量头读数注意螺旋测微器原理',
    formula: 'Δx = λL/d → λ = Δx·d/L',
    example: {
      question: '双缝间距 d=0.25 mm，缝到屏距离 L=80 cm，测得 6 条明纹总宽度为 7.5 mm，求该光的波长。',
      solution: 'Δx = 7.5/(6-1) = 1.5 mm = 1.5×10⁻³ m\nλ = Δx·d/L = 1.5×10⁻³ × 0.25×10⁻³ / 0.8 = 4.69×10⁻⁷ m = 469 nm\n在可见光范围内，对应蓝光。',
      answer: 'λ ≈ 469 nm（蓝光）'
    }
  },
]

// 获取分类信息
export function getCategoryInfo(categoryId) {
  return PHYSICS_CATEGORIES.find(c => c.id === categoryId)
}

// 按分类获取知识点
export function getKnowledgeByCategory(categoryId) {
  return PHYSICS_KNOWLEDGE.filter(k => k.category === categoryId)
}
