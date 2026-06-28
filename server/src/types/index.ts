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

export interface ParsedProblem {
  type: GeometryType
  size: number
  labels: string[]
  highlightLines: HighlightLine[]
  annotations: Annotation[]
  explanation: string
  extraParams?: Record<string, number>  // e.g. { height: 4, radius2: 3 }
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

// ── Steps ─────────────────────────────────────────
export type StepType = 'observation' | 'construction' | 'calculation' | 'conclusion'

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
  sceneState?: SceneState
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
