// ═══════════════════════════════════════════════════════
//  SceneIR Template — 顶点坐标 · 线段 · 面 唯一注册表
//
//  原则：
//  1. 所有几何体的顶点坐标、线段、面只在此定义
//  2. 其他文件（geometryEngine、lineDefinitions、constraintSolver）
//     都从此文件导入，不再维护自己的副本
//  3. 纯数据层 —— 不包含渲染逻辑、不包含 AI 逻辑
//
//  使用方式：
//    import { VERTEX_TEMPLATES, getScaledTemplate } from './sceneIRTemplate'
//    const tpl = getScaledTemplate('cube', { size: 2 })
//    // tpl.vertices → 缩放后的顶点坐标
//    // tpl.labels   → 默认标签
//    // tpl.lines    → 所有棱/对角线
//    // tpl.faces    → 面定义
// ═══════════════════════════════════════════════════════

// ── 归一化顶点注册表（size=2，即半长 s=1）──────────
// VertexTemplate 类型定义在 server/src/types/index.ts

const CUBE_VERTICES = [
  [-1, -1, -1], [ 1, -1, -1], [ 1, -1,  1], [-1, -1,  1],  // 0-3 底面 ABCD
  [-1,  1, -1], [ 1,  1, -1], [ 1,  1,  1], [-1,  1,  1],  // 4-7 顶面 EFGH
]

const PYRAMID_VERTICES = [
  [-1, -1, -1], [ 1, -1, -1], [ 1, -1,  1], [-1, -1,  1],  // 0-3 底面 ABCD
  [ 0,  1,  0],                                              // 4 顶点 P
]

const PRISM_VERTICES = [
  [-1, -1, -1], [ 1, -1, -1], [-1, -1,  1],                  // 0-2 底面 ABC
  [-1,  1, -1], [ 1,  1, -1], [-1,  1,  1],                  // 3-5 顶面 A'B'C'
]

const CUBOID_VERTICES = [
  [-1, -1, -0.6], [ 1, -1, -0.6], [ 1, -1,  0.6], [-1, -1,  0.6],  // 0-3 底面
  [-1,  1, -0.6], [ 1,  1, -0.6], [ 1,  1,  0.6], [-1,  1,  0.6],  // 4-7 顶面
]

// ── 主注册表 ──────────────────────────────────────

/** @type {Object<string, VertexTemplate>} */
export const VERTEX_TEMPLATES = {
  cube: {
    vertices: CUBE_VERTICES,
    labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    centers: {
      body: [0, 0, 0],
      front: [0, 0, 1], back: [0, 0, -1],
      left: [-1, 0, 0], right: [1, 0, 0],
      top: [0, 1, 0], bottom: [0, -1, 0],
    },
    lines: [
      // 12 条棱
      { id: 'AB', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'BC', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'CD', from: 2, to: 3, category: '棱', dashed: false },
      { id: 'DA', from: 3, to: 0, category: '棱', dashed: false },
      { id: 'EF', from: 4, to: 5, category: '棱', dashed: false },
      { id: 'FG', from: 5, to: 6, category: '棱', dashed: false },
      { id: 'GH', from: 6, to: 7, category: '棱', dashed: false },
      { id: 'HE', from: 7, to: 4, category: '棱', dashed: false },
      { id: 'AE', from: 0, to: 4, category: '棱', dashed: false },
      { id: 'BF', from: 1, to: 5, category: '棱', dashed: false },
      { id: 'CG', from: 2, to: 6, category: '棱', dashed: false },
      { id: 'DH', from: 3, to: 7, category: '棱', dashed: false },
      // 6 个面对角线
      { id: 'AC', from: 0, to: 2, category: '面对角线', dashed: false },
      { id: 'BD', from: 1, to: 3, category: '面对角线', dashed: false },
      { id: 'EG', from: 4, to: 6, category: '面对角线', dashed: false },
      { id: 'FH', from: 5, to: 7, category: '面对角线', dashed: false },
      { id: 'AF', from: 0, to: 5, category: '面对角线', dashed: false },
      { id: 'AH', from: 0, to: 7, category: '面对角线', dashed: false },
      { id: 'BE', from: 1, to: 4, category: '面对角线', dashed: false },
      { id: 'BG', from: 1, to: 6, category: '面对角线', dashed: false },
      { id: 'CE', from: 2, to: 4, category: '面对角线', dashed: false },
      { id: 'CH', from: 2, to: 7, category: '面对角线', dashed: false },
      { id: 'DF', from: 3, to: 5, category: '面对角线', dashed: false },
      { id: 'DG', from: 3, to: 6, category: '面对角线', dashed: false },
      // 4 条体对角线
      { id: 'AG', from: 0, to: 6, category: '体对角线', dashed: false },
      { id: 'BH', from: 1, to: 7, category: '体对角线', dashed: false },
      { id: 'CE', from: 2, to: 4, category: '体对角线', dashed: true },
      { id: 'DF', from: 3, to: 5, category: '体对角线', dashed: true },
    ],
    faces: [
      { vertices: [0, 1, 2, 3] },  // 底面
      { vertices: [4, 5, 6, 7] },  // 顶面
      { vertices: [0, 1, 5, 4] },  // 前面
      { vertices: [1, 2, 6, 5] },  // 右面
      { vertices: [2, 3, 7, 6] },  // 后面
      { vertices: [3, 0, 4, 7] },  // 左面
    ],
  },

  cuboid: {
    vertices: CUBOID_VERTICES,
    labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    centers: {
      body: [0, 0, 0],
      front: [0, 0, 0.6], back: [0, 0, -0.6],
      left: [-1, 0, 0], right: [1, 0, 0],
      top: [0, 1, 0], bottom: [0, -1, 0],
    },
    lines: [
      // 12 条棱
      { id: 'AB', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'BC', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'CD', from: 2, to: 3, category: '棱', dashed: false },
      { id: 'DA', from: 3, to: 0, category: '棱', dashed: false },
      { id: 'EF', from: 4, to: 5, category: '棱', dashed: false },
      { id: 'FG', from: 5, to: 6, category: '棱', dashed: false },
      { id: 'GH', from: 6, to: 7, category: '棱', dashed: false },
      { id: 'HE', from: 7, to: 4, category: '棱', dashed: false },
      { id: 'AE', from: 0, to: 4, category: '棱', dashed: false },
      { id: 'BF', from: 1, to: 5, category: '棱', dashed: false },
      { id: 'CG', from: 2, to: 6, category: '棱', dashed: false },
      { id: 'DH', from: 3, to: 7, category: '棱', dashed: false },
      // 面对角线
      { id: 'AC', from: 0, to: 2, category: '面对角线', dashed: false },
      { id: 'BD', from: 1, to: 3, category: '面对角线', dashed: false },
      { id: 'EG', from: 4, to: 6, category: '面对角线', dashed: false },
      { id: 'FH', from: 5, to: 7, category: '面对角线', dashed: false },
      // 体对角线
      { id: 'AG', from: 0, to: 6, category: '体对角线', dashed: false },
      { id: 'BH', from: 1, to: 7, category: '体对角线', dashed: false },
      { id: 'CE', from: 2, to: 4, category: '体对角线', dashed: true },
      { id: 'DF', from: 3, to: 5, category: '体对角线', dashed: true },
    ],
    faces: [
      { vertices: [0, 1, 2, 3] },
      { vertices: [4, 5, 6, 7] },
      { vertices: [0, 1, 5, 4] },
      { vertices: [1, 2, 6, 5] },
      { vertices: [2, 3, 7, 6] },
      { vertices: [3, 0, 4, 7] },
    ],
  },

  sphere: {
    vertices: [
      [0, -1, 0], [0, 1, 0], [1, 0, 0],   // S, N, E
      [-1, 0, 0], [0, 0, 1], [0, 0, -1],   // W, F, B
    ],
    labels: ['S', 'N', 'E', 'W', 'F', 'B'],
    centers: { body: [0, 0, 0] },
    lines: [
      // 经线
      { id: 'SN', from: 0, to: 1, category: '高线', dashed: false },
      // 纬线直径
      { id: 'EW', from: 2, to: 3, category: '底面边', dashed: false },
      { id: 'FB', from: 4, to: 5, category: '底面边', dashed: false },
    ],
    faces: [],  // 球体不定义面（使用曲线网格）
  },

  cylinder: {
    vertices: [
      [0, -1, 0], [0, 1, 0],                          // 0,1  底面/顶面圆心
      [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1],  // 2-5  底面标记
      [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1],      // 6-9  顶面标记
    ],
    labels: ['O', "O'", 'A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"],
    centers: { body: [0, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0] },
    lines: [
      { id: 'OO', from: 0, to: 1, category: '高线', dashed: false },
      { id: 'AB', from: 2, to: 3, category: '底面边', dashed: false },
      { id: 'CD', from: 4, to: 5, category: '底面边', dashed: false },
      { id: 'AC', from: 2, to: 4, category: '底面边', dashed: false },
      { id: 'BD', from: 3, to: 5, category: '底面边', dashed: false },
      { id: 'ABp', from: 6, to: 7, category: '顶面边', dashed: false },
      { id: 'CDp', from: 8, to: 9, category: '顶面边', dashed: false },
      { id: 'ACp', from: 6, to: 8, category: '顶面边', dashed: false },
      { id: 'BDp', from: 7, to: 9, category: '顶面边', dashed: false },
    ],
    faces: [],
  },

  cone: {
    vertices: [
      [0, -1, 0], [0, 1, 0],                          // 0,1  底面圆心 O, 顶点 P
      [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1],  // 2-5  底面标记
    ],
    labels: ['O', 'P', 'A', 'B', 'C', 'D'],
    centers: { base: [0, -1, 0], apex: [0, 1, 0] },
    lines: [
      { id: 'AB', from: 2, to: 3, category: '底面边', dashed: false },
      { id: 'CD', from: 4, to: 5, category: '底面边', dashed: false },
      { id: 'AC', from: 2, to: 4, category: '底面边', dashed: false },
      { id: 'BD', from: 3, to: 5, category: '底面边', dashed: false },
      { id: 'PA', from: 1, to: 2, category: '母线', dashed: false },
      { id: 'PB', from: 1, to: 3, category: '母线', dashed: false },
      { id: 'PC', from: 1, to: 4, category: '母线', dashed: false },
      { id: 'PD', from: 1, to: 5, category: '母线', dashed: false },
    ],
    faces: [],
  },

  pyramid: {
    vertices: PYRAMID_VERTICES,
    labels: ['A', 'B', 'C', 'D', 'P'],
    centers: { body: [0, 0, 0], base: [0, -1, 0], apex: [0, 1, 0] },
    lines: [
      // 底面棱
      { id: 'AB', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'BC', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'CD', from: 2, to: 3, category: '棱', dashed: false },
      { id: 'DA', from: 3, to: 0, category: '棱', dashed: false },
      // 侧棱
      { id: 'PA', from: 4, to: 0, category: '侧棱', dashed: false },
      { id: 'PB', from: 4, to: 1, category: '侧棱', dashed: false },
      { id: 'PC', from: 4, to: 2, category: '侧棱', dashed: false },
      { id: 'PD', from: 4, to: 3, category: '侧棱', dashed: false },
      // 底面 面对角线
      { id: 'AC', from: 0, to: 2, category: '面对角线', dashed: false },
      { id: 'BD', from: 1, to: 3, category: '面对角线', dashed: false },
    ],
    faces: [
      { vertices: [0, 1, 2, 3] },  // 底面
      { vertices: [0, 1, 4] },     // 侧面
      { vertices: [1, 2, 4] },
      { vertices: [2, 3, 4] },
      { vertices: [3, 0, 4] },
    ],
  },

  prism: {
    vertices: PRISM_VERTICES,
    labels: ['A', 'B', 'C', "A'", "B'", "C'"],
    centers: {
      body: [-1/3, 0, -1/3],
      baseBottom: [-1/3, -1, -1/3],
      baseTop: [-1/3, 1, -1/3],
    },
    lines: [
      // 底面棱
      { id: 'AB', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'BC', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'CA', from: 2, to: 0, category: '棱', dashed: false },
      // 顶面棱
      { id: 'ABp', from: 3, to: 4, category: '棱', dashed: false },
      { id: 'BCp', from: 4, to: 5, category: '棱', dashed: false },
      { id: 'CAp', from: 5, to: 3, category: '棱', dashed: false },
      // 侧棱
      { id: 'AAp', from: 0, to: 3, category: '侧棱', dashed: false },
      { id: 'BBp', from: 1, to: 4, category: '侧棱', dashed: false },
      { id: 'CCp', from: 2, to: 5, category: '侧棱', dashed: false },
    ],
    faces: [
      { vertices: [0, 1, 2] },
      { vertices: [3, 5, 4] },
      { vertices: [0, 1, 4, 3] },
      { vertices: [1, 2, 5, 4] },
      { vertices: [2, 0, 3, 5] },
    ],
  },

  squareFrustum: {
    vertices: [
      [-1, -1, -1], [ 1, -1, -1], [ 1, -1,  1], [-1, -1,  1],  // 0-3 底面 ABCD
      [-0.5, 1, -0.5], [ 0.5, 1, -0.5], [ 0.5, 1,  0.5], [-0.5, 1,  0.5],  // 4-7 顶面 EFGH
    ],
    labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    centers: { body: [0, 0, 0], bottom: [0, -1, 0], top: [0, 1, 0] },
    lines: [
      // 底面
      { id: 'AB', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'BC', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'CD', from: 2, to: 3, category: '棱', dashed: false },
      { id: 'DA', from: 3, to: 0, category: '棱', dashed: false },
      // 顶面
      { id: 'EF', from: 4, to: 5, category: '棱', dashed: false },
      { id: 'FG', from: 5, to: 6, category: '棱', dashed: false },
      { id: 'GH', from: 6, to: 7, category: '棱', dashed: false },
      { id: 'HE', from: 7, to: 4, category: '棱', dashed: false },
      // 侧棱
      { id: 'AE', from: 0, to: 4, category: '侧棱', dashed: false },
      { id: 'BF', from: 1, to: 5, category: '侧棱', dashed: false },
      { id: 'CG', from: 2, to: 6, category: '侧棱', dashed: false },
      { id: 'DH', from: 3, to: 7, category: '侧棱', dashed: false },
    ],
    faces: [
      { vertices: [0, 1, 2, 3] },
      { vertices: [4, 5, 6, 7] },
      { vertices: [0, 1, 5, 4] },
      { vertices: [1, 2, 6, 5] },
      { vertices: [2, 3, 7, 6] },
      { vertices: [3, 0, 4, 7] },
    ],
  },

  circularFrustum: {
    vertices: [
      [0, -1, 0], [0, 1, 0],                                    // 0,1  底面/顶面圆心
      [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1],         // 2-5  底面标记
      [0.5, 1, 0], [-0.5, 1, 0], [0, 1, 0.5], [0, 1, -0.5],    // 6-9  顶面标记
    ],
    labels: ['O', "O'", 'A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"],
    centers: { body: [0, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0] },
    lines: [
      { id: 'OO', from: 0, to: 1, category: '高线', dashed: false },
      { id: 'AB', from: 2, to: 3, category: '底面边', dashed: false },
      { id: 'CD', from: 4, to: 5, category: '底面边', dashed: false },
      { id: 'ABp', from: 6, to: 7, category: '顶面边', dashed: false },
      { id: 'CDp', from: 8, to: 9, category: '顶面边', dashed: false },
    ],
    faces: [],
  },

  tetrahedron: {
    vertices: [
      [-0.7071, -0.7071, -0.7071],
      [ 0.7071,  0.7071, -0.7071],
      [ 0.7071, -0.7071,  0.7071],
      [-0.7071,  0.7071,  0.7071],
    ],
    labels: ['A', 'B', 'C', 'D'],
    centers: { body: [0, 0, 0] },
    lines: [
      { id: 'AB', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'AC', from: 0, to: 2, category: '棱', dashed: false },
      { id: 'AD', from: 0, to: 3, category: '棱', dashed: false },
      { id: 'BC', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'BD', from: 1, to: 3, category: '棱', dashed: false },
      { id: 'CD', from: 2, to: 3, category: '棱', dashed: false },
    ],
    faces: [
      { vertices: [0, 1, 2] },
      { vertices: [0, 1, 3] },
      { vertices: [0, 2, 3] },
      { vertices: [1, 2, 3] },
    ],
  },

  octahedron: {
    vertices: [
      [0, 1, 0], [-1, 0, 0], [0, 0, -1], [1, 0, 0], [0, 0, 1], [0, -1, 0],
    ],
    labels: ['T', 'R', 'F', 'L', 'B', 'D'],
    centers: { body: [0, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0], equator: [0, 0, 0] },
    lines: [
      { id: 'TR', from: 0, to: 1, category: '棱', dashed: false },
      { id: 'TF', from: 0, to: 2, category: '棱', dashed: false },
      { id: 'TB', from: 0, to: 3, category: '棱', dashed: false },
      { id: 'TL', from: 0, to: 4, category: '棱', dashed: false },
      { id: 'RF', from: 1, to: 2, category: '棱', dashed: false },
      { id: 'RB', from: 1, to: 3, category: '棱', dashed: false },
      { id: 'BL', from: 3, to: 4, category: '棱', dashed: false },
      { id: 'FL', from: 2, to: 4, category: '棱', dashed: false },
      { id: 'RD', from: 1, to: 5, category: '棱', dashed: false },
      { id: 'FD', from: 2, to: 5, category: '棱', dashed: false },
      { id: 'BD', from: 3, to: 5, category: '棱', dashed: false },
      { id: 'LD', from: 4, to: 5, category: '棱', dashed: false },
      { id: 'TD', from: 0, to: 5, category: '体对角线', dashed: false },
      { id: 'RL', from: 1, to: 4, category: '体对角线', dashed: false },
      { id: 'FB', from: 2, to: 3, category: '体对角线', dashed: false },
    ],
    faces: [
      { vertices: [0, 1, 2] },
      { vertices: [0, 1, 3] },
      { vertices: [0, 3, 4] },
      { vertices: [0, 4, 2] },
      { vertices: [5, 1, 2] },
      { vertices: [5, 1, 3] },
      { vertices: [5, 3, 4] },
      { vertices: [5, 4, 2] },
    ],
  },
}

// ── 公共工具函数 ──────────────────────────────────

/**
 * 获取缩放后的几何体模板
 * @param {string} type - 几何体类型
 * @param {{size?: number}} [params] - { size: 棱长/直径/... }
 * @param {string[]} [customLabels] - 自定义标签数组
 * @returns {VertexTemplate}
 */
export function getScaledTemplate(
  type,
  params = {},
  customLabels
) {
  const tpl = VERTEX_TEMPLATES[type]
  if (!tpl) return VERTEX_TEMPLATES.cube

  const { size = 2 } = params
  const scale = size / 2
  const k = scale // 归一化 → 实际尺寸的倍数

  // 缩放顶点坐标
  const vertices = tpl.vertices.map(v => [
    v[0] * k,
    v[1] * k,
    v[2] * k,
  ])

  // 缩放中心点
  const centers = {}
  for (const [key, pos] of Object.entries(tpl.centers)) {
    centers[key] = [pos[0] * k, pos[1] * k, pos[2] * k]
  }

  return {
    vertices,
    labels: customLabels || tpl.labels,
    centers,
    lines: tpl.lines,
    faces: tpl.faces,
  }
}

/**
 * 获取几何体类型列表
 */
export function getGeometryTypes() {
  return Object.keys(VERTEX_TEMPLATES)
}

/**
 * 检查几何体是否是多面体（有面定义）
 * @param {string} type
 * @returns {boolean}
 */
export function isPolyhedral(type) {
  const tpl = VERTEX_TEMPLATES[type]
  return tpl ? tpl.faces.length > 0 : false
}
