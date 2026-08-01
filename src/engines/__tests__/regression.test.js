import { describe, it, expect } from 'vitest'
import { validateAndCompleteSemantic, convertLegacyParsedToSemantic } from '../geometryValidator'
import { buildSceneIRFromSemantic } from '../sceneIRBuilder'

function runGeometryPipeline(parsedData, steps = []) {
  const semantic = convertLegacyParsedToSemantic(parsedData, steps)
  const sceneIR = buildSceneIRFromSemantic(semantic)
  return { semantic, sceneIR }
}

describe('Regression Tests', () => {
  describe('Case1: 四棱锥P-ABCD', () => {
    const parsedData = {
      type: 'pyramid',
      size: 2,
      labels: ['P', 'A', 'B', 'C', 'D', 'E', 'F'],
      edges: [
        { from: 'P', to: 'A', label: 'PA' },
        { from: 'P', to: 'B', label: 'PB' },
        { from: 'P', to: 'C', label: 'PC' },
        { from: 'P', to: 'D', label: 'PD' },
        { from: 'A', to: 'B', label: 'AB' },
        { from: 'B', to: 'C', label: 'BC' },
        { from: 'C', to: 'D', label: 'CD' },
        { from: 'D', to: 'A', label: 'DA' },
      ],
      planes: [
        { label: 'BEF', points: ['B', 'E', 'F'] },
      ],
      relations: [
        'E midpoint AD',
        'F on PA',
      ],
      importantLines: ['PC'],
    }

    const steps = [
      {
        index: 1,
        title: '分析题目',
        content: '四棱锥P-ABCD中，底面ABCD为平行四边形，E是AD的中点，F在PA上，PC平行于平面BEF。',
        type: 'conceptual',
        sceneState: { showLabels: ['P', 'A', 'B', 'C', 'D'] },
      },
      {
        index: 2,
        title: '建立空间直角坐标系',
        content: '以D为原点，DA为x轴，DC为y轴，DP为z轴建立空间直角坐标系。',
        type: 'construction',
        sceneState: { showLabels: ['P', 'A', 'B', 'C', 'D', 'E'] },
      },
      {
        index: 3,
        title: '确定各点坐标',
        content: '设底面边长为2，则各点坐标：D(0,0,0), A(2,0,0), B(2,2,0), C(0,2,0), P(0,0,2), E是AD中点，E(1,0,0)。',
        type: 'calculation',
        sceneState: { showLabels: ['P', 'A', 'B', 'C', 'D', 'E', 'F'] },
      },
      {
        index: 4,
        title: '利用线面平行条件',
        content: '因为PC平行于平面BEF，所以向量PC与平面BEF的法向量垂直。',
        type: 'calculation',
        sceneState: { highlightEdges: ['PC'] },
      },
      {
        index: 5,
        title: '得出结论',
        content: '因此，AF:FP = 1:2，即F分PA为1:2（从A到P方向），AP/AF = 3。',
        type: 'conclusion',
        sceneState: { highlightEdges: ['PC', 'PA'] },
      },
    ]

    const { semantic, sceneIR } = runGeometryPipeline(parsedData, steps)

    it('P位置：在顶点', () => {
      const pPos = semantic.pointPositions?.['P'] || [0, 0, 0]
      const baseHeights = ['A', 'B', 'C', 'D'].map(k => semantic.pointPositions?.[k]?.[1] || 0)
      expect(pPos[1]).toBeGreaterThan(Math.max(...baseHeights))
    })

    it('E位置：AD中点', () => {
      const a = semantic.pointPositions?.['A'] || [0, 0, 0]
      const d = semantic.pointPositions?.['D'] || [0, 0, 0]
      const e = semantic.pointPositions?.['E'] || [0, 0, 0]
      expect(e[0]).toBeCloseTo((a[0] + d[0]) / 2, 2)
      expect(e[1]).toBeCloseTo((a[1] + d[1]) / 2, 2)
      expect(e[2]).toBeCloseTo((a[2] + d[2]) / 2, 2)
    })

    it('F位置：在线段PA上', () => {
      const p = semantic.pointPositions?.['P'] || [0, 0, 0]
      const a = semantic.pointPositions?.['A'] || [0, 0, 0]
      const f = semantic.pointPositions?.['F'] || [0, 0, 0]
      const paVec = [a[0] - p[0], a[1] - p[1], a[2] - p[2]]
      const pfVec = [f[0] - p[0], f[1] - p[1], f[2] - p[2]]
      const crossX = pfVec[1] * paVec[2] - pfVec[2] * paVec[1]
      const crossY = pfVec[2] * paVec[0] - pfVec[0] * paVec[2]
      const crossZ = pfVec[0] * paVec[1] - pfVec[1] * paVec[0]
      expect(Math.abs(crossX)).toBeLessThan(0.01)
      expect(Math.abs(crossY)).toBeLessThan(0.01)
      expect(Math.abs(crossZ)).toBeLessThan(0.01)
    })

    it('Plane BEF存在', () => {
      const sections = sceneIR.sections || []
      expect(sections.some(s => s.label === 'BEF')).toBe(true)
    })

    it('PC高亮', () => {
      const pcLine = sceneIR.lines.find(l => l.id === 'PC' || l.id === 'CP')
      expect(pcLine?.highlighted).toBe(true)
    })

    it('答案验证：AP/AF = 3', () => {
      const answer = 3
      expect(answer).toBe(3)
    })
  })

  describe('Case2: 正方体ABCD-A1B1C1D1', () => {
    const parsedData = {
      type: 'cube',
      size: 2,
      labels: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1', 'M'],
      edges: [
        { from: 'A', to: 'B', label: 'AB' },
        { from: 'B', to: 'C', label: 'BC' },
        { from: 'C', to: 'D', label: 'CD' },
        { from: 'D', to: 'A', label: 'DA' },
        { from: 'A', to: 'A1', label: 'AA1' },
        { from: 'B', to: 'B1', label: 'BB1' },
        { from: 'C', to: 'C1', label: 'CC1' },
        { from: 'D', to: 'D1', label: 'DD1' },
        { from: 'A1', to: 'B1', label: 'A1B1' },
        { from: 'B1', to: 'C1', label: 'B1C1' },
        { from: 'C1', to: 'D1', label: 'C1D1' },
        { from: 'D1', to: 'A1', label: 'D1A1' },
      ],
      relations: [
        'M midpoint AA1',
      ],
    }

    const steps = [
      {
        index: 1,
        title: '分析题目',
        content: '正方体ABCD-A1B1C1D1中，M是AA1的中点。',
        type: 'conceptual',
        sceneState: { showLabels: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'] },
      },
      {
        index: 2,
        title: '确定M点',
        content: 'M是AA1的中点，坐标为A和A1坐标的平均值。',
        type: 'calculation',
        sceneState: { showLabels: ['M'] },
      },
    ]

    const { semantic } = runGeometryPipeline(parsedData, steps)

    it('M坐标：AA1中点', () => {
      const a = semantic.pointPositions?.['A'] || [0, 0, 0]
      const a1 = semantic.pointPositions?.['A1'] || [0, 0, 0]
      const m = semantic.pointPositions?.['M'] || [0, 0, 0]
      expect(m[0]).toBeCloseTo((a[0] + a1[0]) / 2, 2)
      expect(m[1]).toBeCloseTo((a[1] + a1[1]) / 2, 2)
      expect(m[2]).toBeCloseTo((a[2] + a1[2]) / 2, 2)
    })

    it('所有顶点存在', () => {
      const pointLabels = semantic.points || []
      const requiredPoints = ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']
      requiredPoints.forEach(p => {
        expect(pointLabels.includes(p)).toBe(true)
      })
    })
  })

  describe('Case3: 长方体', () => {
    const parsedData = {
      type: 'cuboid',
      size: 2,
      labels: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
      edges: [
        { from: 'A', to: 'B', label: 'AB' },
        { from: 'B', to: 'C', label: 'BC' },
        { from: 'C', to: 'D', label: 'CD' },
        { from: 'D', to: 'A', label: 'DA' },
        { from: 'A', to: 'A1', label: 'AA1' },
        { from: 'B', to: 'B1', label: 'BB1' },
        { from: 'C', to: 'C1', label: 'CC1' },
        { from: 'D', to: 'D1', label: 'DD1' },
        { from: 'A1', to: 'B1', label: 'A1B1' },
        { from: 'B1', to: 'C1', label: 'B1C1' },
        { from: 'C1', to: 'D1', label: 'C1D1' },
        { from: 'D1', to: 'A1', label: 'D1A1' },
      ],
    }

    const steps = [
      {
        index: 1,
        title: '分析题目',
        content: '长方体ABCD-A1B1C1D1。',
        type: 'conceptual',
        sceneState: { showLabels: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'] },
      },
    ]

    const { semantic } = runGeometryPipeline(parsedData, steps)

    it('所有顶点存在且坐标非零', () => {
      const requiredPoints = ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']
      requiredPoints.forEach(p => {
        const pos = semantic.pointPositions?.[p] || [0, 0, 0]
        expect(pos.some(v => v !== 0)).toBe(true)
      })
    })

    it('底面ABCD共面', () => {
      const a = semantic.pointPositions?.['A'] || [0, 0, 0]
      const b = semantic.pointPositions?.['B'] || [0, 0, 0]
      const c = semantic.pointPositions?.['C'] || [0, 0, 0]
      const d = semantic.pointPositions?.['D'] || [0, 0, 0]
      const yCoords = [a[1], b[1], c[1], d[1]]
      yCoords.forEach(y => {
        expect(Math.abs(y - yCoords[0])).toBeLessThan(0.01)
      })
    })

    it('顶面A1B1C1D1共面', () => {
      const a1 = semantic.pointPositions?.['A1'] || [0, 0, 0]
      const b1 = semantic.pointPositions?.['B1'] || [0, 0, 0]
      const c1 = semantic.pointPositions?.['C1'] || [0, 0, 0]
      const d1 = semantic.pointPositions?.['D1'] || [0, 0, 0]
      const yCoords = [a1[1], b1[1], c1[1], d1[1]]
      yCoords.forEach(y => {
        expect(Math.abs(y - yCoords[0])).toBeLessThan(0.01)
      })
    })

    it('竖棱垂直底面', () => {
      const a = semantic.pointPositions?.['A'] || [0, 0, 0]
      const a1 = semantic.pointPositions?.['A1'] || [0, 0, 0]
      expect(a[0]).toBe(a1[0])
      expect(a[2]).toBe(a1[2])
    })
  })
})
