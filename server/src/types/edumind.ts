// ═══════════════════════════════════════════════════════
//  EduMind — 考试分析与学习规划系统 类型定义
// ═══════════════════════════════════════════════════════

// ── 考试题目 ──────────────────────────────────────
export interface ExamQuestion {
  index: number
  content: string
  type: 'choice' | 'fill' | 'calculation' | 'proof'
  score: number
  earned: number
  difficulty: 1 | 2 | 3 | 4 | 5
  knowledge_points: string[]
  error_type?: 'concept' | 'calculation' | 'careless' | 'time_pressure' | 'psychology' | null
  ai_analysis?: {
    explanation: string
    suggestion: string
    attribution: 'knowledge_gap' | 'calculation_error' | 'reading_error' | 'time_pressure' | 'psychological'
  }
}

// ── 考试 ───────────────────────────────────────────
export interface Exam {
  id: string
  user_id: string
  title: string
  subject: string
  exam_date: string
  total_score: number | null
  score: number | null
  duration_min: number | null
  grade: string | null
  question_count: number | null
  questions: ExamQuestion[]
  tags: string[]
  created_at: string
  updated_at: string
}

// ── 分析状态 ──────────────────────────────────────
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ── 知识点掌握度 ──────────────────────────────────
export interface KnowledgeMastery {
  knowledge_id: string
  name: string
  mastery: number        // 0-1
  importance: number     // 1-5
  questions_count: number
  correct_rate: number
}

// ── 错误归因 ──────────────────────────────────────
export type AttributionType = 'knowledge_gap' | 'calculation_error' | 'reading_error' | 'time_pressure' | 'psychological'

export interface ErrorAttribution {
  type: AttributionType
  percentage: number
  description: string
}

// ── 考试分析 ──────────────────────────────────────
export interface ExamAnalysis {
  id: string
  exam_id: string
  user_id: string
  status: AnalysisStatus
  overall_summary: string | null
  score_analysis: Record<string, any>
  knowledge_mastery: KnowledgeMastery[]
  error_attribution: ErrorAttribution[]
  improvement_suggestions: Array<{
    knowledge_id: string
    priority: number
    suggestion: string
  }>
  recommended_plan: Record<string, any>
  created_at: string
  completed_at: string | null
}

// ── 学习计划任务 ──────────────────────────────────
export interface PlanTask {
  type: 'review' | 'practice' | 'review_mistake' | 'read' | 'quiz'
  description: string
  duration_min: number
}

// ── 计划每日条目 ──────────────────────────────────
export interface PlanDay {
  day: number
  focus: string
  knowledge_points: string[]
  tasks: PlanTask[]
  total_duration_min: number
  completed: boolean
}

// ── 学习计划 ──────────────────────────────────────
export interface LearningPlan {
  id: string
  user_id: string
  exam_id: string | null
  title: string
  duration_days: number
  start_date: string
  is_active: boolean
  goal: string | null
  plan_content: PlanDay[]
  progress: number
  created_at: string
  updated_at: string
}

// ── AI 教练消息 ───────────────────────────────────
export interface CoachMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  message_type: 'daily_reminder' | 'question' | 'advice' | 'general'
  created_at: string
}

// ── 每日提醒 ──────────────────────────────────────
export interface DailyReminder {
  id: string
  user_id: string
  date: string
  title: string
  content: string
  is_read: boolean
  is_actioned: boolean
}

// ═══════════════════════════════════════════════════════
//  前端辅助函数 & 常量
// ═══════════════════════════════════════════════════════

// ── 错误归因标签 ──────────────────────────────────
export const ATTRIBUTION_LABELS: Record<AttributionType, string> = {
  knowledge_gap: '知识漏洞',
  calculation_error: '计算失误',
  reading_error: '审题错误',
  time_pressure: '时间压力',
  psychological: '心理因素',
}

export const ATTRIBUTION_DESCRIPTIONS: Record<AttributionType, string> = {
  knowledge_gap: '对该知识点理解不深入，概念模糊',
  calculation_error: '解题思路正确，但计算过程中出现错误',
  reading_error: '误解题意或遗漏关键条件',
  time_pressure: '因时间不足导致答题仓促',
  psychological: '考试紧张、粗心等心理因素影响',
}

export const ATTRIBUTION_COLORS: Record<AttributionType, string> = {
  knowledge_gap: '#ef4444',
  calculation_error: '#f59e0b',
  reading_error: '#8b5cf6',
  time_pressure: '#3b82f6',
  psychological: '#ec4899',
}

// ── 掌握度转换 ────────────────────────────────────
export function masteryToStars(mastery: number): { filled: number; half: boolean; empty: number } {
  const clamped = Math.max(0, Math.min(1, mastery))
  const filled = Math.floor(clamped * 5)
  const remainder = clamped * 5 - filled
  const half = remainder >= 0.3 && remainder < 0.8
  const empty = 5 - filled - (half ? 1 : 0)
  return { filled, half, empty }
}
