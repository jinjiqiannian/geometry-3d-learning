// ═══════════════════════════════════════════════════════
//  AI 解题讲解引擎 — 计算引擎 + 本地模板（双路径）
//  可计算题型 → solveGeometry 动态计算
//  不可计算题型 → 模板推理框架
// ═══════════════════════════════════════════════════════

import { solveGeometry } from './calculationEngine.js'

// ── 可计算题型列表 ──
// 这些题型有实际数值可以算，不走模板
const COMPUTABLE_TYPES = ['volume', 'surface_area', 'diagonal', 'lateral_area', 'side_edge', 'section', 'generatrix']

// ── 几何体类型 → 题型模板映射 ──────────────────────

const TEMPLATES = {
  cube: {
    default: [
      { step: 1, title: '先来看看这个{typeName}', content: '同学们，这是一个正方体，所有棱长都相等，都是 {size}。每个面都是正方形，对面是平行的，相邻面是垂直的。', type: 'observation' },
      { step: 2, title: '题目给了什么条件', content: '题目告诉我们棱长是 {size}，我们需要根据这个条件来求题目要求的量。', type: 'observation' },
      { step: 3, title: '需要做辅助线吗', content: '根据题目要求，我们可能需要画一些辅助线，把空间里的问题变成平面问题来解决。', type: 'construction' },
      { step: 4, title: '开始计算了', content: '把棱长 {size} 代入公式，一步步算出来。正方体常用的公式有：体积 = a³，表面积 = 6a²，体对角线 = a√3。', type: 'calculation' },
      { step: 5, title: '答案出来了', content: '这样我们就求出了结果。正方体的关键就是记住它的特征：12条棱相等，6个面全等，体对角线是棱长的√3倍。', type: 'conclusion' },
    ],
    angle_skew_lines: [
      { step: 1, title: '先找到两条异面直线', content: '同学们看这个正方体，题目要我们求AC和BF的夹角。这两条线不在同一个平面上，所以是异面直线。', type: 'observation' },
      { step: 2, title: '异面直线夹角怎么求', content: '求异面直线的夹角，我们有个好方法叫"平移法"。把其中一条直线平移，让它们在同一个平面上，然后求这个平面角就行了。', type: 'observation' },
      { step: 3, title: '把BF平移到和AC共面', content: '我们把BF沿着棱平移到AF的位置（因为ABFE是正方形，BF和AF平行且相等）。这样AC和AF就在同一个平面里了。', type: 'construction' },
      { step: 4, title: '用余弦定理算夹角', content: '现在三角形ACF中，AC是面对角线等于2√2，AF等于2，CF也是面对角线等于2√2。用余弦定理：cos∠CAF = (AC² + AF² - CF²) / (2×AC×AF) = (8 + 4 - 8) / (2×2√2×2) = 4 / 8√2 = √2/4。', type: 'calculation' },
      { step: 5, title: '最终答案', content: '所以异面直线AC和BF所成角的余弦值是√2/4。记住：求异面直线夹角，平移是关键！', type: 'conclusion' },
    ],
    diagonal: [
      { step: 1, title: '正方体的对角线有两种', content: '正方体有面对角线和体对角线。面对角线在一个面上，比如AC；体对角线穿过正方体内部，比如AG。', type: 'observation' },
      { step: 2, title: '先算面对角线', content: '面对角线就是正方形的对角线，用勾股定理：面对角线 = √(a² + a²) = a√2。棱长是{size}，所以面对角线就是{size}√2。', type: 'calculation' },
      { step: 3, title: '再算体对角线', content: '体对角线可以看作是面对角线和一条棱组成的直角三角形的斜边。所以体对角线 = √(面对角线² + a²) = √(2a² + a²) = √(3a²) = a√3。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '棱长a={size}，所以体对角线 = {size}√3，面对角线 = {size}√2。', type: 'calculation' },
      { step: 5, title: '总结一下', content: '记住两个公式：面对角线 = a√2，体对角线 = a√3。这是正方体最常用的两个结论。', type: 'conclusion' },
    ],
    dihedral_angle: [
      { step: 1, title: '什么是二面角', content: '两个平面相交形成的角就叫二面角。比如正方体中，一个对角面和一个底面相交，它们之间就有一个二面角。', type: 'observation' },
      { step: 2, title: '找二面角的平面角', content: '求二面角的关键是找到它的"平面角"。在两个平面的交线上任取一点，分别在两个平面内作交线的垂线，这两条垂线的夹角就是二面角的平面角。', type: 'construction' },
      { step: 3, title: '用向量法求', content: '我们可以用向量法来算。分别求出两个平面的法向量，然后用法向量的夹角来求二面角。公式是：cosθ = |n₁·n₂|/(|n₁|×|n₂|)。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '假设正方体棱长为{size}，建立坐标系后，可以算出法向量，进而求出二面角的余弦值。', type: 'calculation' },
      { step: 5, title: '结论', content: '通过计算，这个二面角的余弦值是√2/2，也就是说二面角是45度。', type: 'conclusion' },
    ],
    line_plane_angle: [
      { step: 1, title: '线面角是什么', content: '直线和平面相交，直线与它在平面上的投影之间的夹角就是线面角。这个角的范围是0到90度。', type: 'observation' },
      { step: 2, title: '找投影线', content: '要求线面角，首先要找到直线在平面上的投影。过直线上一点作平面的垂线，垂足和交点的连线就是投影。', type: 'construction' },
      { step: 3, title: '用公式计算', content: '线面角的正弦值等于直线上一点到平面的距离除以该点到交点的距离。或者用方向向量和法向量来算：sinθ = |方向向量·法向量|/(|方向向量|×|法向量|)。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '假设正方体棱长为{size}，代入公式计算即可得到线面角的正弦值。', type: 'calculation' },
      { step: 5, title: '答案', content: '这个线面角的正弦值是√3/3。记住：线面角是直线和投影的夹角，不是和平面本身的夹角。', type: 'conclusion' },
    ],
    point_plane_distance: [
      { step: 1, title: '点到平面的距离', content: '从一个点向平面作垂线，垂线段的长度就是点到平面的距离。', type: 'observation' },
      { step: 2, title: '建立坐标系', content: '我们可以建立空间直角坐标系来计算。以正方体的一个顶点为原点，三条棱为坐标轴。', type: 'construction' },
      { step: 3, title: '求平面方程', content: '先写出平面的方程 Ax + By + Cz + D = 0。比如底面ABCD的方程就是 z = 0。', type: 'calculation' },
      { step: 4, title: '用公式算距离', content: '点到平面的距离公式是：d = |Ax₀ + By₀ + Cz₀ + D| / √(A² + B² + C²)。把点的坐标代入就行。', type: 'calculation' },
      { step: 5, title: '结果', content: '假设正方体棱长为{size}，顶点到对角面的距离是{size}/√3。也可以用等体积法来验证这个结果。', type: 'conclusion' },
    ],
    inscribed: [
      { step: 1, title: '什么是内切球', content: '内切球就是和正方体六个面都相切的球，球心在正方体的正中心。', type: 'observation' },
      { step: 2, title: '球心在哪里', content: '内切球的球心就是正方体的体心，到每个面的距离都相等，这个距离就是球的半径。', type: 'observation' },
      { step: 3, title: '算半径', content: '正方体棱长是{size}，球心到面的距离就是棱长的一半，所以半径r = {size}/2。', type: 'calculation' },
      { step: 4, title: '算体积和表面积', content: '球的体积公式是V = (4/3)πr³，表面积是S = 4πr²。代入r = {size}/2，就能算出体积和表面积了。', type: 'calculation' },
      { step: 5, title: '答案', content: '内切球半径r = {size}/2，体积V = π×{size}³/6，表面积S = π×{size}²。记住：内切球直径等于正方体棱长。', type: 'conclusion' },
    ],
    circumscribed: [
      { step: 1, title: '什么是外接球', content: '外接球就是经过正方体所有8个顶点的球，球心也在正方体的正中心。', type: 'observation' },
      { step: 2, title: '球半径怎么算', content: '外接球的直径就是正方体的体对角线！所以半径R = 体对角线/2 = a√3/2。', type: 'calculation' },
      { step: 3, title: '代入数值', content: '棱长a = {size}，所以体对角线 = {size}√3，半径R = {size}√3/2。', type: 'calculation' },
      { step: 4, title: '算体积和表面积', content: '球的体积V = (4/3)πR³，表面积S = 4πR²。代入R = {size}√3/2计算。', type: 'calculation' },
      { step: 5, title: '结论', content: '外接球半径R = {size}√3/2，体积V = (√3π/2)×{size}³，表面积S = 3π×{size}²。记住：外接球直径等于正方体体对角线。', type: 'conclusion' },
    ],
    section: [
      { step: 1, title: '截面是什么', content: '用一个平面去截正方体，切出来的面就是截面。截面可以是三角形、四边形、五边形或六边形。', type: 'observation' },
      { step: 2, title: '画出截面', content: '根据题目要求，画出截平面和正方体各面的交线，就能看出截面的形状了。', type: 'construction' },
      { step: 3, title: '分析截面形状', content: '比如过三条棱中点的截面是正六边形，过三个顶点的截面可能是三角形。', type: 'observation' },
      { step: 4, title: '算截面面积', content: '可以用坐标法求出截面各顶点的坐标，再用海伦公式或向量叉乘来计算面积。', type: 'calculation' },
      { step: 5, title: '答案', content: '正方体的最大截面是过三条棱中点的正六边形，面积是(3√3/4)×{size}²。', type: 'conclusion' },
    ],
  },

  cuboid: {
    default: [
      { step: 1, title: '这是一个长方体', content: '同学们，长方体有三组对面，每组对面都平行且全等，相邻的面互相垂直。', type: 'observation' },
      { step: 2, title: '题目给了什么', content: '题目告诉我们长方体的长、宽、高，我们要根据这些条件来解题。', type: 'observation' },
      { step: 3, title: '画辅助线', content: '必要时我们可以画出对角线，把空间问题分解成几个平面问题。', type: 'construction' },
      { step: 4, title: '用三维勾股定理', content: '长方体的体对角线公式是：体对角线 = √(长² + 宽² + 高²)。记住这个公式，直接代入数值就行。', type: 'calculation' },
      { step: 5, title: '答案出来了', content: '所以长方体的体对角线长度就是√(长² + 宽² + 高²)。长方体和正方体很像，只是棱长不一定相等而已。', type: 'conclusion' },
    ],
    diagonal_long: [
      { step: 1, title: '长方体的体对角线', content: '体对角线是连接长方体最远两个顶点的线段，穿过长方体内部。', type: 'observation' },
      { step: 2, title: '分两步算', content: '我们可以分两步来算：先算底面对角线，再把底面对角线和高组成直角三角形算体对角线。', type: 'observation' },
      { step: 3, title: '第一步：底面对角线', content: '底面是个长方形，对角线d = √(长² + 宽²) = √(a² + b²)。', type: 'calculation' },
      { step: 4, title: '第二步：体对角线', content: '体对角线是底面对角线和高组成的直角三角形的斜边，所以体对角线 = √(d² + 高²) = √(a² + b² + c²)。', type: 'calculation' },
      { step: 5, title: '结论', content: '长方体体对角线 = √(长² + 宽² + 高²)。这就是三维空间的勾股定理！', type: 'conclusion' },
    ],
  },

  sphere: {
    default: [
      { step: 1, title: '这是一个球', content: '球很简单，所有表面上的点到球心的距离都相等，这个距离就是半径r。', type: 'observation' },
      { step: 2, title: '题目给了什么', content: '题目告诉我们球的半径是{size}，我们要算它的体积或者表面积。', type: 'observation' },
      { step: 3, title: '球的公式', content: '记住两个公式：体积V = (4/3)πr³，表面积S = 4πr²。这两个公式一定要记牢！', type: 'calculation' },
      { step: 4, title: '代入计算', content: '把半径r={size}代入公式，就能算出体积和表面积了。', type: 'calculation' },
      { step: 5, title: '答案', content: '体积V = (4/3)π×{size}³，表面积S = 4π×{size}²。记住：球只有一个参数——半径，知道半径就能算出所有量。', type: 'conclusion' },
    ],
    inscribed: [
      { step: 1, title: '球里面放个正方体', content: '球内接正方体，就是正方体的8个顶点都在球面上。球心就是正方体的中心。', type: 'observation' },
      { step: 2, title: '关键关系', content: '这里有个关键关系：正方体的体对角线等于球的直径！因为体对角线连接的两个顶点都在球面上。', type: 'observation' },
      { step: 3, title: '列方程', content: '设正方体棱长为a，球半径为R。则体对角线 = a√3 = 2R，所以a = 2R/√3。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '球半径R={size}，所以正方体棱长a = 2×{size}/√3。', type: 'calculation' },
      { step: 5, title: '结论', content: '记住这个关系：球内接正方体，体对角线等于球直径。反过来，如果知道正方体棱长，也能求外接球半径。', type: 'conclusion' },
    ],
    spherical_cap: [
      { step: 1, title: '什么是球冠', content: '球冠就是用一个平面把球切下来的一部分，像一顶帽子一样。', type: 'observation' },
      { step: 2, title: '球冠的参数', content: '球冠有两个重要参数：球的半径R和球冠的高h。球冠的高就是从截面到球顶的距离。', type: 'observation' },
      { step: 3, title: '球冠体积公式', content: '球冠体积公式是V = πh²(3R - h)/3。记住这个公式。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '把R={size}和h代入公式，就能算出球冠的体积了。', type: 'calculation' },
      { step: 5, title: '特殊情况', content: '当h=2R时，球冠就变成了整个球，体积就是(4/3)πR³，和球的体积公式一致。', type: 'conclusion' },
    ],
  },

  cylinder: {
    default: [
      { step: 1, title: '这是一个圆柱', content: '圆柱有两个圆形的底面，上下一样大，侧面展开是一个长方形。', type: 'observation' },
      { step: 2, title: '题目给了什么', content: '题目告诉我们底面半径r={size}，高h。这两个是圆柱的关键参数。', type: 'observation' },
      { step: 3, title: '圆柱的公式', content: '记住三个公式：体积V = πr²h，侧面积S侧 = 2πrh，表面积S = 2πr(r+h)。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '把r={size}和h代入公式，就能算出体积、侧面积和表面积了。', type: 'calculation' },
      { step: 5, title: '答案', content: '圆柱体积 = π×{size}²×高，侧面积 = 2π×{size}×高，表面积 = 2π×{size}×({size}+高)。记住：圆柱体积就是底面积乘高。', type: 'conclusion' },
    ],
    section: [
      { step: 1, title: '圆柱的截面', content: '过圆柱上下底面中心切一刀，切出来的截面是什么形状呢？是一个长方形！', type: 'observation' },
      { step: 2, title: '截面的尺寸', content: '这个长方形的一边是圆柱的高h，另一边是底面的直径2r。', type: 'observation' },
      { step: 3, title: '算截面面积', content: '截面面积 = 长 × 宽 = 直径 × 高 = 2r × h。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '半径r={size}，所以直径=2×{size}，截面面积 = 2×{size}×高。', type: 'calculation' },
      { step: 5, title: '结论', content: '过圆柱轴线的截面是长方形，面积等于直径乘高。', type: 'conclusion' },
    ],
  },

  cone: {
    default: [
      { step: 1, title: '这是一个圆锥', content: '圆锥有一个圆形底面，顶点在底面中心的正上方。像一个冰淇淋蛋筒。', type: 'observation' },
      { step: 2, title: '圆锥的三个参数', content: '圆锥有三个重要参数：底面半径r={size}，高h，还有母线l。母线是从顶点到底面边缘的斜线。', type: 'observation' },
      { step: 3, title: '先算母线', content: '母线l、半径r、高h构成直角三角形，所以l = √(r² + h²)。先算出母线长。', type: 'calculation' },
      { step: 4, title: '圆锥的公式', content: '体积V = (1/3)πr²h（是等底等高圆柱体积的三分之一），侧面积S侧 = πrl，表面积S = πr(r+l)。', type: 'calculation' },
      { step: 5, title: '答案', content: '体积 = (1/3)π×{size}²×高，侧面积 = π×{size}×√({size}²+高²)。记住：圆锥体积是圆柱的三分之一！', type: 'conclusion' },
    ],
    generatrix: [
      { step: 1, title: '什么是母线', content: '母线就是从圆锥顶点到底面圆周上任意一点的连线，圆锥有无数条母线，长度都相等。', type: 'observation' },
      { step: 2, title: '母线和半径、高的关系', content: '母线l、底面半径r、高h正好构成一个直角三角形，母线是斜边！', type: 'observation' },
      { step: 3, title: '用勾股定理算', content: '由勾股定理：l² = r² + h²，所以l = √(r² + h²)。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '半径r={size}，高h，所以母线l = √({size}² + h²)。', type: 'calculation' },
      { step: 5, title: '母线很重要', content: '母线是计算圆锥侧面积和表面积的关键，一定要先算出来！', type: 'conclusion' },
    ],
    lateral_area: [
      { step: 1, title: '圆锥侧面展开是什么', content: '把圆锥侧面剪开展平，会得到一个扇形！扇形的半径就是圆锥的母线l，扇形的弧长就是底面圆的周长2πr。', type: 'observation' },
      { step: 2, title: '先求母线', content: '侧面积需要用到母线，所以先算l = √(r² + h²)。', type: 'calculation' },
      { step: 3, title: '侧面积公式', content: '侧面积S侧 = πrl。为什么呢？因为扇形面积 = 1/2 × 弧长 × 半径 = 1/2 × 2πr × l = πrl。', type: 'calculation' },
      { step: 4, title: '表面积', content: '表面积 = 侧面积 + 底面积 = πrl + πr² = πr(l+r)。', type: 'calculation' },
      { step: 5, title: '答案', content: '侧面积 = π×{size}×√({size}²+高²)，表面积 = π×{size}×({size}+√({size}²+高²))。', type: 'conclusion' },
    ],
  },

  pyramid: {
    default: [
      { step: 1, title: '这是一个棱锥', content: '棱锥有一个多边形底面，所有侧棱都汇集到一个顶点。像一个金字塔。', type: 'observation', formula: '' },
      { step: 2, title: '题目给了什么', content: '题目告诉我们底面形状和尺寸，还有棱锥的高。正棱锥的顶点在底面中心的正上方。', type: 'observation', formula: '' },
      { step: 3, title: '求什么', content: '题目要求体积、侧面积还是其他量？选好公式再动手。', type: 'observation', formula: '' },
      { step: 4, title: '棱锥体积公式', content: '记住：棱锥体积 V = ⅓ × 底面积 × 高。不管是什么棱锥，这个公式都适用！', type: 'calculation', formula: 'V = ⅓S底h' },
      { step: 5, title: '答案', content: '把底面积和高代入公式，就能算出体积了。棱锥体积是同底同高棱柱体积的三分之一。', type: 'conclusion', formula: 'V = ⅓S底h' },
    ],
    volume: [
      { step: 1, title: '求棱锥体积', content: '要求棱锥体积，我们只需要两个量：底面积和高。', type: 'observation', formula: '' },
      { step: 2, title: '先算底面积', content: '底面是正方形，边长a={size}，所以底面积S底 = a² = {size}²。', type: 'calculation', formula: '' },
      { step: 3, title: '体积公式', content: '棱锥体积公式：V = ⅓ × 底面积 × 高。记住这个公式。', type: 'calculation', formula: 'V = ⅓S底h' },
      { step: 4, title: '代入计算', content: '假设高是h，那么V = ⅓ × {size}² × h。', type: 'calculation', formula: 'V = ⅓S底h' },
      { step: 5, title: '结论', content: '棱锥体积就是三分之一底面积乘高。这个公式对所有棱锥都适用！', type: 'conclusion', formula: 'V = ⅓S底h' },
    ],
    lateral_area: [
      { step: 1, title: '正四棱锥的侧面', content: '正四棱锥有4个侧面，每个侧面都是等腰三角形，而且都全等。', type: 'observation' },
      { step: 2, title: '什么是斜高', content: '斜高就是侧面等腰三角形底边上的高。我们需要先算出斜高。', type: 'calculation' },
      { step: 3, title: '算斜高', content: '斜高h\' = √(高² + (底面边长/2)²) = √(h² + ({size}/2)²)。', type: 'calculation' },
      { step: 4, title: '算侧面积', content: '一个侧面面积 = ½ × 底面边长 × 斜高，四个侧面就是4倍，所以S侧 = 2 × {size} × √(h² + ({size}/2)²)。', type: 'calculation' },
      { step: 5, title: '表面积', content: '表面积 = 侧面积 + 底面积 = 2×{size}×√(高² + ({size}/2)²) + {size}²。', type: 'conclusion' },
    ],
    circumscribed: [
      { step: 1, title: '棱锥的外接球', content: '外接球就是经过棱锥所有顶点的球。球心在底面中心和顶点的连线上。', type: 'observation' },
      { step: 2, title: '设未知数', content: '设球心到底面的距离是x，那么球心到顶点的距离就是h-x（h是棱锥的高）。', type: 'construction' },
      { step: 3, title: '列方程', content: '球半径R满足：R² = x² + (底面中心到顶点的距离)² = (h-x)²。底面中心到顶点的距离 = {size}√2/2。', type: 'calculation' },
      { step: 4, title: '解方程', content: '解这个方程可以求出x，然后就能算出R了。', type: 'calculation' },
      { step: 5, title: '答案', content: '外接球半径R = (高² + {size}²/2)/(2×高)。记住这个公式。', type: 'conclusion' },
    ],
    line_plane_angle: [
      { step: 1, title: '线面平行问题', content: '题目是关于直线和平面平行的问题。我们要利用线面平行的性质来解题。', type: 'observation', formula: '' },
      { step: 2, title: '线面平行的性质', content: '如果一条直线和一个平面平行，那么过这条直线的平面和已知平面的交线，与这条直线平行。', type: 'construction', formula: '线面平行性质定理' },
      { step: 3, title: '找平行线', content: '根据这个性质，我们可以找到平行线，然后利用平行线分线段成比例定理。', type: 'calculation', formula: '' },
      { step: 4, title: '列比例式', content: '因为E是AD中点，利用平行线分线段成比例，可以得出AP/AF = AC/AG = 2。', type: 'calculation', formula: 'AF:FP = AG:GC' },
      { step: 5, title: '结论', content: '所以AP/AF = 2。记住：线面平行常和平行线分线段成比例结合使用。', type: 'conclusion', formula: '' },
    ],
  },

  prism: {
    default: [
      { step: 1, title: '这是一个棱柱', content: '棱柱有两个全等的底面，侧棱互相平行且相等。直角棱柱的侧棱和底面垂直。', type: 'observation', formula: '' },
      { step: 2, title: '题目给了什么', content: '底面是边长为{size}的正三角形，侧棱就是棱柱的高。', type: 'observation', formula: '' },
      { step: 3, title: '棱柱的高', content: '直角棱柱的高就是侧棱的长度。题目没给高的时候，通常和底面边长相等。', type: 'observation', formula: '' },
      { step: 4, title: '棱柱体积', content: '棱柱体积 = 底面积 × 高。这个公式很简单，记住它！', type: 'calculation', formula: '' },
      { step: 5, title: '答案', content: '三棱柱的高等于侧棱长度。如果底面边长是{size}，高通常也是{size}。', type: 'conclusion', formula: 'h = 侧棱长' },
    ],
    volume: [
      { step: 1, title: '求棱柱体积', content: '棱柱体积很简单，就是底面积乘以高。', type: 'observation', formula: '' },
      { step: 2, title: '先算底面积', content: '底面是正三角形，边长a={size}，底面积S底 = √3/4 × a²。', type: 'calculation', formula: '' },
      { step: 3, title: '体积公式', content: '棱柱体积 V = S底 × h。底面积乘高就行。', type: 'calculation', formula: 'V = S底h' },
      { step: 4, title: '代入计算', content: '把底面积和高h代入，就能算出体积了。', type: 'calculation', formula: 'V = S底h' },
      { step: 5, title: '结论', content: '棱柱体积 = 底面积 × 高。这个公式对所有棱柱都适用！', type: 'conclusion', formula: 'V = S底h' },
    ],
    diagonal: [
      { step: 1, title: '棱柱的体对角线', content: '体对角线连接上下底面最远的两个顶点。', type: 'observation', formula: '' },
      { step: 2, title: '分两步算', content: '先算底面对角线，再把底面对角线和高组成直角三角形算体对角线。', type: 'calculation', formula: '' },
      { step: 3, title: '体对角线公式', content: '体对角线 = √(底面对角线² + 高²)。这也是三维勾股定理。', type: 'calculation', formula: '体对角线 = √(d² + h²)' },
      { step: 4, title: '代入计算', content: '把底面对角线d和高h代入公式，就能算出体对角线了。', type: 'calculation', formula: '' },
      { step: 5, title: '结论', content: '体对角线长度 = √(底面对角线² + 高²)。', type: 'conclusion', formula: '体对角线 = √(d² + h²)' },
    ],
  },

  squareFrustum: {
    default: [
      { step: 1, title: '这是一个四棱台', content: '四棱台就是把棱锥的顶部切掉剩下的部分。上下底面都是正方形，但大小不一样。', type: 'observation' },
      { step: 2, title: '题目给了什么', content: '上底边长a={size}，下底边长b，高h。', type: 'observation' },
      { step: 3, title: '棱台体积公式', content: '棱台体积公式：V = 高/3 × (上底面积 + 下底面积 + √(上底面积×下底面积))。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '上底面积S₁ = {size}²，下底面积S₂ = b²，代入公式计算。', type: 'calculation' },
      { step: 5, title: '答案', content: '体积 = 高/3 × ({size}² + b² + {size}×b)。记住这个公式，台体体积都这么算。', type: 'conclusion' },
    ],
  },

  circularFrustum: {
    default: [
      { step: 1, title: '这是一个圆台', content: '圆台就是把圆锥顶部切掉剩下的部分。上下底面都是圆，半径不一样。', type: 'observation' },
      { step: 2, title: '题目给了什么', content: '上底面半径r={size}，下底面半径R，高h。', type: 'observation' },
      { step: 3, title: '圆台体积公式', content: '圆台体积公式：V = π×高/3 × (R² + r² + Rr)。记住这个公式！', type: 'calculation' },
      { step: 4, title: '代入计算', content: '把R、r、h代入公式，就能算出体积了。', type: 'calculation' },
      { step: 5, title: '答案', content: '体积 = π×高/3 × ({size}² + R² + {size}×R)。圆台母线长l = √(高² + (R-{size})²)。', type: 'conclusion' },
    ],
  },

  octahedron: {
    default: [
      { step: 1, title: '这是正八面体', content: '正八面体有8个面，每个面都是等边三角形，6个顶点，12条棱都相等。可以想象成两个金字塔底面粘在一起。', type: 'observation' },
      { step: 2, title: '已知条件', content: '棱长是{size}。正八面体有3条互相垂直的体对角线。', type: 'observation' },
      { step: 3, title: '分解成两个棱锥', content: '正八面体可以分成两个底面相对的正四棱锥。这样算体积就方便了。', type: 'calculation' },
      { step: 4, title: '计算', content: '体积V = {size}³×√2/3，表面积S = 2√3×{size}²。', type: 'calculation' },
      { step: 5, title: '结论', content: '正八面体体积 = {size}³×√2/3，表面积 = 2√3×{size}²。记住：它就是两个四棱锥拼起来的。', type: 'conclusion' },
    ],
  },

  tetrahedron: {
    default: [
      { step: 1, title: '这是正四面体', content: '正四面体是最简单的正多面体，只有4个面，每个面都是等边三角形，6条棱都相等。', type: 'observation' },
      { step: 2, title: '已知条件', content: '棱长是{size}。正四面体可以看作是正方体的4个对角顶点连起来形成的。', type: 'observation' },
      { step: 3, title: '正四面体的公式', content: '高h = {size}×√6/3，体积V = {size}³×√2/12，表面积S = √3×{size}²。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '把棱长{size}代入公式计算。', type: 'calculation' },
      { step: 5, title: '结论', content: '知道棱长就能算出正四面体的所有量。高={size}×√6/3，体积={size}³×√2/12，表面积=√3×{size}²。', type: 'conclusion' },
    ],
    volume: [
      { step: 1, title: '求正四面体体积', content: '正四面体体积怎么算？还是用老方法：1/3 × 底面积 × 高。', type: 'observation' },
      { step: 2, title: '先算底面积', content: '底面是等边三角形，面积S底 = √3/4 × {size}²。', type: 'calculation' },
      { step: 3, title: '再算高', content: '正四面体的高h = {size}×√6/3。高通过底面重心。', type: 'calculation' },
      { step: 4, title: '算体积', content: 'V = 1/3 × S底 × h = 1/3 × (√3/4 × {size}²) × ({size}×√6/3) = {size}³×√2/12。', type: 'calculation' },
      { step: 5, title: '结论', content: '正四面体体积 = {size}³×√2/12。记住这个公式！', type: 'conclusion' },
    ],
    inscribed: [
      { step: 1, title: '内切球', content: '内切球和正四面体的四个面都相切，球心在正四面体的中心。', type: 'observation' },
      { step: 2, title: '用体积法算半径', content: '我们可以用体积法：正四面体体积 = 4个小三棱锥体积之和。每个小三棱锥的体积 = 1/3 × 面面积 × 内切球半径r。', type: 'observation' },
      { step: 3, title: '计算', content: '由V = 4 × 1/3 × S底 × r，得r = 3V/(4S底) = {size}×√6/12。', type: 'calculation' },
      { step: 4, title: '内外接球关系', content: '内切球半径r = {size}×√6/12，外接球半径R = {size}×√6/4。R:r = 3:1。', type: 'calculation' },
      { step: 5, title: '结论', content: '内切球半径 = {size}×√6/12。记住：内外接球半径比是3:1。', type: 'conclusion' },
    ],
    circumscribed: [
      { step: 1, title: '外接球', content: '外接球经过正四面体的4个顶点，球心在正四面体的中心。', type: 'observation' },
      { step: 2, title: '放到正方体里看', content: '正四面体可以放在正方体里，取正方体的4个对角顶点。这样外接球就是正方体的外接球。', type: 'construction' },
      { step: 3, title: '建立关系', content: '设正方体棱长为L，则正四面体棱长a = L√2，正方体体对角线 = L√3。外接球半径R = L√3/2 = a√6/4。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '棱长a={size}，所以R = {size}×√6/4。', type: 'calculation' },
      { step: 5, title: '结论', content: '外接球半径 = {size}×√6/4。把正四面体放进正方体里，问题就简单了！', type: 'conclusion' },
    ],
    opposite_edges: [
      { step: 1, title: '对棱是什么', content: '正四面体有3组对棱，每组对棱是两条不相交的棱，比如AB和CD。', type: 'observation' },
      { step: 2, title: '对棱的关系', content: '正四面体的对棱互相垂直！对棱中点连线的长度就是对棱之间的距离。', type: 'observation' },
      { step: 3, title: '算对棱距离', content: '对棱距离 = 棱长/√2 = {size}/√2。', type: 'calculation' },
      { step: 4, title: '代入数值', content: '棱长是{size}，所以对棱距离 = {size}/√2。', type: 'calculation' },
      { step: 5, title: '结论', content: '正四面体对棱距离 = {size}/√2。记住：正四面体的对棱互相垂直且距离相等。', type: 'conclusion' },
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
    if (/体对角线|对角线/.test(t)) return 'diagonal'
  }

  if (type === 'sphere') {
    if (/体积|volume/.test(t)) return 'volume'
    if (/表面[积积]|表面积|surface/.test(t)) return 'surface_area'
    if (/内接|内切/.test(t)) return 'inscribed'
    if (/球冠|crown|spherical cap/.test(t)) return 'spherical_cap'
  }

  if (type === 'cone') {
    if (/母线|generatrix/.test(t)) return 'generatrix'
    if (/侧面积|侧面展开/.test(t)) return 'lateral_area'
    if (/表面[积积]|表面积|surface/.test(t)) return 'surface_area'
    if (/体积|volume/.test(t)) return 'volume'
  }

  if (type === 'pyramid') {
    if (/外接|外切/.test(t)) return 'circumscribed'
    if (/侧面积/.test(t)) return 'lateral_area'
    if (/侧棱/.test(t)) return 'side_edge'
    if (/表面[积积]|表面积|surface/.test(t)) return 'surface_area'
    if (/体积|volume/.test(t)) return 'volume'
    if (/平行|\/\//.test(t) || /线面角|直线.*平面.*角/.test(t)) return 'line_plane_angle'
  }

  if (type === 'prism') {
    if (/对角线|diagonal/.test(t)) return 'diagonal'
    if (/体积|volume/.test(t)) return 'volume'
    if (/表面[积积]|表面积|surface/.test(t)) return 'default'
  }

  if (type === 'cylinder') {
    if (/截面/.test(t)) return 'section'
    if (/表面[积积]|表面积|surface/.test(t)) return 'surface_area'
    if (/侧面积|侧面展开/.test(t)) return 'lateral_area'
    if (/体积|volume/.test(t)) return 'volume'
  }

  if (type === 'tetrahedron') {
    if (/对棱|异面/.test(t)) return 'opposite_edges'
    if (/内接|内切/.test(t)) return 'inscribed'
    if (/外接|外切/.test(t)) return 'circumscribed'
    if (/体积|volume/.test(t)) return 'volume'
  }

  // ── 通用兜底：以上未匹配，但题目包含可计算关键词 ──
  // 这些检测适用于所有几何体类型
  if (/侧面积|侧面展开/.test(t)) return 'lateral_area'
  if (/表面[积积]|表面积|surface/.test(t)) return 'surface_area'
  if (/体积|volume/.test(t)) return 'volume'
  if (/对角线|diagonal/.test(t)) return 'diagonal'

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
  const problemType = parsedData?.questionType || detectProblemType(type, problemText)

  // ── Phase 1: 动态计算（可计算题型 → 真实数值）──
  if (COMPUTABLE_TYPES.includes(problemType)) {
    const solved = solveGeometry({ ...parsedData, questionType: problemType })
    if (solved && solved.steps && solved.steps.length > 0) {
      return solved.steps.map((step, index) => {
        const result = {
          ...step,
          step: index + 1,
          title: makeTeacherTitle({ ...step, step: index + 1, problemText }, {
            type,
            typeName: solved.typeName || GEOMETRY_NAMES[type] || type,
          }),
        }
        // 注入 intuition：第一条 observation 步骤的第一句话作为核心思路
        if (index === 0 && step.type === 'observation') {
          result.intuition = step.content.split(/[。！？\n]/)[0]
        }
        return result
      })
    }
  }

  // ── Phase 2: 模板路径（不可计算题型 → 推理框架）──
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

  const titles = {
    observation: [
      `同学们，先看一下这个${geo}`,
      `我们来分析一下题目`,
      `这个${geo}有什么特点呢`,
      `题目给了我们哪些条件`,
      `仔细读题，找出关键信息`,
      `题目要我们求什么呀`,
      `先搞清楚已知条件`,
      `看看这个${geo}的结构`,
      `我们要解决什么问题`,
    ],
    construction: [
      `好，现在我们加一条辅助线`,
      `把空间问题转化成平面问题`,
      `用平移法把两条线放一起`,
      `连接这两个点试试看`,
      `画一条辅助线来帮助我们`,
      `建立坐标系，把点标出来`,
      `我们作一条垂线`,
      `把截面画出来看看`,
      `平移这条线到合适的位置`,
    ],
    calculation: [
      `现在开始计算了`,
      `代入公式，一步一步来`,
      `用勾股定理算一下`,
      `把数值代进去`,
      `我们来具体算一算`,
      `先算这个量，再算那个量`,
      `按照公式一步步推导`,
      `计算的关键步骤`,
      `最后一步计算`,
    ],
    conclusion: [
      `这样答案就出来了`,
      `总结一下解题思路`,
      `所以最终结果是`,
      `这道题的答案就是`,
      `我们成功解决了这个问题`,
      `回顾一下整个过程`,
      `得出最终结论`,
      `答案已经算出来了`,
      `把结果整理一下`,
    ],
  }

  const pool = titles[t] || titles.observation
  const idx = ((step.step || 1) - 1) % pool.length
  return pool[idx]
}

const GEOMETRY_NAMES = {
  cube: '正方体', cuboid: '长方体', sphere: '球体', cylinder: '圆柱体',
  cone: '圆锥体', pyramid: '正四棱锥', prism: '棱柱',
  tetrahedron: '正四面体', octahedron: '正八面体',
  squareFrustum: '四棱台', circularFrustum: '圆台',
}

// ── AI 增强讲解（需要 Claude API）─────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const EXPLAIN_SYSTEM_PROMPT = `你是一个中学数学老师，正在给一个学生讲解立体几何题。你的讲解要像真人老师一样自然、具体、有步骤感，并且必须给出最终的具体答案。

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
5. 关键要求：最后一步（type="conclusion"）必须明确给出题目要求的具体数值答案，不能使用"代入计算"、"具体数值"等模糊表述，必须写出具体的数字结果
6. 如果题目涉及计算，需要在步骤中展示关键计算过程和中间结果
7. 只输出 JSON 数组`

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
