// ═══════════════════════════════════════════════════════
//  MathViz Server — 共享类型定义
// ═══════════════════════════════════════════════════════

// ── 用户 ──────────────────────────────────────────
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'student' | 'teacher'
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'free' | 'pro' | 'teacher'
  billing_interval: 'monthly' | 'yearly'
  status: 'active' | 'canceled' | 'past_due'
  current_period_start: string | null
  current_period_end: string | null
}

export interface AuthTokens {
  token: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  role: 'student' | 'teacher'
  plan: 'free' | 'pro' | 'teacher'
}

// ── Geometry ──────────────────────────────────────
export type GeometryType =
  | 'cube' | 'cuboid' | 'sphere' | 'cylinder'
  | 'cone' | 'pyramid' | 'prism'
  | 'squareFrustum' | 'circularFrustum'

// ── Problem Type Classification ─────────────────
export type ProblemSubType =
  | 'skew_lines'
  | 'dihedral_angle'
  | 'line_plane_angle'
  | 'section'
  | 'shortest_distance'
  | 'volume'
  | 'spatial_vector'
  | 'distance_point_plane'
  | 'inscribed_circumscribed'
  | 'general'

export const PROBLEM_SUBTYPE_NAMES: Record<ProblemSubType, string> = {
  skew_lines: '异面直线夹角',
  dihedral_angle: '二面角',
  line_plane_angle: '线面角',
  section: '截面',
  shortest_distance: '最短距离',
  volume: '体积计算',
  spatial_vector: '空间向量',
  distance_point_plane: '点到平面距离',
  inscribed_circumscribed: '内切外接',
  general: '综合题',
}

export interface ParsedProblem {
  type: GeometryType
  size: number
  labels: string[]
  highlightLines: HighlightLine[]
  annotations: Annotation[]
  explanation: string
  extraParams?: Record<string, number>  // e.g. { height: 4, radius2: 3 }
  problemType?: ProblemSubType  // AI 识别的题型（唯一权威来源）
}

export interface HighlightLine {
  from: string
  to: string
  label: string
  reason: string
}

export interface Annotation {
  text: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

// ── Scene IR (Scene Intermediate Representation) ──
// 唯一的事实源：AI Steps → SceneIR → 3D Renderer

export interface ScenePoint {
  id: string           // 唯一标识，如 "A"、"A1"、"M_AB"
  label: string        // 显示标签，如 "A₁"
  position: [number, number, number]  // 3D 坐标
  color?: string
  visible?: boolean
}

export interface SceneLine {
  id: string           // 唯一标识，如 "AB"
  from: string         // 起点 ScenePoint.id
  to: string           // 终点 ScenePoint.id
  category: string     // '棱' | '底面边' | '顶面边' | '侧棱' | '对角线' | '辅助线' | '高线'
  dashed?: boolean
  color?: string
  visible?: boolean
  highlighted?: boolean
}

export interface SceneFace {
  id: string
  vertices: string[]   // ScenePoint.id 列表
  opacity?: number
  visible?: boolean
  color?: string
}

export interface SceneSection {
  id: string
  type: 'plane' | 'polygon'
  points: string[]     // 截面经过的 ScenePoint.id
  visible?: boolean
}

export interface SceneIR {
  points: ScenePoint[]
  lines: SceneLine[]
  faces?: SceneFace[]
  sections?: SceneSection[]
  labelVisibility?: Record<string, boolean>
  annotations?: { text: string; position: string }[]
}

export interface ScenePointRef {
  pointId: string
  position: [number, number, number]
  label: string
}

export interface SceneOps {
  highlightPoints?: string[]
  highlightLines?: string[]
  addAuxLines?: {
    from: ScenePointRef
    to: ScenePointRef
    label?: string
    dashed?: boolean
    color?: string
  }[]
  addAuxPoints?: {
    id: string
    label: string
    position: 'midpoint' | 'intersection' | 'projection'
    refs: string[]
  }[]
  fadeLines?: string[]
  focusPoints?: string[]
  showLabels?: string[]
  planeHighlight?: {
    vertices: string[]
    color?: string
    opacity?: number
  }
  sectionCut?: {
    plane: string[]
    showSection?: boolean
    opacity?: number
  }
}

// ── Steps ─────────────────────────────────────────
export type StepType = 'conceptual' | 'construction' | 'calculation' | 'validation'

export interface WhyExplain {
  intuition: string   // 直觉理解（生活类比）
  math_reason: string // 数学原理
}

export interface StuckExplain {
  misconception: string // 学生常见错误理解
  correction: string    // 正确理解
}

export interface AuxLine {
  from: string
  to: string
  dashed: boolean
  color: string
}

export interface SceneState {
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  highlightEdges: string[]
  highlightColor: string
  showAuxiliaryLines: AuxLine[]
  showLabels: string[]
  annotations: { text: string; position: string }[]
  opacity: { faces: number; nonHighlightedEdges: number }
  animationType: 'fade' | 'slide' | 'zoom' | 'none'
  duration: number
}

export interface Step {
  step: number
  title: string
  content: string
  type: StepType
  why?: WhyExplain
  stuck?: StuckExplain
  sceneState?: SceneState
  sceneOps?: SceneOps  // 结构化场景操作指令（SceneIR 驱动）
  locked?: boolean  // Free用户锁定
}

// ── Workspace ─────────────────────────────────────
export interface WorkspaceGeometry {
  type: GeometryType
  params: Record<string, number>
  constraintMode?: string
  labels?: string[]
  highlightLines?: HighlightLine[]
}

export interface Workspace {
  id: string
  user_id: string
  title: string
  problem_text: string
  parsed_data: ParsedProblem | null
  steps: Step[]
  geometry: WorkspaceGeometry | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface WorkspaceListItem {
  id: string
  title: string
  problem_text: string
  geometry_type: string | null
  step_count: number
  is_public: boolean
  created_at: string
}

// ── Narration / Teacher ──────────────────────────
export interface NarrationPhrase {
  stepIdx: number
  phrase: string
  delay: number  // ms
  sceneState?: SceneState
  animationType: 'fade' | 'slide' | 'zoom' | 'none'
}

export interface TeacherScript {
  id: string
  workspace_id: string
  user_id: string
  title: string | null
  narration: NarrationPhrase[]
  slide_count: number
  is_published: boolean
  created_at: string
}

export interface CourseCollection {
  id: string
  user_id: string
  title: string
  description: string | null
  workspace_ids: string[]
}

// ── PPT Export ────────────────────────────────────
export interface PPTExportOptions {
  workspaceId: string
  screenshotBase64?: string
  template?: 'default' | 'classroom'
  teacherName?: string
  schoolName?: string
  includeNarration?: boolean
}

// ── Knowledge Graph ────────────────────────────────
export interface KnowledgePoint {
  id: string
  code: string
  name: string
  category: string
  sub_category: string | null
  description: string | null
  importance: number
  lft: number
  rgt: number
  depth: number
  created_at: string
}

export interface KnowledgePrerequisite {
  id: string
  knowledge_id: string
  prerequisite_id: string
  created_at: string
}

// ── Billing ───────────────────────────────────────
export interface BillingStatus {
  plan: 'free' | 'pro' | 'teacher'
  status: 'active' | 'canceled' | 'past_due'
  billing_interval: 'monthly' | 'yearly'
  current_period_end: string | null
  daily_usage: number
  daily_limit: number
  remaining: number
}

// ── MathModel 2.0 ──────────────────────────────────
export type ModelCategory =
  | 'geometry-3d'
  | 'function'
  | 'derivative'
  | 'sequence'
  | 'conic'
  | 'probability'
  | 'statistics'
  | 'vector'
  | 'complex'
  | 'inequality'

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export interface RecognitionRule {
  keywords: string[]
  patterns: string[]
  requiresLLM: boolean
}

export interface SolutionMethod {
  name: string
  description: string
  steps: string[]
  formula?: string
}

export interface ModelPrompts {
  solve: string
  tutor: string
  socratic: string
  hint: string
  variant: string
}

export interface ExampleRef {
  id: string
  title: string
  difficulty: DifficultyLevel
}

export interface MathModel {
  id: string
  title: string
  category: ModelCategory
  difficulty: DifficultyLevel
  recognition: RecognitionRule
  methods: SolutionMethod[]
  traps: string[]
  prerequisites: string[]
  nextModels: string[]
  examples: ExampleRef[]
  aiPrompts: ModelPrompts
  createdAt: string
  updatedAt: string
}

// ── API Responses ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Express augmentation ──────────────────────────
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userPlan?: 'free' | 'pro' | 'teacher'
      userRole?: 'student' | 'teacher'
    }
  }
}
