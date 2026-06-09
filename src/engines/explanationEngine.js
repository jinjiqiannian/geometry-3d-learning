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
  },

  pyramid: {
    default: [
      { step: 1, title: '识别几何体', content: '正四棱锥，底面为正方形，顶点在底面中心的垂直上方。', type: 'observation' },
      { step: 2, title: '分析已知条件', content: '底面边长a，高h。斜高 = √(h² + (a/2)²)。', type: 'observation' },
      { step: 3, title: '应用棱锥公式', content: '体积 V = (1/3)×底面积×高 = (1/3)×a²×h。', type: 'calculation' },
      { step: 4, title: '代入计算', content: '将底面边长a和高h代入体积公式 V = (1/3)a²h。', type: 'calculation' },
      { step: 5, title: '得出结论', content: '棱锥体积 = 1/3 × 底面积 × 高 = 1/3 × a² × h。底面积为正方形边长平方，再乘以高的三分之一即得体积。', type: 'conclusion' },
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
}

// ── 关键词 → 题型匹配 ────────────────────────────

function detectProblemType(type, text) {
  const t = text.toLowerCase()

  if (type === 'cube') {
    if (/异面|skew/.test(t)) return 'angle_skew_lines'
    if (/对角线|diagonal/.test(t)) return 'diagonal'
  }

  if (type === 'cuboid') {
    if (/体对角线|对角线长/.test(t)) return 'diagonal_long'
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
 */
function interpolateSteps(steps, ctx) {
  return steps.map(step => ({
    ...step,
    content: step.content
      .replace(/\{typeName\}/g, ctx.typeName)
      .replace(/\{size\}/g, ctx.size != null ? String(ctx.size) : '')
      .replace(/\{labels\}/g, ctx.labelStr)
      .replace(/\{label\}/g, ctx.firstLabel),
  }))
}

const GEOMETRY_NAMES = {
  cube: '正方体', cuboid: '长方体', sphere: '球体', cylinder: '圆柱体',
  cone: '圆锥体', pyramid: '正四棱锥', prism: '棱柱',
  squareFrustum: '四棱台', circularFrustum: '圆台',
}

// ── AI 增强讲解（需要 Claude API）─────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const EXPLAIN_SYSTEM_PROMPT = `你是一个中学数学老师，擅长用简洁清晰的语言讲解立体几何题。

请为以下题目生成分步解题讲解。严格输出 JSON 数组（不要 markdown 代码块）：

[
  { "step": 1, "title": "步骤标题", "content": "这一步的详细讲解（2-4句话）", "type": "observation|construction|calculation|conclusion" },
  ...
]

要求：
1. 3-5 个步骤
2. type: observation=观察分析, construction=作图构造, calculation=计算推导, conclusion=结论
3. 每步 content 2-4 句话，使用中文
4. 只输出 JSON 数组`

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
