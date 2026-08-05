const GEOMETRY_NAMES = {
  cube: '正方体',
  cuboid: '长方体',
  pyramid: '正四棱锥',
  prism: '棱柱',
  cylinder: '圆柱',
  cone: '圆锥',
  sphere: '球',
  frustum: '圆台',
}

export function solveGeometry(parsedData) {
  const { type = 'cube', size, params = {} } = parsedData || {}
  const problemType = parsedData?.questionType || 'default'

  switch (type) {
    case 'cube':
      return solveCube(size, params, problemType, type)
    case 'cuboid':
      return solveCuboid(size, params, problemType, type)
    case 'pyramid':
      return solvePyramid(size, params, problemType, type)
    case 'prism':
      return solvePrism(size, params, problemType, type)
    case 'cylinder':
      return solveCylinder(size, params, problemType, type)
    case 'cone':
      return solveCone(size, params, problemType, type)
    case 'sphere':
      return solveSphere(size, params, problemType, type)
    case 'frustum':
    case 'circularFrustum':
      return solveFrustum(size, params, problemType, type)
    default:
      return solveGeneric(type, size, params, problemType)
  }
}

function solveCube(size = 2, params, problemType, type) {
  const a = size || params.size || 2
  const volume = a * a * a
  const surfaceArea = 6 * a * a
  const spaceDiagonal = a * Math.sqrt(3)
  const faceDiagonal = a * Math.sqrt(2)

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '同学们，这是一个正方体',
        content: `正方体的棱长是 ${a}，所有边都一样长。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算底面积',
        content: `底面是正方形，面积等于边长乘边长。S底 = a² = ${a} × ${a} = ${a * a}。`,
        type: 'calculation',
        formula: 'S底 = a²',
      })
      steps.push({
        title: '再算体积',
        content: `正方体体积就是底面积乘高，因为长宽高都一样，所以V = a³。代入a=${a}，V = ${a} × ${a} × ${a}。`,
        type: 'calculation',
        formula: 'V = a³',
      })
      steps.push({
        title: '最终答案',
        content: `算出来了！体积 = ${a}³ = ${volume}。记住：正方体体积就是棱长的立方。`,
        type: 'conclusion',
        formula: 'V = a³',
        finalAnswer: { expression: 'V = a³', value: `${volume}`, unit: '立方单位' },
      })
      formula = 'V = a³'
      answer = volume
      break

    case 'surface_area':
      steps.push({
        title: '这是一个正方体',
        content: `棱长是 ${a}。正方体有6个面，每个面都是正方形，而且都一样大。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '算一个面的面积',
        content: `一个面的面积 = 边长 × 边长 = a² = ${a} × ${a} = ${a * a}。`,
        type: 'calculation',
        formula: 'S = a²',
      })
      steps.push({
        title: '六个面加起来',
        content: `表面积就是6个面的面积总和，所以S全 = 6 × a² = 6 × ${a * a} = ${surfaceArea}。`,
        type: 'calculation',
        formula: 'S全 = 6a²',
      })
      steps.push({
        title: '答案出来了',
        content: `正方体表面积是 ${surfaceArea}。记住：正方体表面积等于6倍一个面的面积。`,
        type: 'conclusion',
        formula: 'S全 = 6a²',
        finalAnswer: { expression: 'S全 = 6a²', value: `${surfaceArea}`, unit: '平方单位' },
      })
      formula = 'S全 = 6a²'
      answer = surfaceArea
      break

    case 'diagonal':
      steps.push({
        title: '正方体的对角线',
        content: `棱长是 ${a}。正方体有面对角线和体对角线两种。面对角线在一个面上，体对角线穿过正方体内部。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算面对角线',
        content: `面对角线就是正方形的对角线，用勾股定理算：d面 = √(a² + a²) = √(2a²) = a√2 = ${a}√2。`,
        type: 'calculation',
        formula: 'd面 = a√2',
      })
      steps.push({
        title: '再算体对角线',
        content: `体对角线是面对角线和一条棱组成的直角三角形的斜边，所以d体 = √(d面² + a²) = √(2a² + a²) = √(3a²) = a√3 = ${a}√3。`,
        type: 'calculation',
        formula: 'd体 = a√3',
      })
      steps.push({
        title: '总结一下',
        content: `答案：面对角线是 ${a}√2，体对角线是 ${a}√3。记住这两个常用结论！`,
        type: 'conclusion',
        formula: 'd体 = a√3',
        finalAnswer: { expression: 'd体 = a√3', value: `${a}√3`, unit: '长度单位' },
      })
      formula = 'd体 = a√3'
      answer = spaceDiagonal
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solveCuboid(size, params, problemType, type) {
  // 优先长宽高；勿用单独抽到的「高」盖掉长宽
  const a = params.a ?? params.length ?? size ?? params.size ?? 2
  const b = params.b ?? params.width ?? a
  const c = params.c ?? params.height ?? params.depth ?? a

  const volume = a * b * c
  const surfaceArea = 2 * (a * b + b * c + a * c)
  const spaceDiagonal = Math.sqrt(a * a + b * b + c * c)

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '这是一个长方体',
        content: `长方体有长、宽、高三个维度：长a=${a}，宽b=${b}，高c=${c}。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算底面积',
        content: `底面是长方形，面积 = 长 × 宽 = a × b = ${a} × ${b} = ${a * b}。`,
        type: 'calculation',
        formula: 'S底 = ab',
      })
      steps.push({
        title: '再算体积',
        content: `长方体体积 = 底面积 × 高 = a × b × c。代入数值：V = ${a} × ${b} × ${c}。`,
        type: 'calculation',
        formula: 'V = abc',
      })
      steps.push({
        title: '最终答案',
        content: `算出来了！体积 = ${a} × ${b} × ${c} = ${volume}。长方体体积就是长宽高相乘。`,
        type: 'conclusion',
        formula: 'V = abc',
        finalAnswer: { expression: 'V = abc', value: `${volume}`, unit: '立方单位' },
      })
      formula = 'V = abc'
      answer = volume
      break

    case 'surface_area':
      steps.push({
        title: '长方体的表面积',
        content: `长方体有6个面，分成三组对面：前面和后面、左面和右面、上面和下面。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '算每组对面的面积',
        content: `前面后面：长×高×2 = ${a * c}×2；左面右面：宽×高×2 = ${b * c}×2；上面下面：长×宽×2 = ${a * b}×2。`,
        type: 'calculation',
        formula: '',
      })
      steps.push({
        title: '加起来就是表面积',
        content: `表面积 = 2(ab + bc + ac) = 2(${a * b} + ${b * c} + ${a * c}) = ${surfaceArea}。`,
        type: 'calculation',
        formula: 'S全 = 2(ab + bc + ac)',
      })
      steps.push({
        title: '答案',
        content: `长方体表面积是 ${surfaceArea}。记住：长方体表面积等于2倍的（长×宽+宽×高+长×高）。`,
        type: 'conclusion',
        formula: 'S全 = 2(ab + bc + ac)',
        finalAnswer: { expression: 'S全 = 2(ab + bc + ac)', value: `${surfaceArea}`, unit: '平方单位' },
      })
      formula = 'S全 = 2(ab + bc + ac)'
      answer = surfaceArea
      break

    case 'diagonal':
      steps.push({
        title: '长方体的体对角线',
        content: `体对角线是连接长方体最远两个顶点的线段，穿过长方体内部。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '三维勾股定理',
        content: `长方体体对角线公式：d = √(长² + 宽² + 高²) = √(a² + b² + c²)。`,
        type: 'calculation',
        formula: 'd = √(a² + b² + c²)',
      })
      steps.push({
        title: '代入数值',
        content: `代入a=${a}，b=${b}，c=${c}：d = √(${a}² + ${b}² + ${c}²) = √(${a * a + b * b + c * c})。`,
        type: 'calculation',
        formula: '',
      })
      steps.push({
        title: '结论',
        content: `体对角线长度是 √(${a * a + b * b + c * c})。这就是三维空间的勾股定理！`,
        type: 'conclusion',
        formula: 'd = √(a² + b² + c²)',
        finalAnswer: { expression: 'd = √(a² + b² + c²)', value: `√(${a * a + b * b + c * c})`, unit: '长度单位' },
      })
      formula = 'd = √(a² + b² + c²)'
      answer = spaceDiagonal
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solvePyramid(size, params, problemType, type) {
  const a = size || (params?.size || 4)
  const h = (params?.height || params?.h || 6)

  const baseArea = a * a
  const volume = (1 / 3) * baseArea * h
  const slantHeight = Math.sqrt(h * h + (a / 2) * (a / 2))
  const lateralArea = 4 * (1 / 2) * a * slantHeight
  const surfaceArea = baseArea + lateralArea

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '这是一个正四棱锥',
        content: `底面是正方形，边长a=${a}，顶点在底面中心的正上方，高h=${h}。像一个金字塔。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算底面积',
        content: `底面是正方形，面积 = 边长 × 边长 = a² = ${a} × ${a} = ${baseArea}。`,
        type: 'calculation',
        formula: 'S底 = a²',
      })
      steps.push({
        title: '棱锥体积公式',
        content: `记住：棱锥体积 = ⅓ × 底面积 × 高。不管什么棱锥，这个公式都适用！`,
        type: 'calculation',
        formula: 'V = ⅓S底h',
      })
      steps.push({
        title: '代入计算',
        content: `V = ⅓ × ${baseArea} × ${h} = ${volume}。`,
        type: 'conclusion',
        formula: 'V = ⅓S底h',
        finalAnswer: { expression: 'V = ⅓S底h', value: `${volume}`, unit: '立方单位' },
      })
      formula = 'V = ⅓S底h'
      answer = volume
      break

    case 'lateral_area':
      steps.push({
        title: '正四棱锥的侧面',
        content: `底面边长a=${a}，高h=${h}。侧面是4个全等的等腰三角形，我们需要先算斜高。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '什么是斜高',
        content: `斜高就是侧面等腰三角形底边上的高。它和棱锥的高h、底面边长的一半构成直角三角形。`,
        type: 'calculation',
        formula: 'h\' = √(h² + (a/2)²)',
      })
      steps.push({
        title: '算斜高',
        content: `斜高h' = √(h² + (a/2)²) = √(${h}² + (${a}/2)²) = √(${h * h + (a / 2) * (a / 2)})。`,
        type: 'calculation',
        formula: '',
      })
      steps.push({
        title: '算侧面积',
        content: `一个侧面面积 = ½ × 底边 × 斜高，4个侧面就是2 × a × h' = 2 × ${a} × √(${h * h + (a / 2) * (a / 2)})。`,
        type: 'calculation',
        formula: 'S侧 = 2ah\'',
      })
      steps.push({
        title: '结论',
        content: `侧面积是 ${a}√(${h * h * 4 + a * a})。记住：侧面积等于底面周长乘斜高的一半。`,
        type: 'conclusion',
        formula: 'S侧 = 2ah\'',
        finalAnswer: { expression: 'S侧 = 2ah\'', value: `${a}√(${h * h * 4 + a * a})`, unit: '平方单位' },
      })
      formula = 'S侧 = 2ah\''
      answer = lateralArea
      break

    case 'surface_area':
      steps.push({
        title: '求表面积',
        content: `表面积 = 侧面积 + 底面积。我们先算底面积，再算侧面积。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '底面积',
        content: `底面是正方形，面积 = a² = ${a}² = ${baseArea}。`,
        type: 'calculation',
        formula: 'S底 = a²',
      })
      steps.push({
        title: '侧面积',
        content: `斜高h' = √(${h * h + (a / 2) * (a / 2)})，侧面积 = 2ah' = ${a}√(${h * h * 4 + a * a})。`,
        type: 'calculation',
        formula: 'S侧 = 2ah\'',
      })
      steps.push({
        title: '加起来',
        content: `表面积 = 底面积 + 侧面积 = ${baseArea} + ${a}√(${h * h * 4 + a * a}) = ${a}² + ${a}√(${h * h * 4 + a * a})。`,
        type: 'calculation',
        formula: 'S全 = S底 + S侧',
      })
      steps.push({
        title: '答案',
        content: `正四棱锥表面积是 ${a}² + ${a}√(${h * h * 4 + a * a})。`,
        type: 'conclusion',
        formula: 'S全 = S底 + S侧',
        finalAnswer: { expression: 'S全 = S底 + S侧', value: `${a}² + ${a}√(${h * h * 4 + a * a})`, unit: '平方单位' },
      })
      formula = 'S全 = S底 + S侧'
      answer = surfaceArea
      break

    case 'side_edge':
      const sideEdge = Math.sqrt(h * h + (a / 2) * (a / 2) * 2)
      steps.push({
        title: '求侧棱长度',
        content: `侧棱是从顶点P到底面顶点A的连线PA。我们可以用勾股定理来算。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '找直角三角形',
        content: `侧棱PA、高PO、底面中心到顶点的距离OA构成直角三角形。OA是底面正方形中心到顶点的距离。`,
        type: 'calculation',
        formula: 'OA = a√2/2',
      })
      steps.push({
        title: '算OA',
        content: `底面正方形中心到顶点的距离OA = 面对角线的一半 = √2 × (a/2) = ${a}√2/2。`,
        type: 'calculation',
        formula: '',
      })
      steps.push({
        title: '用勾股定理算PA',
        content: `PA = √(PO² + OA²) = √(${h}² + (${a}√2/2)²) = √(${h * h + a * a / 2})。`,
        type: 'calculation',
        formula: 'PA = √(h² + (a√2/2)²)',
      })
      steps.push({
        title: '答案',
        content: `侧棱PA长度是 √(${h * h + a * a / 2})。`,
        type: 'conclusion',
        formula: 'PA = √(h² + (a√2/2)²)',
        finalAnswer: { expression: 'PA = √(h² + (a√2/2)²)', value: `√(${h * h + a * a / 2})`, unit: '长度单位' },
      })
      formula = 'PA = √(h² + (a√2/2)²)'
      answer = sideEdge
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solvePrism(size, params, problemType, type) {
  const a = size || params.size || 4
  const h = params.height || params.h || 6

  const baseArea = a * a
  const volume = baseArea * h

  const steps = []
  let formula = ''
  let answer = null

  const faceDiagonal = Math.sqrt(2) * a
  const bodyDiagonal = Math.sqrt(faceDiagonal * faceDiagonal + h * h)

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '识别棱柱',
        content: `这是一个棱柱，底面是正方形，边长 a = ${a}，棱柱的高 h = ${h}。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '计算底面积',
        content: `底面积公式：S底 = a² = ${a}² = ${baseArea}。`,
        type: 'calculation',
        formula: 'S底 = a²',
      })
      steps.push({
        title: '代入体积公式',
        content: `棱柱的体积公式：V = S底 × h。将 S底 = ${baseArea} 和 h = ${h} 代入：V = ${baseArea} × ${h}。`,
        type: 'calculation',
        formula: 'V = S底 × h',
      })
      steps.push({
        title: '计算最终结果',
        content: `计算得：V = ${baseArea} × ${h} = ${volume}。答案：${volume}。`,
        type: 'conclusion',
        formula: 'V = S底 × h',
        finalAnswer: { expression: 'V = S底 × h', value: `${volume}`, unit: '立方单位' },
      })
      formula = 'V = S底 × h'
      answer = volume
      break

    case 'diagonal':
      steps.push({
        title: '识别棱柱',
        content: `这是一个直角棱柱，底面是正方形，边长 a = ${a}，高 h = ${h}。体对角线连接上下底面最远的两个顶点。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '求底面对角线',
        content: `底面对角线公式：d底 = √(a² + a²) = a√2。`,
        type: 'calculation',
        formula: 'd底 = a√2',
      })
      steps.push({
        title: '求体对角线',
        content: `体对角线公式：d体 = √(d底² + h²) = √(2a² + h²) = √(${2 * a * a + h * h})。`,
        type: 'calculation',
        formula: 'd体 = √(2a² + h²)',
      })
      steps.push({
        title: '得出结论',
        content: `棱柱的体对角线长度为 √(${2 * a * a + h * h})。答案：√(${2 * a * a + h * h})。`,
        type: 'conclusion',
        formula: 'd体 = √(2a² + h²)',
        finalAnswer: { expression: 'd体 = √(2a² + h²)', value: `√(${2 * a * a + h * h})`, unit: '长度单位' },
      })
      formula = 'd体 = √(2a² + h²)'
      answer = bodyDiagonal
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solveCylinder(size, params, problemType, type) {
  const r = size || params.radius || params.size || 2
  const h = params.height || params.h || 6

  const baseArea = Math.PI * r * r
  const volume = baseArea * h
  const lateralArea = 2 * Math.PI * r * h
  const surfaceArea = 2 * baseArea + lateralArea

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '这是一个圆柱',
        content: `底面半径r=${r}，高h=${h}。圆柱有两个圆形底面，上下一样大。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算底面积',
        content: `圆的面积公式：S底 = πr²。代入r=${r}，得S底 = π × ${r}² = ${r * r}π。`,
        type: 'calculation',
        formula: 'S底 = πr²',
      })
      steps.push({
        title: '圆柱体积公式',
        content: `圆柱体积 = 底面积 × 高 = πr²h。这和长方体体积公式类似！`,
        type: 'calculation',
        formula: 'V = πr²h',
      })
      steps.push({
        title: '代入计算',
        content: `V = π × ${r}² × ${h} = ${r * r * h}π。`,
        type: 'conclusion',
        formula: 'V = πr²h',
        finalAnswer: { expression: 'V = πr²h', value: `${r * r * h}π`, unit: '立方单位' },
      })
      formula = 'V = πr²h'
      answer = volume
      break

    case 'lateral_area':
      steps.push({
        title: '圆柱的侧面',
        content: `底面半径r=${r}，高h=${h}。把圆柱侧面剪开铺平，会得到一个长方形！`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '长方形的长和宽',
        content: `长方形的长就是底面圆的周长：C = 2πr = 2π × ${r} = ${2 * r}π。宽就是圆柱的高h=${h}。`,
        type: 'calculation',
        formula: 'C = 2πr',
      })
      steps.push({
        title: '算侧面积',
        content: `侧面积 = 长 × 宽 = 底面周长 × 高 = 2πrh = 2π × ${r} × ${h} = ${2 * r * h}π。`,
        type: 'calculation',
        formula: 'S侧 = 2πrh',
      })
      steps.push({
        title: '结论',
        content: `侧面积是 ${2 * r * h}π。记住：圆柱侧面积等于底面周长乘高。`,
        type: 'conclusion',
        formula: 'S侧 = 2πrh',
        finalAnswer: { expression: 'S侧 = 2πrh', value: `${2 * r * h}π`, unit: '平方单位' },
      })
      formula = 'S侧 = 2πrh'
      answer = lateralArea
      break

    case 'surface_area':
      steps.push({
        title: '圆柱表面积',
        content: `表面积 = 侧面积 + 两个底面积。我们一步步来算。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '底面积',
        content: `一个底面面积 = πr² = π × ${r}² = ${r * r}π，两个就是2πr² = ${2 * r * r}π。`,
        type: 'calculation',
        formula: 'S底 = πr²',
      })
      steps.push({
        title: '侧面积',
        content: `侧面积 = 2πrh = 2π × ${r} × ${h} = ${2 * r * h}π。`,
        type: 'calculation',
        formula: 'S侧 = 2πrh',
      })
      steps.push({
        title: '加起来',
        content: `表面积 = 2S底 + S侧 = 2πr² + 2πrh = 2πr(r + h) = 2π × ${r} × (${r} + ${h}) = ${2 * r * (r + h)}π。`,
        type: 'calculation',
        formula: 'S全 = 2πr(r + h)',
      })
      steps.push({
        title: '答案',
        content: `圆柱表面积是 ${2 * r * (r + h)}π。`,
        type: 'conclusion',
        formula: 'S全 = 2πr(r + h)',
        finalAnswer: { expression: 'S全 = 2πr(r + h)', value: `${2 * r * (r + h)}π`, unit: '平方单位' },
      })
      formula = 'S全 = 2πr(r + h)'
      answer = surfaceArea
      break

    case 'section':
      const sectionArea = 2 * r * h
      steps.push({
        title: '圆柱的截面',
        content: `过圆柱上下底面中心切一刀，切出来的是什么形状？是一个长方形！`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '截面的尺寸',
        content: `这个长方形的一边是圆柱的高h=${h}，另一边是底面的直径2r=${2 * r}。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '算截面面积',
        content: `截面面积 = 长 × 宽 = 直径 × 高 = 2r × h = ${2 * r} × ${h} = ${sectionArea}。`,
        type: 'calculation',
        formula: 'S截面 = 2rh',
      })
      steps.push({
        title: '结论',
        content: `过圆柱轴线的截面面积是 ${2 * r * h}。记住：截面是长方形，面积等于直径乘高。`,
        type: 'conclusion',
        formula: 'S截面 = 2rh',
        finalAnswer: { expression: 'S截面 = 2rh', value: `${2 * r * h}`, unit: '平方单位' },
      })
      formula = 'S截面 = 2rh'
      answer = sectionArea
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solveCone(size, params, problemType, type) {
  const r = size || params.radius || params.size || 2
  const h = params.height || params.h || 6

  const slantHeight = Math.sqrt(r * r + h * h)
  const baseArea = Math.PI * r * r
  const volume = (1 / 3) * baseArea * h
  const lateralArea = Math.PI * r * slantHeight
  const surfaceArea = baseArea + lateralArea

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '这是一个圆锥',
        content: `底面半径r=${r}，高h=${h}。圆锥像一个冰淇淋蛋筒，底面是圆，顶点在底面中心正上方。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算底面积',
        content: `圆的面积公式：S底 = πr² = π × ${r}² = ${r * r}π。`,
        type: 'calculation',
        formula: 'S底 = πr²',
      })
      steps.push({
        title: '圆锥体积公式',
        content: `记住：圆锥体积 = ⅓ × 底面积 × 高 = ⅓πr²h。它是等底等高圆柱体积的三分之一！`,
        type: 'calculation',
        formula: 'V = ⅓πr²h',
      })
      steps.push({
        title: '代入计算',
        content: `V = ⅓ × π × ${r}² × ${h} = ${r * r * h / 3}π。`,
        type: 'conclusion',
        formula: 'V = ⅓πr²h',
        finalAnswer: { expression: 'V = ⅓πr²h', value: `${r * r * h / 3}π`, unit: '立方单位' },
      })
      formula = 'V = ⅓πr²h'
      answer = volume
      break

    case 'lateral_area':
      steps.push({
        title: '圆锥的侧面',
        content: `底面半径r=${r}，高h=${h}。把圆锥侧面剪开展平，会得到一个扇形！`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先求母线长',
        content: `母线是从顶点到底面边缘的斜线，它和半径r、高h构成直角三角形。母线长l = √(r² + h²) = √(${r}² + ${h}²) = √(${r * r + h * h})。`,
        type: 'calculation',
        formula: 'l = √(r² + h²)',
      })
      steps.push({
        title: '侧面积公式',
        content: `扇形面积 = ½ × 弧长 × 半径。弧长就是底面周长2πr，半径就是母线l，所以侧面积S侧 = πrl。`,
        type: 'calculation',
        formula: 'S侧 = πrl',
      })
      steps.push({
        title: '代入计算',
        content: `S侧 = π × ${r} × √(${r * r + h * h}) = ${r}π√(${r * r + h * h})。`,
        type: 'conclusion',
        formula: 'S侧 = πrl',
        finalAnswer: { expression: 'S侧 = πrl', value: `${r}π√(${r * r + h * h})`, unit: '平方单位' },
      })
      formula = 'S侧 = πrl'
      answer = lateralArea
      break

    case 'surface_area':
      steps.push({
        title: '圆锥表面积',
        content: `表面积 = 侧面积 + 底面积。先算母线长，再算侧面积。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '母线长',
        content: `母线l = √(r² + h²) = √(${r * r + h * h})。`,
        type: 'calculation',
        formula: 'l = √(r² + h²)',
      })
      steps.push({
        title: '底面积和侧面积',
        content: `底面积S底 = πr² = ${r * r}π，侧面积S侧 = πrl = ${r}π√(${r * r + h * h})。`,
        type: 'calculation',
        formula: 'S底 = πr², S侧 = πrl',
      })
      steps.push({
        title: '加起来',
        content: `表面积 = S底 + S侧 = πr² + πrl = πr(r + l) = ${r}π(${r} + √(${r * r + h * h}))。`,
        type: 'calculation',
        formula: 'S全 = πr(r + l)',
      })
      steps.push({
        title: '答案',
        content: `圆锥表面积是 ${r}π(${r} + √(${r * r + h * h}))。`,
        type: 'conclusion',
        formula: 'S全 = πr(r + l)',
        finalAnswer: { expression: 'S全 = πr(r + l)', value: `${r}π(${r} + √(${r * r + h * h}))`, unit: '平方单位' },
      })
      formula = 'S全 = πr(r + l)'
      answer = surfaceArea
      break

    case 'generatrix':
      steps.push({
        title: '什么是母线',
        content: `母线就是从圆锥顶点到底面圆周上任意一点的连线。圆锥有无数条母线，长度都相等。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '母线和半径、高的关系',
        content: `母线l、底面半径r、高h正好构成直角三角形，母线是斜边！`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '用勾股定理算',
        content: `l = √(r² + h²) = √(${r}² + ${h}²) = √(${r * r + h * h})。`,
        type: 'calculation',
        formula: 'l = √(r² + h²)',
      })
      steps.push({
        title: '结论',
        content: `母线长是 √(${r * r + h * h})。母线很重要，算侧面积和表面积都需要它！`,
        type: 'conclusion',
        formula: 'l = √(r² + h²)',
        finalAnswer: { expression: 'l = √(r² + h²)', value: `√(${r * r + h * h})`, unit: '长度单位' },
      })
      formula = 'l = √(r² + h²)'
      answer = slantHeight
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solveSphere(size, params, problemType, type) {
  const r = size || params.radius || params.size || 2

  const volume = (4 / 3) * Math.PI * r * r * r
  const surfaceArea = 4 * Math.PI * r * r

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '这是一个球',
        content: `半径r=${r}。球体很简单，所有表面上的点到球心的距离都等于半径。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '球的体积公式',
        content: `球的体积公式：V = (4/3)πr³。记住这个公式！`,
        type: 'calculation',
        formula: 'V = (4/3)πr³',
      })
      steps.push({
        title: '代入计算',
        content: `V = (4/3) × π × ${r}³ = ${4 * r * r * r / 3}π。`,
        type: 'conclusion',
        formula: 'V = (4/3)πr³',
        finalAnswer: { expression: 'V = (4/3)πr³', value: `${4 * r * r * r / 3}π`, unit: '立方单位' },
      })
      formula = 'V = (4/3)πr³'
      answer = volume
      break

    case 'surface_area':
      steps.push({
        title: '球的表面积',
        content: `半径r=${r}。球只有一个表面，我们来算它的面积。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '表面积公式',
        content: `球的表面积公式：S = 4πr²。记住：表面积是半径平方的4π倍。`,
        type: 'calculation',
        formula: 'S = 4πr²',
      })
      steps.push({
        title: '代入计算',
        content: `S = 4 × π × ${r}² = ${4 * r * r}π。`,
        type: 'conclusion',
        formula: 'S = 4πr²',
        finalAnswer: { expression: 'S = 4πr²', value: `${4 * r * r}π`, unit: '平方单位' },
      })
      formula = 'S = 4πr²'
      answer = surfaceArea
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solveFrustum(size, params, problemType, type) {
  const R = size || params.R || params.upperRadius || 4
  const r = params.r || params.lowerRadius || 2
  const h = params.height || params.h || 6

  const slantHeight = Math.sqrt(h * h + (R - r) * (R - r))
  const volume = (1 / 3) * Math.PI * h * (R * R + R * r + r * r)
  const lateralArea = Math.PI * (R + r) * slantHeight
  const surfaceArea = lateralArea + Math.PI * (R * R + r * r)

  const steps = []
  let formula = ''
  let answer = null

  switch (problemType) {
    case 'volume':
    default:
      steps.push({
        title: '这是一个圆台',
        content: `圆台就是把圆锥顶部切掉剩下的部分。上底面半径R=${R}，下底面半径r=${r}，高h=${h}。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '圆台体积公式',
        content: `圆台体积公式：V = ⅓πh(R² + Rr + r²)。记住这个公式，台体体积都这么算！`,
        type: 'calculation',
        formula: 'V = ⅓πh(R² + Rr + r²)',
      })
      steps.push({
        title: '代入计算',
        content: `V = ⅓ × π × ${h} × (${R}² + ${R}×${r} + ${r}²) = ${h * (R * R + R * r + r * r) / 3}π。`,
        type: 'conclusion',
        formula: 'V = ⅓πh(R² + Rr + r²)',
        finalAnswer: { expression: 'V = ⅓πh(R² + Rr + r²)', value: `${h * (R * R + R * r + r * r) / 3}π`, unit: '立方单位' },
      })
      formula = 'V = ⅓πh(R² + Rr + r²)'
      answer = volume
      break

    case 'lateral_area':
      steps.push({
        title: '圆台的侧面',
        content: `上底面半径R=${R}，下底面半径r=${r}，高h=${h}。圆台侧面展开是一个扇环。`,
        type: 'observation',
        formula: '',
      })
      steps.push({
        title: '先算母线长',
        content: `母线长l = √(h² + (R-r)²) = √(${h}² + (${R} - ${r})²) = √(${h * h + (R - r) * (R - r)})。`,
        type: 'calculation',
        formula: 'l = √(h² + (R - r)²)',
      })
      steps.push({
        title: '侧面积公式',
        content: `侧面积公式：S侧 = π(R + r)l。就是π乘以上下底面半径之和再乘以母线长。`,
        type: 'calculation',
        formula: 'S侧 = π(R + r)l',
      })
      steps.push({
        title: '代入计算',
        content: `S侧 = π × (${R} + ${r}) × √(${h * h + (R - r) * (R - r)}) = (${R + r})π√(${h * h + (R - r) * (R - r)})。`,
        type: 'conclusion',
        formula: 'S侧 = π(R + r)l',
        finalAnswer: { expression: 'S侧 = π(R + r)l', value: `(${R + r})π√(${h * h + (R - r) * (R - r)})`, unit: '平方单位' },
      })
      formula = 'S侧 = π(R + r)l'
      answer = lateralArea
      break
  }

  return { steps, formula, answer, typeName: GEOMETRY_NAMES[type] }
}

function solveGeneric(type, size, params, problemType) {
  const typeName = GEOMETRY_NAMES[type] || type

  return {
    steps: [
      {
        title: '识别几何体',
        content: `这是一个${typeName}。已知参数：${Object.entries({ size, ...params }).map(([k, v]) => `${k}=${v}`).join(', ')}。`,
        type: 'observation',
        formula: '',
      },
      {
        title: '分析题目要求',
        content: `题目要求计算${problemType === 'volume' ? '体积' : problemType === 'surface_area' ? '表面积' : problemType === 'lateral_area' ? '侧面积' : '相关量'}。`,
        type: 'observation',
        formula: '',
      },
      {
        title: '应用公式',
        content: `根据${typeName}的计算公式进行求解。`,
        type: 'calculation',
        formula: '',
      },
      {
        title: '得出结论',
        content: `计算完成。请参考教材或使用AI模式获取更详细的解答。`,
        type: 'conclusion',
        formula: '',
      },
    ],
    formula: '',
    answer: null,
    typeName,
  }
}

export function verifyAnswer(parsedData, generatedSteps) {
  if (!parsedData || !generatedSteps || generatedSteps.length === 0) {
    return { verified: false, correctAnswer: null, generatedAnswer: null, match: null }
  }

  const solved = solveGeometry(parsedData)
  const correctAnswer = solved.answer

  const conclusionStep = generatedSteps.find(s => s.type === 'conclusion')
  if (!conclusionStep) {
    return { verified: false, correctAnswer, generatedAnswer: null, match: null }
  }

  const answerMatch = conclusionStep.content.match(/答案：([\d.π√]+)/)
  const generatedAnswer = answerMatch ? parseFloat(answerMatch[1]) : null

  let match = null
  if (correctAnswer != null && generatedAnswer != null) {
    match = Math.abs(correctAnswer - generatedAnswer) < 0.01
  }

  return {
    verified: true,
    correctAnswer,
    generatedAnswer,
    match,
  }
}
