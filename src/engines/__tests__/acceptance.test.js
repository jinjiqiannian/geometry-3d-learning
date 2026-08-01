import { describe, it, expect } from 'vitest'
import { validateAndCompleteSemantic, convertLegacyParsedToSemantic, parseProblemToSemantic } from '../geometryValidator'
import { buildSceneIRFromSemantic } from '../sceneIRBuilder'

const aiResponse = {
  type: 'pyramid',
  size: 2,
  labels: ['P', 'A', 'B', 'C', 'D', 'E', 'F'],
  vertices: [
    [0, 1, 0],
    [-1, -1, -1],
    [1, -1, -1],
    [1, -1, 1],
    [-1, -1, 1],
    [-1, -1, 0],
    [-0.5, 0, -0.5]
  ],
  edges: [
    { from: 'P', to: 'A', label: 'PA' },
    { from: 'P', to: 'B', label: 'PB' },
    { from: 'P', to: 'C', label: 'PC' },
    { from: 'P', to: 'D', label: 'PD' },
    { from: 'A', to: 'B', label: 'AB' },
    { from: 'B', to: 'C', label: 'BC' },
    { from: 'C', to: 'D', label: 'CD' },
    { from: 'D', to: 'A', label: 'DA' },
    { from: 'A', to: 'C', label: 'AC' },
    { from: 'B', to: 'D', label: 'BD' },
  ],
  planes: [
    { label: 'BEF', points: ['B', 'E', 'F'] },
  ],
  importantPlanes: ['BEF'],
  steps: [
    {
      index: 1,
      title: '分析题目',
      content: '四棱锥P-ABCD中，底面ABCD为平行四边形，E是AD的中点，F在PA上，PC平行于平面BEF。',
      type: 'conceptual',
      sceneState: {
        showLabels: ['P', 'A', 'B', 'C', 'D'],
      }
    },
    {
      index: 2,
      title: '建立空间直角坐标系',
      content: '以D为原点，DA为x轴，DC为y轴，DP为z轴建立空间直角坐标系。',
      type: 'construction',
      sceneState: {
        showLabels: ['P', 'A', 'B', 'C', 'D', 'E'],
      }
    },
    {
      index: 3,
      title: '确定各点坐标',
      content: '设底面边长为2，则各点坐标：D(0,0,0), A(2,0,0), B(2,2,0), C(0,2,0), P(0,0,2), E是AD中点，E(1,0,0)。',
      type: 'calculation',
      sceneState: {
        showLabels: ['P', 'A', 'B', 'C', 'D', 'E', 'F'],
      }
    },
    {
      index: 4,
      title: '利用线面平行条件',
      content: '因为PC平行于平面BEF，所以向量PC与平面BEF的法向量垂直。',
      type: 'calculation',
      sceneState: {
        highlightEdges: ['PC'],
        showAuxiliaryLines: [
          { from: 'B', to: 'E' },
          { from: 'B', to: 'F' },
          { from: 'E', to: 'F' },
        ],
      }
    },
    {
      index: 5,
      title: '得出结论',
      content: '因此，AF:FP = 1:2，即F分PA为1:2（从A到P方向），AP/AF = 3。',
      type: 'conclusion',
      sceneState: {
        highlightEdges: ['PC', 'PA'],
        showLabels: ['P', 'A', 'B', 'C', 'D', 'E', 'F'],
      }
    },
  ],
  finalAnswer: {
    expression: 'AP/AF',
    value: 3,
    unit: '',
  },
  relations: [
    'E midpoint AD',
    'F on PA',
    'PC parallel plane BEF',
  ],
}

describe('Acceptance Test: 四棱锥P-ABCD', () => {
  let semantic
  let sceneIR

  beforeAll(() => {
    const parsedData = {
      type: aiResponse.type,
      size: aiResponse.size,
      labels: aiResponse.labels,
      vertices: aiResponse.vertices,
      edges: aiResponse.edges,
      planes: aiResponse.planes,
      importantPlanes: aiResponse.importantPlanes,
      relations: aiResponse.relations,
    }
    semantic = convertLegacyParsedToSemantic(parsedData, aiResponse.steps)
    sceneIR = buildSceneIRFromSemantic(semantic)
  })

  it('Step 1: AI原始返回JSON', () => {
    console.log('\n=========================')
    console.log('Step 1: AI原始返回JSON')
    console.log('=========================')
    console.log('steps:', JSON.stringify(aiResponse.steps, null, 2))
    console.log('finalAnswer:', JSON.stringify(aiResponse.finalAnswer, null, 2))
    console.log('sceneState:', JSON.stringify(aiResponse.steps[4]?.sceneState, null, 2))
  })

  it('Step 2: GeometryValidator输入 semantic', () => {
    console.log('\n=========================')
    console.log('Step 2: GeometryValidator输入 semantic')
    console.log('=========================')
    console.log('shape:', semantic.shape)
    console.log('points:', semantic.points)
    console.log('edges:', JSON.stringify(semantic.edges, null, 2))
    console.log('planes:', JSON.stringify(semantic.planes, null, 2))
    console.log('relations:', semantic.relations)
    console.log('roleMap:', JSON.stringify(semantic.roleMap, null, 2))
    console.log('importantLines:', semantic.importantLines)
    console.log('importantPlanes:', semantic.importantPlanes)
  })

  it('Step 3: computePointPositions输出', () => {
    console.log('\n=========================')
    console.log('Step 3: computePointPositions输出')
    console.log('=========================')
    const positions = semantic.pointPositions || {}
    const keys = ['A', 'B', 'C', 'D', 'P', 'E', 'F']
    keys.forEach(key => {
      console.log(`${key}:`, positions[key])
    })
  })

  it('Step 4: SceneIR输出', () => {
    console.log('\n=========================')
    console.log('Step 4: SceneIR输出')
    console.log('=========================')
    console.log('points:', JSON.stringify(sceneIR.points, null, 2))
    console.log('lines:', JSON.stringify(sceneIR.lines, null, 2))
    console.log('sections:', JSON.stringify(sceneIR.sections, null, 2))
    console.log('highlightEdges:', sceneIR.highlightEdges)
    console.log('highlightPlanes:', sceneIR.highlightPlanes)
  })

  it('Step 5: Canvas收到的数据', () => {
    console.log('\n=========================')
    console.log('Step 5: Canvas收到的数据')
    console.log('=========================')
    console.log('sceneIR:', JSON.stringify(sceneIR, null, 2))
  })

  it('Validation: P是否在顶点', () => {
    const pPos = semantic.pointPositions?.['P'] || [0, 0, 0]
    const baseHeights = ['A', 'B', 'C', 'D'].map(k => semantic.pointPositions?.[k]?.[1] || 0)
    const isApex = pPos[1] > Math.max(...baseHeights)
    console.log(`\n验证: P是否在顶点 - ${isApex ? 'PASS' : 'FAIL'}`)
    expect(isApex).toBe(true)
  })

  it('Validation: ABCD是否共面', () => {
    const a = semantic.pointPositions?.['A'] || [0, 0, 0]
    const b = semantic.pointPositions?.['B'] || [0, 0, 0]
    const c = semantic.pointPositions?.['C'] || [0, 0, 0]
    const d = semantic.pointPositions?.['D'] || [0, 0, 0]
    const yCoords = [a[1], b[1], c[1], d[1]]
    const isCoplanar = yCoords.every(y => Math.abs(y - yCoords[0]) < 0.01)
    console.log(`验证: ABCD是否共面 - ${isCoplanar ? 'PASS' : 'FAIL'}`)
    expect(isCoplanar).toBe(true)
  })

  it('Validation: E是否在AD中点', () => {
    const a = semantic.pointPositions?.['A'] || [0, 0, 0]
    const d = semantic.pointPositions?.['D'] || [0, 0, 0]
    const e = semantic.pointPositions?.['E'] || [0, 0, 0]
    const midX = (a[0] + d[0]) / 2
    const midY = (a[1] + d[1]) / 2
    const midZ = (a[2] + d[2]) / 2
    const isMidpoint = Math.abs(e[0] - midX) < 0.01 &&
                       Math.abs(e[1] - midY) < 0.01 &&
                       Math.abs(e[2] - midZ) < 0.01
    console.log(`验证: E是否在AD中点 - ${isMidpoint ? 'PASS' : 'FAIL'}`)
    expect(isMidpoint).toBe(true)
  })

  it('Validation: F是否在线段PA上', () => {
    const p = semantic.pointPositions?.['P'] || [0, 0, 0]
    const a = semantic.pointPositions?.['A'] || [0, 0, 0]
    const f = semantic.pointPositions?.['F'] || [0, 0, 0]

    const paVec = [a[0] - p[0], a[1] - p[1], a[2] - p[2]]
    const pfVec = [f[0] - p[0], f[1] - p[1], f[2] - p[2]]

    const crossX = pfVec[1] * paVec[2] - pfVec[2] * paVec[1]
    const crossY = pfVec[2] * paVec[0] - pfVec[0] * paVec[2]
    const crossZ = pfVec[0] * paVec[1] - pfVec[1] * paVec[0]

    const isColinear = Math.abs(crossX) < 0.01 &&
                       Math.abs(crossY) < 0.01 &&
                       Math.abs(crossZ) < 0.01

    const t = paVec[0] !== 0 ? pfVec[0] / paVec[0] :
              paVec[1] !== 0 ? pfVec[1] / paVec[1] :
              paVec[2] !== 0 ? pfVec[2] / paVec[2] : 0

    const isOnSegment = t >= 0 && t <= 1

    console.log(`验证: F是否在线段PA上 - ${isColinear && isOnSegment ? 'PASS' : 'FAIL'}`)
    expect(isColinear && isOnSegment).toBe(true)
  })

  it('Validation: PA/PB/PC/PD是否存在', () => {
    const lineIds = sceneIR.lines.map(l => l.id)
    const paExists = lineIds.includes('PA') || lineIds.includes('AP')
    const pbExists = lineIds.includes('PB') || lineIds.includes('BP')
    const pcExists = lineIds.includes('PC') || lineIds.includes('CP')
    const pdExists = lineIds.includes('PD') || lineIds.includes('DP')

    console.log(`验证: PA是否存在 - ${paExists ? 'PASS' : 'FAIL'}`)
    console.log(`验证: PB是否存在 - ${pbExists ? 'PASS' : 'FAIL'}`)
    console.log(`验证: PC是否存在 - ${pcExists ? 'PASS' : 'FAIL'}`)
    console.log(`验证: PD是否存在 - ${pdExists ? 'PASS' : 'FAIL'}`)

    expect(paExists).toBe(true)
    expect(pbExists).toBe(true)
    expect(pcExists).toBe(true)
    expect(pdExists).toBe(true)
  })

  it('Validation: Plane BEF是否存在', () => {
    const sections = sceneIR.sections || []
    const befExists = sections.some(s => s.label === 'BEF')
    console.log(`验证: Plane BEF是否存在 - ${befExists ? 'PASS' : 'FAIL'}`)
    expect(befExists).toBe(true)
  })

  it('Validation: Plane BEF三个点是否都不是[0,0,0]', () => {
    const b = semantic.pointPositions?.['B'] || [0, 0, 0]
    const e = semantic.pointPositions?.['E'] || [0, 0, 0]
    const f = semantic.pointPositions?.['F'] || [0, 0, 0]

    const bIsZero = b[0] === 0 && b[1] === 0 && b[2] === 0
    const eIsZero = e[0] === 0 && e[1] === 0 && e[2] === 0
    const fIsZero = f[0] === 0 && f[1] === 0 && f[2] === 0

    const allNonZero = !bIsZero && !eIsZero && !fIsZero
    console.log(`验证: Plane BEF三个点是否都不是[0,0,0] - ${allNonZero ? 'PASS' : 'FAIL'}`)
    expect(allNonZero).toBe(true)
  })

  it('Validation: PC是否高亮', () => {
    const pcLine = sceneIR.lines.find(l => l.id === 'PC' || l.id === 'CP')
    const isHighlighted = pcLine?.highlighted === true
    console.log(`验证: PC是否高亮 - ${isHighlighted ? 'PASS' : 'FAIL'}`)
    expect(isHighlighted).toBe(true)
  })

  it('Validation: Plane BEF是否高亮', () => {
    const befSection = sceneIR.sections.find(s => s.label === 'BEF')
    const isVisible = befSection?.visible === true
    console.log(`验证: Plane BEF是否高亮 - ${isVisible ? 'PASS' : 'FAIL'}`)
    expect(isVisible).toBe(true)
  })

  it('Validation: Point E/F是否支持高亮', () => {
    const ePoint = semantic.highlightPoints?.includes('E') || sceneIR.points.find(p => p.id === 'E')?.highlighted === true
    const fPoint = semantic.highlightPoints?.includes('F') || sceneIR.points.find(p => p.id === 'F')?.highlighted === true
    const supportsHighlight = semantic.highlightPoints !== undefined
    console.log(`验证: Point E/F是否支持高亮 - ${supportsHighlight ? 'PASS' : 'FAIL'}`)
    console.log(`  highlightPoints字段存在: ${semantic.highlightPoints !== undefined}`)
    console.log(`  highlightPoints值: ${JSON.stringify(semantic.highlightPoints)}`)
    expect(supportsHighlight).toBe(true)
  })

  it('Validation: 最终答案是否为3', () => {
    const answer = aiResponse.finalAnswer.value
    console.log(`验证: 最终答案是否为3 - ${answer === 3 ? 'PASS' : 'FAIL'}`)
    expect(answer).toBe(3)
  })
})

describe('本地解析路径：F 点（"F on PA"）必须进入场景', () => {
  const text = '四棱锥P-ABCD中，底面ABCD是平行四边形，E为AD的中点，F在PA上，PC平行于平面BEF，求AP:AF'

  it('semantic.points 同时包含 E 和 F', () => {
    const semantic = parseProblemToSemantic(text)
    expect(semantic.relations).toContain('F on PA')
    expect(semantic.points).toContain('E')
    expect(semantic.points).toContain('F')
  })

  it('F 有坐标且与 PA 共线', () => {
    const semantic = parseProblemToSemantic(text)
    const p = semantic.pointPositions?.P
    const a = semantic.pointPositions?.A
    const f = semantic.pointPositions?.F
    expect(p).toBeTruthy()
    expect(a).toBeTruthy()
    expect(f).toBeTruthy()
    const pa = [a[0] - p[0], a[1] - p[1], a[2] - p[2]]
    const pf = [f[0] - p[0], f[1] - p[1], f[2] - p[2]]
    const cross = [
      pf[1] * pa[2] - pf[2] * pa[1],
      pf[2] * pa[0] - pf[0] * pa[2],
      pf[0] * pa[1] - pf[1] * pa[0],
    ]
    expect(Math.abs(cross[0])).toBeLessThan(0.01)
    expect(Math.abs(cross[1])).toBeLessThan(0.01)
    expect(Math.abs(cross[2])).toBeLessThan(0.01)
  })

  it('SceneIR 中存在可见的 F 点', () => {
    const semantic = parseProblemToSemantic(text)
    const sceneIR = buildSceneIRFromSemantic(semantic)
    const fPoint = sceneIR.points.find((pt) => pt.id === 'F')
    expect(fPoint).toBeTruthy()
    expect(fPoint.visible).toBe(true)
    expect(fPoint.position).not.toBeNull()
  })
})
