// ═══════════════════════════════════════════════════════
//  AI 解题讲解引擎 — 本地模板 + AI增强（混合模式）
// ═══════════════════════════════════════════════════════

// ── 几何体类型 → 题型模板映射 ──────────────────────

const TEMPLATES = {
  cube: {
    default: [
      { step: 1, title: '识别几何体', content: '这是一个{typeName}，所有棱长相等（棱长 {size}），每个面都是全等的正方形，对面互相平行。', type: 'observation' },
      { step: 2, title: '分析题目条件', content: '已知棱长 {size}，仔细阅读题目，提取已知条件和求解目标。', type: 'observation' },
      { step: 3, title: '构建辅助线/面', content: '根据需要作辅助线或辅助平面，将空间问题转化为平面问题。', type: 'construction' },
      { step: 4, title: '计算求解', content: '代入棱长 {size}，使用勾股定理、余弦定理或向量法进行计算。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '综合以上各步的计算结果，得出最终答案。回顾解题思路：先识别{typeName}特征（棱长 {size}），再根据已知条件选择合适的公式，代入数据计算后得到结论。', type: 'conclusion' },
    ],
    angle_skew_lines: [
      { step: 1, title: '识别几何体', content: '正方体，所有棱长相等，对面平行，相邻面垂直。', type: 'observation' },
      { step: 2, title: '找出异面直线', content: '在正方体中定位题目指定的两条异面直线，确认它们不在同一平面内。', type: 'observation' },
      { step: 3, title: '平移法作辅助线', content: '将其中一条直线沿正方体的棱平移到与另一条直线共面的位置。平移不改变线段方向，因此夹角不变。', type: 'construction' },
      { step: 4, title: '在辅助平面中计算夹角', content: '平移后两条直线共面，在平面中使用余弦定理或向量内积公式计算夹角。cosθ = |a·b|/(|a|·|b|)', type: 'calculation' },
      { step: 5, title: '得出结论', content: '由计算可得两条异面直线所成角的余弦值。由于异面直线夹角的范围是(0°, 90°]，最终夹角取锐角。因此，异面直线AB与B\'D的夹角为 arccos(|cosθ|)。', type: 'conclusion' },
    ],
    diagonal: [
      { step: 1, title: '识别几何体', content: '正方体，棱长为a，所有棱长相等。', type: 'observation' },
      { step: 2, title: '找出对角线', content: '体对角线连接正方体最远的两个顶点，面对角线连接一个面上的对角顶点。', type: 'observation' },
      { step: 3, title: '计算体对角线长度', content: '体对角线AG = √(a² + a² + a²) = a√3。先求面对角线AC = a√2，再用勾股定理求AG。', type: 'calculation' },
      { step: 4, title: '计算面对角线长度', content: '面对角线 = √(a² + a²) = a√2。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '应用勾股定理：体对角线 = √(长² + 宽² + 高²) = √(a² + a² + a²) = a√3。代入棱长a，即得正方体体对角线的长度。面对角线同理为 a√2。', type: 'conclusion' },
    ],
    dihedral_angle: [
      { step: 1, title: '识别几何体与平面', content: '正方体棱长为{size}，确定题目中涉及的两个平面，标记它们的交线。', type: 'observation' },
      { step: 2, title: '找二面角的棱', content: '两个平面的交线即为二面角的棱。在正方体中，通常是一个对角面与一个底面或侧面的交线。', type: 'observation' },
      { step: 3, title: '作二面角的平面角', content: '在棱上取一点，分别在两个平面内作棱的垂线，这两条垂线所成的角即为二面角的平面角。', type: 'construction' },
      { step: 4, title: '计算平面角', content: '利用向量法或坐标法：分别求两个平面的法向量n₁和n₂，二面角余弦 = |n₁·n₂|/(|n₁|·|n₂|)。注意判断锐二面角还是钝二面角。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '二面角的余弦值通过两平面法向量的夹角求得。二面角的大小与平面角的选取有关，结果通常在0°到180°之间。', type: 'conclusion' },
    ],
    line_plane_angle: [
      { step: 1, title: '识别直线与平面', content: '正方体棱长为{size}，确定题目中的直线和平面，找出直线与平面的交点。', type: 'observation' },
      { step: 2, title: '作投影线', content: '过直线上一点（非交点）作平面的垂线，连接垂足与交点，得到的线段即为直线在平面上的投影。', type: 'construction' },
      { step: 3, title: '确定线面角', content: '直线与其在平面上的投影所成的锐角，即为线面角。线面角的正弦值 = 直线上一点到平面的距离 / 该点到交点的距离。', type: 'observation' },
      { step: 4, title: '计算线面角', content: '利用点到平面距离公式和线段长度，sinθ = d/|线段长|。也可用方向向量与法向量：sinθ = |方向向量·法向量|/(|方向向量|·|法向量|)。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '线面角的范围是[0°, 90°]，正弦值等于方向向量与法向量夹角余弦的绝对值。代入具体数值即可求得。', type: 'conclusion' },
    ],
    point_plane_distance: [
      { step: 1, title: '识别点与平面', content: '正方体棱长为{size}，确定目标点和目标平面，建立空间直角坐标系。', type: 'observation' },
      { step: 2, title: '建立坐标系', content: '以正方体的一个顶点为原点，三条棱为坐标轴建立空间直角坐标系。写出点的坐标和平面的方程。', type: 'construction' },
      { step: 3, title: '求平面方程', content: '用平面上三点确定平面方程 Ax + By + Cz + D = 0。或用截距式。', type: 'calculation' },
      { step: 4, title: '代入距离公式', content: '点到平面距离 d = |Ax₀ + By₀ + Cz₀ + D| / √(A² + B² + C²)。代入点的坐标计算。也可用等体积法：点面距离 = 3V/S底。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '使用点到平面距离公式或等体积法求得。等体积法更直观：以目标点为顶点的四面体体积 ÷ 底面面积 = 高。', type: 'conclusion' },
    ],
    inscribed: [
      { step: 1, title: '理解内切关系', content: '正方体棱长为{size}，内切球与正方体的六个面都相切，球心在正方体的中心。', type: 'observation' },
      { step: 2, title: '确定球心位置', content: '内切球的球心 = 正方体的体心 = 三条体对角线的交点。球心到每个面的距离相等且等于内切球半径。', type: 'observation' },
      { step: 3, title: '计算内切球半径', content: '正方体内切球半径 r = 棱长/2 = {size}/2。因为球心到面的距离 = 棱长的一半。', type: 'calculation' },
      { step: 4, title: '计算内切球体积', content: '内切球体积 V = (4/3)πr³，表面积 S = 4πr²。代入 r = {size}/2 即得。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正方体内切球半径 = a/2，体积 V = (4/3)π(a/2)³ = πa³/6。其表面积 S = 4π(a/2)² = πa²。', type: 'conclusion' },
    ],
    circumscribed: [
      { step: 1, title: '理解外接关系', content: '正方体棱长为{size}，外接球过正方体的8个顶点，球心在正方体的中心。', type: 'observation' },
      { step: 2, title: '确定球心与半径', content: '外接球的球心 = 正方体的体心。外接球半径 R = 体对角线的一半 = (a√3)/2。', type: 'observation' },
      { step: 3, title: '计算体对角线', content: '正方体体对角线 = a√3 = {size} × √3。外接球半径 R = (a√3)/2。', type: 'calculation' },
      { step: 4, title: '计算外接球表面积与体积', content: '外接球体积 V = (4/3)πR³，表面积 S = 4πR²。代入 R = {size}√3/2。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正方体外接球半径 R = (√3/2)a，体积 V = (4/3)π(√3a/2)³ = (√3π/2)a³，表面积 S = 4π(3a²/4) = 3πa²。', type: 'conclusion' },
    ],
    section: [
      { step: 1, title: '识别截面要求', content: '正方体棱长为{size}，确定截平面经过的顶点或满足的条件。', type: 'observation' },
      { step: 2, title: '确定截平面', content: '根据给定点确定截平面方程，或作出截平面与正方体各面的交线。', type: 'construction' },
      { step: 3, title: '分析截面形状', content: '截面可能是三角形、四边形、五边形或六边形。对于过三个顶点的截面，求各边长。', type: 'observation' },
      { step: 4, title: '计算截面面积', content: '利用截面各顶点的坐标计算边长，再用海伦公式或坐标法计算截面面积。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '截面面积取决于截平面的位置和角度。过正方体对角线的截面积最大。利用空间坐标法可精确计算。', type: 'conclusion' },
    ],
  },

  cuboid: {
    default: [
      { step: 1, title: '识别几何体', content: '这是一个{typeName}，三组对面分别平行且全等，相邻面互相垂直。', type: 'observation' },
      { step: 2, title: '分析题目条件', content: '已知{typeName}的尺寸参数，提取长、宽、高等已知条件。', type: 'observation' },
      { step: 3, title: '构建辅助线', content: '根据需要作对角线或辅助平面，将空间问题分解。', type: 'construction' },
      { step: 4, title: '计算求解', content: '使用勾股定理的推广：体对角线 = √(长² + 宽² + 高²)。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '应用三维勾股定理：体对角线 = √(长² + 宽² + 高²)。代入题目给出的长、宽、高数值后，开平方即得{typeName}的体对角线长度。', type: 'conclusion' },
    ],
    diagonal_long: [
      { step: 1, title: '识别几何体', content: '长方体，长a、宽b、高c。三组对面分别平行且全等。', type: 'observation' },
      { step: 2, title: '理解体对角线', content: '体对角线连接长方体最远的两个顶点，穿过长方体的内部。', type: 'observation' },
      { step: 3, title: '分层计算', content: '先求底面对角线：d² = a² + b²。然后将底面对角线与高组合：AG² = d² + c² = a² + b² + c²。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '将已知的长、宽、高代入公式：体对角线 = √(a² + b² + c²)。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '长方体体对角线长度 = √(长² + 宽² + 高²)。公式本质是三维空间的勾股定理：将长方体分解为底面矩形和对角垂面，两次应用勾股定理即得。', type: 'conclusion' },
    ],
  },

  sphere: {
    default: [
      { step: 1, title: '识别几何体', content: '球体，所有表面点到球心的距离等于半径r。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '提取题目中给出的半径或直径信息。', type: 'observation' },
      { step: 3, title: '应用球体公式', content: '体积 V = (4/3)πr³，表面积 S = 4πr²。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将半径值代入公式进行计算。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '代入半径r到公式：体积 V = (4/3)πr³，表面积 S = 4πr²。计算时注意π取近似值3.14，体积和表面积的单位分别为立方单位和平方单位。', type: 'conclusion' },
    ],
    inscribed: [
      { step: 1, title: '理解内接关系', content: '球内接一个正方体，正方体的8个顶点都在球面上，球心即是正方体的体心。', type: 'observation' },
      { step: 2, title: '建立关系式', content: '设正方体棱长为a，球半径为R。正方体体对角线 = a√3 = 2R（体对角线是球的直径）。', type: 'observation' },
      { step: 3, title: '求解棱长', content: '由 a√3 = 2R 得 a = 2R/√3。代入已知球半径R即可求得正方体棱长。', type: 'calculation' },
      { step: 4, title: '验证关系', content: '验证：正方体外接球半径 R = a√3/2，与 a = 2R/√3 一致。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '球内接正方体的棱长 a = 2R/√3。体对角线恰好是球的直径，这一关系是解题的关键。', type: 'conclusion' },
    ],
    spherical_cap: [
      { step: 1, title: '理解球冠', content: '球冠是球体被一个平面截下的一部分。球冠的高h = 球半径R - 球心到截面的距离d。', type: 'observation' },
      { step: 2, title: '确定球冠参数', content: '已知球半径R和截面到球心的距离d，则球冠的高 h = R - d（若截面不过球心）。', type: 'observation' },
      { step: 3, title: '应用球冠公式', content: '球冠体积 V = πh²(R - h/3) = πh²(3R-h)/3。也可用 V = πh(3a² + h²)/6，其中a为截面圆半径。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将R和h（或d）代入球冠体积公式进行计算。截面圆半径 a = √(R² - d²)。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '球冠体积取决于球半径和冠高。常用公式 V = πh²(R - h/3)。当h=2R时退化为整个球体：V = 4πR³/3。', type: 'conclusion' },
    ],
  },

  cylinder: {
    default: [
      { step: 1, title: '识别几何体', content: '圆柱，上下底面为全等的圆，侧面展开为矩形。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面半径r，高h。', type: 'observation' },
      { step: 3, title: '应用圆柱公式', content: '体积 V = πr²h，侧面积 S侧 = 2πrh，表面积 S = 2πr(r+h)。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将数值代入公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆柱体积 V = πr²h，侧面积 S侧 = 2πrh，表面积 S = 2πr(r+h)。代入半径r和高h即可求得具体数值。三个公式分别对应圆柱的不同度量维度。', type: 'conclusion' },
    ],
    section: [
      { step: 1, title: '识别几何体', content: '圆柱，上下底面为全等的圆，侧面展开为矩形。', type: 'observation' },
      { step: 2, title: '理解截面', content: '过上下底面中心的截面是一个矩形，其一边等于底面直径，另一边等于圆柱的高。', type: 'observation' },
      { step: 3, title: '确定截面参数', content: '截面矩形的长 = 底面直径 = 2r，宽 = 圆柱的高 = h。', type: 'calculation' },
      { step: 4, title: '计算截面面积', content: '截面面积 = 长 × 宽 = (2r) × h = 2rh。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆柱过上下底面中心作截面，截面为矩形。矩形长 = 底面直径 = 2r，宽 = 圆柱高 = h，面积 S = 2r × h = 2rh。', type: 'conclusion' },
    ],
  },

  cone: {
    default: [
      { step: 1, title: '识别几何体', content: '圆锥，底面为圆，顶点在底面中心的正上方。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面半径r，高h，母线l = √(r² + h²)。', type: 'observation' },
      { step: 3, title: '应用圆锥公式', content: '体积 V = (1/3)πr²h，侧面积 S侧 = πrl，表面积 S = πr(r+l)。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '先求母线长 l = √(r² + h²)，再代入体积和表面积公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆锥体积 V = (1/3)πr²h（等底等高圆柱体积的三分之一），侧面积 S侧 = πrl。先由勾股定理求母线 l = √(r² + h²)，再代入公式即得。', type: 'conclusion' },
    ],
    generatrix: [
      { step: 1, title: '识别圆锥参数', content: '圆锥底面半径r，高h，母线l连接顶点与底面圆周上任意一点。', type: 'observation' },
      { step: 2, title: '理解母线关系', content: '母线l、底面半径r、高h构成直角三角形：l² = r² + h²。', type: 'observation' },
      { step: 3, title: '计算母线长', content: '母线 l = √(r² + h²)。代入已知的底面半径和高即可求得母线长。', type: 'calculation' },
      { step: 4, title: '推导其他量', content: '已知母线后可求：侧面积 S侧 = πrl，表面积 S = πr(r+l)，侧面展开图扇形圆心角 θ = 2πr/l × 180°/π。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '母线是圆锥最重要的结构参数之一，通过 l = √(r² + h²) 连接了底面半径和高。', type: 'conclusion' },
    ],
    lateral_area: [
      { step: 1, title: '理解圆锥侧面', content: '圆锥侧面展开是一个扇形，扇形半径 = 母线l，扇形弧长 = 底面周长 = 2πr。', type: 'observation' },
      { step: 2, title: '计算母线长', content: '先求母线 l = √(r² + h²)。这是计算侧面积的前提。', type: 'calculation' },
      { step: 3, title: '应用侧面积公式', content: '侧面积 S侧 = πrl（扇形面积 = 1/2 × 弧长 × 半径 = 1/2 × 2πr × l = πrl）。', type: 'calculation' },
      { step: 4, title: '计算表面积', content: '表面积 S全 = S侧 + S底 = πrl + πr² = πr(l+r)。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆锥侧面积 = πrl，表面积 = πr(r+l)。侧面展开扇形的圆心角 θ = (r/l) × 360°。', type: 'conclusion' },
    ],
  },

  pyramid: {
    default: [
      { step: 1, title: '识别几何体', content: '正四棱锥，底面为正方形，顶点在底面中心的垂直上方。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面边长a，高h。斜高 = √(h² + (a/2)²)。', type: 'observation' },
      { step: 3, title: '应用棱锥公式', content: '体积 V = (1/3)×底面积×高 = (1/3)×a²×h。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将底面边长a和高h代入体积公式 V = (1/3)a²h。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '棱锥体积 = 1/3 × 底面积 × 高 = 1/3 × a² × h。底面积为正方形边长平方，再乘以高的三分之一即得体积。', type: 'conclusion' },
    ],
    lateral_area: [
      { step: 1, title: '识别棱锥结构', content: '正四棱锥底面边长a，侧棱长l，高h。侧面是四个全等的等腰三角形。', type: 'observation' },
      { step: 2, title: '计算斜高', content: '斜高 h\' = √(l² - (a/2)²)（由侧棱和底边一半构成）。或 h\' = √(h² + (a/2)²)（由高和底边一半构成）。', type: 'calculation' },
      { step: 3, title: '计算侧面积', content: '侧面积 S侧 = 4 × (1/2 × a × h\') = 2a × h\'。每个侧面三角形面积 = 底×高/2。', type: 'calculation' },
      { step: 4, title: '计算表面积', content: '表面积 S全 = S侧 + S底 = 2a × h\' + a²。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四棱锥的侧面积取决于底面边长和斜高。如果已知侧棱长而非斜高，需先通过直角三角形关系求出斜高。', type: 'conclusion' },
    ],
    circumscribed: [
      { step: 1, title: '理解外接球', content: '正四棱锥外接球的球心在底面中心的正上方（或下方），到所有5个顶点的距离相等。', type: 'observation' },
      { step: 2, title: '建立方程', content: '设底面中心为O，球心为Q，Q在PO上（P为顶点）。OQ = x，则球半径R满足：R² = x² + (a√2/2)² = (h-x)²。', type: 'construction' },
      { step: 3, title: '求解球心位置', content: '由 x² + a²/2 = (h-x)² 解得 x = (h² - a²/2)/(2h)。代入求R。', type: 'calculation' },
      { step: 4, title: '计算外接球半径', content: 'R = √(x² + a²/2)。如果 x < 0，说明球心在底面下方（矮棱锥情况）。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四棱锥外接球半径 R = (h² + a²/2)/(2h)（当球心在PO上时）。对于高瘦棱锥，球心在内部；对于矮胖棱锥，球心在底面下方。', type: 'conclusion' },
    ],
  },

  prism: {
    default: [
      { step: 1, title: '识别几何体', content: '棱柱，上下底面为全等的多边形，侧面为矩形。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面边长和棱柱的高。', type: 'observation' },
      { step: 3, title: '应用棱柱公式', content: '体积 V = 底面积 × 高。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '先计算底面积，再乘高。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '棱柱体积 = 底面积 × 高。底面积由底面多边形形状决定，乘以棱柱的高即得体积。', type: 'conclusion' },
    ],
  },

  squareFrustum: {
    default: [
      { step: 1, title: '识别几何体', content: '四棱台（平截头棱锥），上下底面为相似的正方形，侧面为梯形。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '上底边长a，下底边长b，高h。', type: 'observation' },
      { step: 3, title: '应用棱台公式', content: '体积 V = h/3 × (S₁ + S₂ + √(S₁S₂))，其中S₁=a², S₂=b²。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将数值代入棱台体积公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '棱台体积公式 V = h/3 × (S上 + S下 + √(S上·S下))，其中S上、S下分别为上下底面积。代入数值计算即得。', type: 'conclusion' },
    ],
  },

  circularFrustum: {
    default: [
      { step: 1, title: '识别几何体', content: '圆台（平截头圆锥），上下底面为半径不同的圆。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '上底面半径r，下底面半径R，高h。', type: 'observation' },
      { step: 3, title: '应用圆台公式', content: '体积 V = πh/3 × (R² + r² + Rr)。母线 l = √(h² + (R-r)²)。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将数值代入圆台体积公式。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '圆台体积 V = πh/3 × (R² + r² + Rr)，母线 l = √(h² + (R-r)²)。代入上下底面半径和高即得。', type: 'conclusion' },
    ],
  },

  octahedron: {
    default: [
      { step: 1, title: '识别几何体', content: '正八面体，8个面均为全等的等边三角形，6个顶点，12条棱长相等（棱长 {size}）。可看作两个全等正四棱锥底面重合而成。', type: 'observation' },
      { step: 2, title: '分析题目条件', content: '已知正八面体棱长 {size}。8个面全等，3条体对角线互相垂直且相等。体对角线长 = a√2。', type: 'observation' },
      { step: 3, title: '应用正八面体公式', content: '体积 V = a³√2/3（= 2个正四棱锥体积之和），表面积 S = 2√3·a²。外接球半径 = a/√2，内切球半径 = a/√6。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将棱长 {size} 代入相应公式进行计算。注意√2≈1.414，√3≈1.732，√6≈2.449。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正八面体可分解为两个底面对底面的正四棱锥。它的3条体对角线恰为三维坐标轴，这一对称性使得所有度量都可解析表达。', type: 'conclusion' },
    ],
  },

  tetrahedron: {
    default: [
      { step: 1, title: '识别几何体', content: '正四面体，4个面均为全等的等边三角形，6条棱长相等（棱长 {size}），是最简单的正多面体。', type: 'observation' },
      { step: 2, title: '分析题目条件', content: '已知正四面体棱长 {size}。正四面体可以看作正方体四个互异顶点的连线（取正方体的四个对角顶点）。', type: 'observation' },
      { step: 3, title: '应用正四面体公式', content: '高 h = a√6/3，体积 V = a³√2/12，表面积 S = √3·a²。外接球半径 R = a√6/4，内切球半径 r = a√6/12。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将棱长 {size} 代入相应公式进行计算。注意√2≈1.414，√3≈1.732，√6≈2.449。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四面体的所有度量都可以由棱长a唯一确定。关键：高与底面的交点恰好是底面正三角形的重心，高、外接球半径、内切球半径三者成比例 3:3:1。', type: 'conclusion' },
    ],
    volume: [
      { step: 1, title: '识别几何体', content: '正四面体，4个面均为全等等边三角形，棱长a = {size}。', type: 'observation' },
      { step: 2, title: '计算底面积', content: '底面是等边三角形，面积 S底 = √3/4 × a²。', type: 'calculation' },
      { step: 3, title: '计算高', content: '正四面体的高 h = a√6/3。高通过底面重心，且垂直于底面。', type: 'calculation' },
      { step: 4, title: '计算体积', content: 'V = 1/3 × S底 × h = 1/3 × (√3/4 × a²) × (a√6/3) = a³√2/12。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四面体体积 V = a³√2/12。代入棱长 {size} 即可。这个公式的推导体现了"等边三角形面积 → 高 → 体积"的完整思路。', type: 'conclusion' },
    ],
    inscribed: [
      { step: 1, title: '理解内切球', content: '正四面体的内切球与四个面都相切，球心是四面体的内心（各面角平分面的交点）。', type: 'observation' },
      { step: 2, title: '确定球心位置', content: '内切球球心在正四面体的中心（重心），到每个面的距离相等。可以用体积法：V = 1/3 × S × r × 4。', type: 'observation' },
      { step: 3, title: '计算内切球半径', content: '由 V = 4 × 1/3 × S底 × r，得 r = 3V/(4S底) = 3(a³√2/12)/(4×√3a²/4) = a√6/12。', type: 'calculation' },
      { step: 4, title: '验证关系', content: '内切球半径 r = a√6/12，外接球半径 R = a√6/4。R:r = 3:1。球心到顶点距离:球心到面距离 = 3:1。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四面体内切球半径 r = a√6/12。代入学中的等体积法技巧：四面体体积 = 4个小四面体体积之和，每个小四面体以球心为顶点、面为底面。', type: 'conclusion' },
    ],
    circumscribed: [
      { step: 1, title: '理解外接球', content: '正四面体的外接球过4个顶点，球心即正四面体的中心。', type: 'observation' },
      { step: 2, title: '利用正方体关系', content: '正四面体可嵌入正方体：取正方体的4个互异对角顶点。外接球半径 = 正方体体对角线的一半。', type: 'construction' },
      { step: 3, title: '建立关系式', content: '设正方体棱长为L，则正四面体棱长 a = L√2，正方体体对角线 = L√3。外接球半径 R = L√3/2 = a√6/4。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将棱长 {size} 代入 R = a√6/4。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四面体外接球半径 R = a√6/4。巧妙之处在于利用正四面体与正方体的关系，化空间问题为熟悉的几何体。', type: 'conclusion' },
    ],
    opposite_edges: [
      { step: 1, title: '理解对棱', content: '正四面体有3组对棱，每组对棱是两条不相交的棱（异面直线），如AB与CD。', type: 'observation' },
      { step: 2, title: '分析对棱关系', content: '正四面体的对棱互相垂直。对棱中点连线垂直于这两条棱，且长度为 a/√2。', type: 'observation' },
      { step: 3, title: '计算对棱距离', content: '对棱距离 = 对棱中点连线的长度 = a/√2。这是两条异面直线的公垂线段长度。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '将棱长 {size} 代入：对棱距离 = {size}/√2。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '正四面体对棱距离 = a/√2。对棱中点连线恰好是正方体相对面中心的连线，这一几何特性使得正四面体的对棱距离计算非常简洁。', type: 'conclusion' },
    ],
  },
}

// ── 关键词 → 题型匹配 ────────────────────────────

function detectProblemType(type, text) {
  const t = text.toLowerCase()

  if (type === 'cube') {
    if (/二面角|dihedral/.test(t)) return 'dihedral_angle'
    if (/线面角|直线.*平面.*角/.test(t)) return 'line_plane_angle'
    if (/点.*到.*(平面|面).*距离|等体积法/.test(t)) return 'point_plane_distance'
    if (/内接|内切/.test(t)) return 'inscribed'
    if (/外接|外切/.test(t)) return 'circumscribed'
    if (/异面|skew/.test(t)) return 'angle_skew_lines'
    if (/截面/.test(t)) return 'section'
    if (/对角线|diagonal/.test(t)) return 'diagonal'
  }

  if (type === 'cuboid') {
    if (/体对角线|对角线长/.test(t)) return 'diagonal_long'
  }

  if (type === 'sphere') {
    if (/内接|内切/.test(t)) return 'inscribed'
    if (/球冠|crown|spherical cap/.test(t)) return 'spherical_cap'
  }

  if (type === 'cone') {
    if (/母线|generatrix/.test(t)) return 'generatrix'
    if (/侧面积|侧面展开/.test(t)) return 'lateral_area'
  }

  if (type === 'pyramid') {
    if (/外接|外切/.test(t)) return 'circumscribed'
    if (/侧面积|侧棱/.test(t)) return 'lateral_area'
  }

  if (type === 'tetrahedron') {
    if (/对棱|异面/.test(t)) return 'opposite_edges'
    if (/内接|内切/.test(t)) return 'inscribed'
    if (/外接|外切/.test(t)) return 'circumscribed'
    if (/体积/.test(t)) return 'volume'
  }

  // For other types, default template is fine
  return 'default'
}

// ── 公开 API ─────────────────────────────────────

/**
 * 根据几何体类型和题目文字，本地生成解题步骤模板
 * 自动插值：将模板中的占位符替换为题目实际参数
 * @param {string} problemText - 用户输入的题目
 * @param {Object} parsedData - parseProblem返回的结构化数据
 * @returns {Array} 解题步骤数组
 */
export function generateLocalSteps(problemText, parsedData) {
  const type = parsedData?.type || 'cube'
  const size = parsedData?.size
  const labels = parsedData?.labels || parsedData?.vertices || []

  // 构建插值上下文
  const ctx = {
    type,
    size,
    typeName: GEOMETRY_NAMES[type] || type,
    labelStr: labels.join('、'),
    firstLabel: labels[0] || '',
  }

  const templates = TEMPLATES[type]

  if (!templates) {
    // Generic fallback — 带插值
    return interpolateSteps([
      { step: 1, title: '识别几何体', content: `这是一个${ctx.typeName}。`, type: 'observation' },
      { step: 2, title: '分析已知条件', content: size ? `已知关键参数：尺寸为 ${size}。` : '提取题目中给出的参数和条件。', type: 'observation' },
      { step: 3, title: '选择解题方法', content: '根据题目类型选择合适的公式和方法。', type: 'observation' },
      { step: 4, title: '进行计算', content: '代入公式进行计算。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '整理结果，得出最终答案。', type: 'conclusion' },
    ], ctx)
  }

  const problemType = detectProblemType(type, problemText)
  const steps = templates[problemType] || templates.default
  return interpolateSteps(steps, ctx)
}

/**
 * 将模板步骤中的占位符替换为实际数值
 * 同时将模板式标题改写为老师讲题风格
 */
function interpolateSteps(steps, ctx) {
  return steps.map(step => ({
    ...step,
    title: makeTeacherTitle(step, ctx),
    content: step.content
      .replace(/\{typeName\}/g, ctx.typeName)
      .replace(/\{size\}/g, ctx.size != null ? String(ctx.size) : '')
      .replace(/\{labels\}/g, ctx.labelStr)
      .replace(/\{label\}/g, ctx.firstLabel),
  }))
}

/**
 * 将模板标题改写为老师讲课风格
 * 基于 step.type 和 ctx 生成具体、可操作的标题
 */
function makeTeacherTitle(step, ctx) {
  const t = step.type
  const geo = ctx.typeName

  // 按步骤类型生成老师口吻标题
  const titles = {
    observation: [
      `先来看看这个${geo}`,
      `看看题目给的${geo}是什么样的`,
      `${geo}的基本特征`,
      `把题目里的条件理清楚`,
      `找到题目要我们求什么`,
      `先确定题目中的关键信息`,
      `看清楚题目里提到的线和面`,
      `这个${geo}里有什么已知条件`,
      `搞清楚题目问的是什么`,
    ],
    construction: [
      `为了方便计算，我们加一条辅助线`,
      `现在把空间问题变到平面上来`,
      `把其中一条线平移过来`,
      `连结这两个点，画一条辅助线`,
      `我们作一条辅助线`,
      `现在用平移法把两条线放到同一个平面`,
      `建立一个坐标系，把点表示出来`,
      `这里需要一条辅助线来连接`,
      `把需要的截面画出来`,
    ],
    calculation: [
      `现在可以开始算了`,
      `代入公式，一步一步来`,
      `用学过的公式代入数值`,
      `具体算一下这个数值`,
      `把已知条件代入公式`,
      `接下来就是计算了`,
      `先求这个长度，再求最终结果`,
      `一步步推导出来`,
      `用勾股定理（或其他公式）来算`,
    ],
    conclusion: [
      `这样就算出来了`,
      `所有的步骤串起来，得到最终答案`,
      `回过头来看，这道题的思路是这样的`,
      `就得到了最终的结果`,
      `所以答案是`,
      `整理一下，整个解题过程就是这样`,
      `这样我们就求出了题目要的结果`,
      `把刚才的推导总结一下`,
      `所以最终结论是`,
    ],
  }

  const pool = titles[t] || titles.observation
  // 用步骤序号在候选标题池中选一个（循环使用）
  const idx = ((step.step || 1) - 1) % pool.length
  return pool[idx]
}

const GEOMETRY_NAMES = {
  cube: '正方体', cuboid: '长方体', sphere: '球体', cylinder: '圆柱体',
  cone: '圆锥体', pyramid: '正四棱锥', prism: '棱柱',
  squareFrustum: '四棱台', circularFrustum: '圆台',
}

// ── AI 增强讲解（需要 Claude API）─────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const EXPLAIN_SYSTEM_PROMPT = `你是一个中学数学老师，正在给一个学生讲解立体几何题。你的讲解要像真人老师一样自然、具体、有步骤感。

请为这道题生成分步讲解。严格输出 JSON 数组（不要 markdown 代码块）：

[
  { "step": 1, "title": "这步做什么", "content": "详细讲解（2-4句话）", "type": "observation|construction|calculation|conclusion" },
  ...
]

要求：
1. 3-5 个步骤
2. type: observation=观察分析, construction=作图构造, calculation=计算推导, conclusion=结论
3. title 必须是具体的、像老师说的话，比如"先找出题目中的两条异面直线"，禁止使用"观察""分析""计算""结论"这些抽象词
4. content 每步 2-4 句话，用自然的中文数学老师口吻
5. 只输出 JSON 数组`

/**
 * 调用 Claude API 生成详细解题讲解
 * @param {string} problemText - 用户题目
 * @param {Object} parsedData - AI解析结果
 * @param {string} apiKey - Anthropic API Key
 * @returns {Promise<Array>} 解题步骤数组
 */
export async function generateAIExplanation(problemText, parsedData, apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('需要 API Key 才能生成AI讲解')
  }

  const geoType = parsedData?.type || 'unknown'
  const prompt = `题目：${problemText}\n\n几何体类型：${geoType}\n参数：${JSON.stringify(parsedData)}\n\n请为这道题生成分步解题讲解。`

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: EXPLAIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`)
  }

  const data = await response.json()
  const text = data.content?.find(b => b.type === 'text')?.text || ''

  // Parse JSON from response
  let cleaned = text.trim()
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf('[')
    const lastBrace = cleaned.lastIndexOf(']')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    }
    throw new Error('AI 返回格式无法解析')
  }
}
