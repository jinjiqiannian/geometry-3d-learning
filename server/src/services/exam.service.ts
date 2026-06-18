// ═══════════════════════════════════════════════════════
//  Exam Service — EduMind 考试 CRUD + AI 分析
// ═══════════════════════════════════════════════════════
import { supabase } from '../lib/supabase.js'
import type { Exam, ExamAnalysis, LearningPlan, CoachMessage, DailyReminder } from '../types/edumind.js'
import { callDeepSeek, extractJSON, trackCost } from './ai.service.js'

const FLASH_MODEL = 'deepseek-chat'

// ═══════════════════════════════════════════════════════
//  Exam CRUD
// ═══════════════════════════════════════════════════════

export async function createExam(
  userId: string,
  data: {
    title: string
    subject?: string
    exam_date?: string
    total_score?: number
    score?: number
    duration_min?: number
    grade?: string
    question_count?: number
    questions?: any[]
    tags?: string[]
  }
): Promise<Exam> {
  const { data: exam, error } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      title: data.title,
      subject: data.subject || '数学',
      exam_date: data.exam_date || new Date().toISOString().split('T')[0],
      total_score: data.total_score || null,
      score: data.score || null,
      duration_min: data.duration_min || null,
      grade: data.grade || null,
      question_count: data.question_count || null,
      questions: data.questions || [],
      tags: data.tags || [],
    })
    .select()
    .single()

  if (error) throw new Error(`创建考试失败: ${error.message}`)
  return exam as Exam
}

export async function listExams(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ items: Exam[]; total: number }> {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('exams')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('exam_date', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`查询考试列表失败: ${error.message}`)
  return { items: (data || []) as Exam[], total: count || 0 }
}

export async function getExam(examId: string, userId: string): Promise<Exam | null> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`查询考试失败: ${error.message}`)
  }
  return data as Exam
}

export async function updateExam(
  examId: string,
  userId: string,
  data: Partial<{
    title: string
    subject: string
    exam_date: string
    total_score: number
    score: number
    duration_min: number
    grade: string
    question_count: number
    questions: any[]
    tags: string[]
  }>
): Promise<Exam> {
  const { data: exam, error } = await supabase
    .from('exams')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', examId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`更新考试失败: ${error.message}`)
  return exam as Exam
}

export async function deleteExam(examId: string, userId: string): Promise<void> {
  // Also delete associated analysis
  await supabase.from('exam_analyses').delete().eq('exam_id', examId)
  await supabase.from('learning_plans').delete().eq('exam_id', examId)

  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId)
    .eq('user_id', userId)

  if (error) throw new Error(`删除考试失败: ${error.message}`)
}

// ═══════════════════════════════════════════════════════
//  AI 考试分析
// ═══════════════════════════════════════════════════════

const EXAM_ANALYSIS_SYSTEM_PROMPT = `你是⼀位经验丰富的高中数学老师兼数据分析师。你的任务是分析学生的考试结果，输出结构化的诊断报告。

分析以下 JSON 格式的考试数据：
- questions: 题目数组，每道题包含 content（内容摘要）、score（满分）、earned（得分）、difficulty（难度1-5）、knowledge_points（关联知识点）
- 计算每道题的得分率和整体得分率

严格输出 JSON（不要 markdown 代码块）：
{
  "overall_summary": "2-3句话的总体评价，包含总分、主要问题和改进方向",
  "knowledge_mastery": [
    {
      "knowledge_id": "知识点的ID（从题目中的knowledge_points获取，若题目没有则根据内容推断，以KP-前缀）",
      "name": "知识点名称（中文，如"异面直线夹角"）",
      "mastery": 掌握度0-1,
      "importance": 重要性1-5,
      "questions_count": 涉及题数,
      "correct_rate": 正确率0-1
    }
  ],
  "error_attribution": [
    {
      "type": "knowledge_gap（知识漏洞）| calculation_error（计算失误）| reading_error（审题错误）| time_pressure（时间压力）| psychological（心理因素）",
      "percentage": 该类型占比(百分比数字，各类型之和为100),
      "description": "该类型错误的详细说明"
    }
  ],
  "improvement_suggestions": [
    {
      "knowledge_id": "知识点ID",
      "priority": 优先级1-5（1最紧急）,
      "suggestion": "针对性的改进建议和学习方法"
    }
  ]
}

规则：
1. knowledge_mastery 中的 mastery 根据得分率计算：正确率 >= 0.9 → 0.9-1.0, 0.7-0.9 → 0.6-0.9, 0.5-0.7 → 0.3-0.6, <0.5 → 0-0.3
2. error_attribution 中五个类型百分比之和必须为100
3. improvement_suggestions 按 priority 排序，优先给出最薄弱的知识点
4. overall_summary 要具体，不要套话
5. 所有fields都必须填充，不要遗漏`

export async function analyzeExam(
  examId: string,
  userId: string
): Promise<ExamAnalysis> {
  // 1. 获取考试数据
  const exam = await getExam(examId, userId)
  if (!exam) throw new Error('考试不存在')
  if (!exam.questions || exam.questions.length === 0) {
    throw new Error('考试没有题目数据，请先添加题目')
  }

  // 2. 标记为 processing
  const { data: analysis, error: insertError } = await supabase
    .from('exam_analyses')
    .insert({
      exam_id: examId,
      user_id: userId,
      status: 'processing',
    })
    .select()
    .single()

  if (insertError) throw new Error(`创建分析记录失败: ${insertError.message}`)

  try {
    // 3. 构建 prompt 给 AI
    const examData = {
      title: exam.title,
      total_score: exam.total_score,
      score: exam.score,
      question_count: exam.questions.length,
      questions: exam.questions.map((q: any) => ({
        index: q.index,
        content: q.content,
        score: q.score,
        earned: q.earned,
        difficulty: q.difficulty,
        knowledge_points: q.knowledge_points || [],
      })),
    }

    const userPrompt = `请分析以下考试数据：\n\n${JSON.stringify(examData, null, 2)}`

    // 4. 调用 DeepSeek Flash
    const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
      model: FLASH_MODEL,
      system: EXAM_ANALYSIS_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 2000,
      temperature: 0.2,
    }, userId)

    const aiResult = extractJSON(responseText) as {
      overall_summary: string
      knowledge_mastery: any[]
      error_attribution: any[]
      improvement_suggestions: any[]
    }

    // 5. 保存分析结果
    const { data: updated, error: updateError } = await supabase
      .from('exam_analyses')
      .update({
        status: 'completed',
        overall_summary: aiResult.overall_summary || '',
        knowledge_mastery: aiResult.knowledge_mastery || [],
        error_attribution: aiResult.error_attribution || [],
        improvement_suggestions: aiResult.improvement_suggestions || [],
        tokens_used: tokensIn + tokensOut,
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysis.id)
      .select()
      .single()

    if (updateError) throw new Error(`更新分析结果失败: ${updateError.message}`)

    trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

    return updated as ExamAnalysis
  } catch (err: any) {
    // Mark as failed
    await supabase
      .from('exam_analyses')
      .update({ status: 'failed' })
      .eq('id', analysis.id)

    throw err
  }
}

// ── 获取分析结果 ──────────────────────────────────
export async function getExamAnalysis(examId: string, userId: string): Promise<ExamAnalysis | null> {
  const { data, error } = await supabase
    .from('exam_analyses')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`查询分析结果失败: ${error.message}`)
  }
  return data as ExamAnalysis
}

// ═══════════════════════════════════════════════════════
//  综合诊断（桥接知识图谱 + 考试分析）
// ═══════════════════════════════════════════════════════

export async function getDiagnosis(userId: string): Promise<{
  allPoints: any[]
  weakPoints: any[]
  masteredCount: number
  totalCount: number
}> {
  // 获取用户最近的分析中的知识掌握度
  const { data: analyses } = await supabase
    .from('exam_analyses')
    .select('knowledge_mastery, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  // 获取所有知识点
  const { data: allPoints } = await supabase
    .from('knowledge_points')
    .select('*')
    .order('lft', { ascending: true })

  const points = allPoints || []
  const masteries: Record<string, number> = {}

  // 从最近分析中聚合掌握度
  for (const a of analyses || []) {
    const km = a.knowledge_mastery as any[] || []
    for (const k of km) {
      if (k.knowledge_id && (masteries[k.knowledge_id] === undefined || (k.mastery || 0) < masteries[k.knowledge_id])) {
        masteries[k.knowledge_id] = k.mastery || 0
      }
    }
  }

  // 同时从 user_model_mastery 获取掌握度
  const { data: modelMasteries } = await supabase
    .from('user_model_mastery')
    .select('model_id, mastery')
    .eq('user_id', userId)

  // 通过 model_knowledge_tags 关联
  if (modelMasteries && modelMasteries.length > 0) {
    const modelIds = modelMasteries.map(m => m.model_id)
    const { data: tags } = await supabase
      .from('model_knowledge_tags')
      .select('knowledge_id, model_id')
      .in('model_id', modelIds)

    for (const tag of tags || []) {
      const mm = modelMasteries.find(m => m.model_id === tag.model_id)
      if (mm && tag.knowledge_id) {
        if (masteries[tag.knowledge_id] === undefined || mm.mastery < masteries[tag.knowledge_id]) {
          masteries[tag.knowledge_id] = mm.mastery
        }
      }
    }
  }

  const masteredSet = new Set<string>()
  const weakPoints = points.filter((p: any) => {
    const m = masteries[p.id]
    if (m !== undefined && m >= 0.7) {
      masteredSet.add(p.id)
      return false
    }
    return m !== undefined && m < 0.7
  })

  return {
    allPoints: points,
    weakPoints,
    masteredCount: masteredSet.size,
    totalCount: points.length,
  }
}

// ═══════════════════════════════════════════════════════
//  学习计划
// ═══════════════════════════════════════════════════════

const PLAN_GENERATION_SYSTEM_PROMPT = `你是一位专业的学习规划师。根据学生的考试分析和薄弱知识点，生成个性化的学习计划。

输入数据包含：
- knowledge_mastery: 各知识点掌握度
- error_attribution: 错误归因
- duration_days: 计划天数（7/30/90）
- goal: 学生目标（可选）

严格输出 JSON（不要 markdown 代码块）：
{
  "title": "计划的标题",
  "goal_statement": "目标描述",
  "plan_content": [
    {
      "day": 1,
      "focus": "当日学习主题",
      "knowledge_points": ["相关知识点ID"],
      "tasks": [
        {
          "type": "review（复习）| practice（练习）| review_mistake（回顾错题）| read（阅读）| quiz（自测）",
          "description": "具体任务描述",
          "duration_min": 建议用时（分钟）
        }
      ],
      "total_duration_min": 当日总用时
    }
  ]
}

规则：
1. 按"先复习薄弱知识点 → 再针对性练习 → 最后综合巩固"的顺序安排
2. 每天总用时建议 45-120 分钟
3. 每3-5天安排一次综合复习
4. 确保覆盖所有薄弱知识点，掌握度越低安排越多时间
5. 尽量具体，给出可执行的任务描述`

export async function generatePlan(
  userId: string,
  examId: string,
  durationDays: number,
  goal?: string
): Promise<LearningPlan> {
  // 获取考试成绩
  const exam = await getExam(examId, userId)
  if (!exam) throw new Error('考试不存在')

  // 获取分析结果
  const analysis = await getExamAnalysis(examId, userId)
  if (!analysis) throw new Error('请先完成考试分析')

  const planInput = {
    knowledge_mastery: analysis.knowledge_mastery,
    error_attribution: analysis.error_attribution,
    duration_days: durationDays,
    goal: goal || `从${exam.score}/${exam.total_score}提升至${Math.min((exam.score || 0) + 20, exam.total_score || 150)}/${exam.total_score}`,
  }

  const userPrompt = `请生成 ${durationDays} 天学习计划：\n\n${JSON.stringify(planInput, null, 2)}`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: PLAN_GENERATION_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 3000,
    temperature: 0.3,
  }, userId)

  const aiResult = extractJSON(responseText) as {
    title: string
    goal_statement: string
    plan_content: any[]
  }

  const { data: plan, error } = await supabase
    .from('learning_plans')
    .insert({
      user_id: userId,
      exam_id: examId,
      title: aiResult.title || `${durationDays}天提升计划`,
      duration_days: durationDays,
      goal: goal || aiResult.goal_statement,
      plan_content: aiResult.plan_content || [],
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(`创建学习计划失败: ${error.message}`)

  trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

  return plan as LearningPlan
}

export async function getActivePlan(userId: string): Promise<LearningPlan | null> {
  const { data, error } = await supabase
    .from('learning_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`查询学习计划失败: ${error.message}`)
  }
  return data as LearningPlan
}

export async function updatePlanProgress(
  planId: string,
  userId: string,
  progress: number
): Promise<LearningPlan> {
  const { data, error } = await supabase
    .from('learning_plans')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`更新计划进度失败: ${error.message}`)
  return data as LearningPlan
}

// ═══════════════════════════════════════════════════════
//  AI 教练
// ═══════════════════════════════════════════════════════

const COACH_SYSTEM_PROMPT = `你是一位耐心、专业的 AI 学习教练。你的学生刚经历过考试，你需要：
1. 根据他们的考试结果给予鼓励和具体建议
2. 回答学习相关问题
3. 帮助制定和执行学习计划
4. 给出切实可行的提分建议

始终保持积极、支持性的语气。回答要具体、可操作，不要空泛说教。`

export async function askCoach(
  userId: string,
  question: string,
  examId?: string
): Promise<CoachMessage> {
  // 保存用户消息
  await supabase.from('coach_messages').insert({
    user_id: userId,
    role: 'user',
    content: question,
    message_type: 'question',
  })

  // 如果有考试ID，附加考试上下文
  let context = ''
  if (examId) {
    const analysis = await getExamAnalysis(examId, userId)
    if (analysis && analysis.status === 'completed') {
      context = `\n\n学生最近的考试分析概要：\n总体评价：${analysis.overall_summary}\n薄弱知识点：${JSON.stringify(analysis.knowledge_mastery?.filter((k: any) => (k.mastery || 0) < 0.6).map((k: any) => k.name))}\n错误归因：${JSON.stringify(analysis.error_attribution)}`
    }
  }

  const userPrompt = `${context ? `【考试背景】${context}\n\n` : ''}学生提问：${question}`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: COACH_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 1000,
    temperature: 0.5,
  }, userId)

  // 保存教练回复
  const { data: message, error } = await supabase
    .from('coach_messages')
    .insert({
      user_id: userId,
      role: 'assistant',
      content: responseText,
      message_type: 'advice',
    })
    .select()
    .single()

  if (error) throw new Error(`保存教练回复失败: ${error.message}`)

  trackCost(userId, FLASH_MODEL, tokensIn, tokensOut)

  return message as CoachMessage
}

export async function getCoachHistory(userId: string, limit = 20): Promise<CoachMessage[]> {
  const { data, error } = await supabase
    .from('coach_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`查询教练记录失败: ${error.message}`)
  return (data || []).reverse() as CoachMessage[]
}

// ═══════════════════════════════════════════════════════
//  每日提醒
// ═══════════════════════════════════════════════════════

export async function getDailyReminder(userId: string): Promise<DailyReminder | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // 没有今日提醒，自动生成
      return generateDailyReminder(userId)
    }
    throw new Error(`查询今日提醒失败: ${error.message}`)
  }
  return data as DailyReminder
}

async function generateDailyReminder(userId: string): Promise<DailyReminder> {
  // 获取当前活跃计划
  const plan = await getActivePlan(userId)
  // 获取最近一次分析
  const { data: recentAnalysis } = await supabase
    .from('exam_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 构建提醒内容
  let reminderTitle = '今日学习建议'
  let reminderContent = '今天继续按照学习计划执行，保持节奏！'

  if (plan && plan.plan_content) {
    const today = new Date()
    const startDate = new Date(plan.start_date)
    const dayDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const todayPlan = (plan.plan_content as any[])?.find((d: any) => d.day === dayDiff)

    if (todayPlan) {
      reminderTitle = `第${todayPlan.day}天：${todayPlan.focus}`
      reminderContent = `今日学习 ${todayPlan.total_duration_min || '?'} 分钟\n` +
        (todayPlan.tasks as any[])?.map((t: any) => `- ${t.description}（${t.duration_min}分钟）`).join('\n') || ''
    }
  } else if (recentAnalysis) {
    const km = (recentAnalysis.knowledge_mastery as any[]) || []
    const weakest = km.filter((k: any) => (k.mastery || 0) < 0.6)
    if (weakest.length > 0) {
      reminderTitle = '重点攻克薄弱知识点'
      reminderContent = `你的薄弱环节：${weakest.map((k: any) => k.name).join('、')}\n建议今天先复习这些知识点，再做针对性练习。`
    }
  }

  const { data, error } = await supabase
    .from('daily_reminders')
    .insert({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      title: reminderTitle,
      content: reminderContent,
      is_read: false,
      is_actioned: false,
    })
    .select()
    .single()

  if (error) throw new Error(`创建每日提醒失败: ${error.message}`)
  return data as DailyReminder
}

export async function acknowledgeReminder(
  reminderId: string,
  userId: string
): Promise<DailyReminder> {
  const { data, error } = await supabase
    .from('daily_reminders')
    .update({ is_read: true, is_actioned: true })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`确认提醒失败: ${error.message}`)
  return data as DailyReminder
}
