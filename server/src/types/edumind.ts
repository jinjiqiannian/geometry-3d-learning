// ═══════════════════════════════════════════════════════
//  EduMind 类型 — 仅包含 exam.service.ts 需要的类型
// ═══════════════════════════════════════════════════════

export interface Exam {
  id: string
  user_id: string
  title: string | null
  subject: string
  exam_date: string | null
  total_score: number | null
  score: number | null
  duration_min: number | null
  grade: string | null
  question_count: number | null
  questions: any[]
  tags: string[]
  created_at: string
  updated_at: string
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExamAnalysis {
  id: string
  exam_id: string
  user_id: string
  status: AnalysisStatus
  overall_summary: string | null
  score_analysis: Record<string, any>
  knowledge_mastery: any[]
  error_attribution: any[]
  improvement_suggestions: any[]
  recommended_plan: Record<string, any>
  created_at: string
  completed_at: string | null
}

export interface LearningPlan {
  id: string
  user_id: string
  start_date: string
  exam_id: string | null
  title: string | null
  duration_days: number
  plan_content: any[]
  progress: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CoachMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  message_type: string
  created_at: string
}

export interface DailyReminder {
  id: string
  user_id: string
  date: string
  title: string
  content: string
  is_read: boolean
  is_actioned: boolean
}
