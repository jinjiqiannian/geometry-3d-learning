// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  Exam Service �� EduMind ���� CRUD + AI ����
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
import { getSupabase } from '../db/client.js'
import type { Exam, ExamAnalysis, LearningPlan, CoachMessage, DailyReminder } from '../types/edumind.js'
import { callDeepSeek, extractJSON } from './ai.service.js'

const FLASH_MODEL = 'deepseek-chat'

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  Exam CRUD
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

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
  const { data: exam, error } = await getSupabase()
    .from('exams')
    .insert({
      user_id: userId,
      title: data.title,
      subject: data.subject || '��ѧ',
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

  if (error) throw new Error(`��������ʧ��: ${error.message}`)
  return exam as Exam
}

export async function listExams(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ items: Exam[]; total: number }> {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await getSupabase()
    .from('exams')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('exam_date', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`��ѯ�����б�ʧ��: ${error.message}`)
  return { items: (data || []) as Exam[], total: count || 0 }
}

export async function getExam(examId: string, userId: string): Promise<Exam | null> {
  const { data, error } = await getSupabase()
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`��ѯ����ʧ��: ${error.message}`)
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
  const { data: exam, error } = await getSupabase()
    .from('exams')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', examId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`���¿���ʧ��: ${error.message}`)
  return exam as Exam
}

export async function deleteExam(examId: string, userId: string): Promise<void> {
  // Also delete associated analysis
  await getSupabase().from('exam_analyses').delete().eq('exam_id', examId)
  await getSupabase().from('learning_plans').delete().eq('exam_id', examId)

  const { error } = await getSupabase()
    .from('exams')
    .delete()
    .eq('id', examId)
    .eq('user_id', userId)

  if (error) throw new Error(`ɾ������ʧ��: ${error.message}`)
}

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  AI ���Է���
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

const EXAM_ANALYSIS_SYSTEM_PROMPT = `����?λ����ḻ�ĸ�����ѧ��ʦ�����ݷ���ʦ����������Ƿ���ѧ���Ŀ��Խ��������ṹ������ϱ��档

�������� JSON ��ʽ�Ŀ������ݣ�
- questions: ��Ŀ���飬ÿ������� content������ժҪ����score�����֣���earned���÷֣���difficulty���Ѷ�1-5����knowledge_points������֪ʶ�㣩
- ����ÿ����ĵ÷��ʺ�����÷���

�ϸ���� JSON����Ҫ markdown ����飩��
{
  "overall_summary": "2-3�仰���������ۣ������ܷ֡���Ҫ����͸Ľ�����",
  "knowledge_mastery": [
    {
      "knowledge_id": "֪ʶ���ID������Ŀ�е�knowledge_points��ȡ������Ŀû������������ƶϣ���KP-ǰ׺��",
      "name": "֪ʶ�����ƣ����ģ���"����ֱ�߼н�"��",
      "mastery": ���ն�0-1,
      "importance": ��Ҫ��1-5,
      "questions_count": �漰����,
      "correct_rate": ��ȷ��0-1
    }
  ],
  "error_attribution": [
    {
      "type": "knowledge_gap��֪ʶ©����| calculation_error������ʧ��| reading_error���������| time_pressure��ʱ��ѹ����| psychological���������أ�",
      "percentage": ������ռ��(�ٷֱ����֣�������֮��Ϊ100),
      "description": "�����ʹ������ϸ˵��"
    }
  ],
  "improvement_suggestions": [
    {
      "knowledge_id": "֪ʶ��ID",
      "priority": ���ȼ�1-5��1�������,
      "suggestion": "����ԵĸĽ������ѧϰ����"
    }
  ]
}

����
1. knowledge_mastery �е� mastery ���ݵ÷��ʼ��㣺��ȷ�� >= 0.9 �� 0.9-1.0, 0.7-0.9 �� 0.6-0.9, 0.5-0.7 �� 0.3-0.6, <0.5 �� 0-0.3
2. error_attribution ��������Ͱٷֱ�֮�ͱ���Ϊ100
3. improvement_suggestions �� priority �������ȸ��������֪ʶ��
4. overall_summary Ҫ���壬��Ҫ�׻�
5. ����fields��������䣬��Ҫ��©`

export async function analyzeExam(
  examId: string,
  userId: string
): Promise<ExamAnalysis> {
  // 1. ��ȡ��������
  const exam = await getExam(examId, userId)
  if (!exam) throw new Error('���Բ�����')
  if (!exam.questions || exam.questions.length === 0) {
    throw new Error('����û����Ŀ���ݣ�����������Ŀ')
  }

  // 2. ���Ϊ processing
  const { data: analysis, error: insertError } = await getSupabase()
    .from('exam_analyses')
    .insert({
      exam_id: examId,
      user_id: userId,
      status: 'processing',
    })
    .select()
    .single()

  if (insertError) throw new Error(`����������¼ʧ��: ${insertError.message}`)

  try {
    // 3. ���� prompt �� AI
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

    const userPrompt = `��������¿������ݣ�\n\n${JSON.stringify(examData, null, 2)}`

    // 4. ���� DeepSeek Flash
    const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
      model: FLASH_MODEL,
      system: EXAM_ANALYSIS_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 2000,
      temperature: 0.2,
    }, )

    const aiResult = extractJSON(responseText) as {
      overall_summary: string
      knowledge_mastery: any[]
      error_attribution: any[]
      improvement_suggestions: any[]
    }

    // 5. ����������
    const { data: updated, error: updateError } = await getSupabase()
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

    if (updateError) throw new Error(`���·������ʧ��: ${updateError.message}`)

    return updated as ExamAnalysis
  } catch (err: any) {
    // Mark as failed
    await getSupabase()
      .from('exam_analyses')
      .update({ status: 'failed' })
      .eq('id', analysis.id)

    throw err
  }
}

// ���� ��ȡ������� ��������������������������������������������������������������������
export async function getExamAnalysis(examId: string, userId: string): Promise<ExamAnalysis | null> {
  const { data, error } = await getSupabase()
    .from('exam_analyses')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`��ѯ�������ʧ��: ${error.message}`)
  }
  return data as ExamAnalysis
}

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  �ۺ���ϣ��Ž�֪ʶͼ�� + ���Է�����
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

export async function getDiagnosis(userId: string): Promise<{
  allPoints: any[]
  weakPoints: any[]
  masteredCount: number
  totalCount: number
}> {
  // ��ȡ�û�����ķ����е�֪ʶ���ն�
  const { data: analyses } = await getSupabase()
    .from('exam_analyses')
    .select('knowledge_mastery, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  // ��ȡ����֪ʶ��
  const { data: allPoints } = await getSupabase()
    .from('knowledge_points')
    .select('*')
    .order('lft', { ascending: true })

  const points = allPoints || []
  const masteries: Record<string, number> = {}

  // ����������оۺ����ն�
  for (const a of analyses || []) {
    const km = a.knowledge_mastery as any[] || []
    for (const k of km) {
      if (k.knowledge_id && (masteries[k.knowledge_id] === undefined || (k.mastery || 0) < masteries[k.knowledge_id])) {
        masteries[k.knowledge_id] = k.mastery || 0
      }
    }
  }

  // ͬʱ�� user_model_mastery ��ȡ���ն�
  const { data: modelMasteries } = await getSupabase()
    .from('user_model_mastery')
    .select('model_id, mastery')
    .eq('user_id', userId)

  // ͨ�� model_knowledge_tags ����
  if (modelMasteries && modelMasteries.length > 0) {
    const modelIds = modelMasteries.map(m => m.model_id)
    const { data: tags } = await getSupabase()
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

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  ѧϰ�ƻ�
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

const PLAN_GENERATION_SYSTEM_PROMPT = `����һλרҵ��ѧϰ�滮ʦ������ѧ���Ŀ��Է����ͱ���֪ʶ�㣬���ɸ��Ի���ѧϰ�ƻ���

�������ݰ�����
- knowledge_mastery: ��֪ʶ�����ն�
- error_attribution: �������
- duration_days: �ƻ�������7/30/90��
- goal: ѧ��Ŀ�꣨��ѡ��

�ϸ���� JSON����Ҫ markdown ����飩��
{
  "title": "�ƻ��ı���",
  "goal_statement": "Ŀ������",
  "plan_content": [
    {
      "day": 1,
      "focus": "����ѧϰ����",
      "knowledge_points": ["���֪ʶ��ID"],
      "tasks": [
        {
          "type": "review����ϰ��| practice����ϰ��| review_mistake���ع˴��⣩| read���Ķ���| quiz���Բ⣩",
          "description": "������������",
          "duration_min": ������ʱ�����ӣ�
        }
      ],
      "total_duration_min": ��������ʱ
    }
  ]
}

����
1. ��"�ȸ�ϰ����֪ʶ�� �� ���������ϰ �� ����ۺϹ���"��˳����
2. ÿ������ʱ���� 45-120 ����
3. ÿ3-5�찲��һ���ۺϸ�ϰ
4. ȷ���������б���֪ʶ�㣬���ն�Խ�Ͱ���Խ��ʱ��
5. �������壬������ִ�е���������`

export async function generatePlan(
  userId: string,
  examId: string,
  durationDays: number,
  goal?: string
): Promise<LearningPlan> {
  // ��ȡ���Գɼ�
  const exam = await getExam(examId, userId)
  if (!exam) throw new Error('���Բ�����')

  // ��ȡ�������
  const analysis = await getExamAnalysis(examId, userId)
  if (!analysis) throw new Error('������ɿ��Է���')

  const planInput = {
    knowledge_mastery: analysis.knowledge_mastery,
    error_attribution: analysis.error_attribution,
    duration_days: durationDays,
    goal: goal || `��${exam.score}/${exam.total_score}������${Math.min((exam.score || 0) + 20, exam.total_score || 150)}/${exam.total_score}`,
  }

  const userPrompt = `������ ${durationDays} ��ѧϰ�ƻ���\n\n${JSON.stringify(planInput, null, 2)}`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: PLAN_GENERATION_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 3000,
    temperature: 0.3,
  })

  const aiResult = extractJSON(responseText) as {
    title: string
    goal_statement: string
    plan_content: any[]
  }

  const { data: plan, error } = await getSupabase()
    .from('learning_plans')
    .insert({
      user_id: userId,
      exam_id: examId,
      title: aiResult.title || `${durationDays}�������ƻ�`,
      duration_days: durationDays,
      goal: goal || aiResult.goal_statement,
      plan_content: aiResult.plan_content || [],
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(`����ѧϰ�ƻ�ʧ��: ${error.message}`)

  
  return plan as LearningPlan
}

export async function getActivePlan(userId: string): Promise<LearningPlan | null> {
  const { data, error } = await getSupabase()
    .from('learning_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`��ѯѧϰ�ƻ�ʧ��: ${error.message}`)
  }
  return data as LearningPlan
}

export async function updatePlanProgress(
  planId: string,
  userId: string,
  progress: number
): Promise<LearningPlan> {
  const { data, error } = await getSupabase()
    .from('learning_plans')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`���¼ƻ�����ʧ��: ${error.message}`)
  return data as LearningPlan
}

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  AI ����
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

const COACH_SYSTEM_PROMPT = `����һλ���ġ�רҵ�� AI ѧϰ���������ѧ���վ��������ԣ�����Ҫ��
1. �������ǵĿ��Խ����������;��彨��
2. �ش�ѧϰ�������
3. �����ƶ���ִ��ѧϰ�ƻ�
4. ������ʵ���е���ֽ���

ʼ�ձ��ֻ�����֧���Ե��������ش�Ҫ���塢�ɲ�������Ҫ�շ�˵�̡�`

export async function askCoach(
  userId: string,
  question: string,
  examId?: string
): Promise<CoachMessage> {
  // �����û���Ϣ
  await getSupabase().from('coach_messages').insert({
    user_id: userId,
    role: 'user',
    content: question,
    message_type: 'question',
  })

  // ����п���ID�����ӿ���������
  let context = ''
  if (examId) {
    const analysis = await getExamAnalysis(examId, userId)
    if (analysis && analysis.status === 'completed') {
      context = `\n\nѧ������Ŀ��Է�����Ҫ��\n�������ۣ�${analysis.overall_summary}\n����֪ʶ�㣺${JSON.stringify(analysis.knowledge_mastery?.filter((k: any) => (k.mastery || 0) < 0.6).map((k: any) => k.name))}\n�������${JSON.stringify(analysis.error_attribution)}`
    }
  }

  const userPrompt = `${context ? `�����Ա�����${context}\n\n` : ''}ѧ�����ʣ�${question}`

  const { text: responseText, tokensIn, tokensOut } = await callDeepSeek({
    model: FLASH_MODEL,
    system: COACH_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 1000,
    temperature: 0.5,
  })

  // ��������ظ�
  const { data: message, error } = await getSupabase()
    .from('coach_messages')
    .insert({
      user_id: userId,
      role: 'assistant',
      content: responseText,
      message_type: 'advice',
    })
    .select()
    .single()

  if (error) throw new Error(`��������ظ�ʧ��: ${error.message}`)

  
  return message as CoachMessage
}

export async function getCoachHistory(userId: string, limit = 20): Promise<CoachMessage[]> {
  const { data, error } = await getSupabase()
    .from('coach_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`��ѯ������¼ʧ��: ${error.message}`)
  return (data || []).reverse() as CoachMessage[]
}

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  Student Model
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

export async function getStudentProfile(userId: string): Promise<{
  studentId: string
  masteryMap: Record<string, number>
  mistakePatterns: { type: string; count: number }[]
  strengths: string[]
  weaknesses: string[]
  learningStyle: string
  examCount: number
  recentTrend: 'improving' | 'stable' | 'declining'
}> {
  const { data: mastery } = await getSupabase()
    .from('knowledge_mastery')
    .select('*')
    .eq('user_id', userId)

  const { data: mistakes } = await getSupabase()
    .from('mistakes')
    .select('type')
    .eq('user_id', userId)

  const { count: examCount } = await getSupabase()
    .from('exams')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const masteryMap: Record<string, number> = {}
  const strengths: string[] = []
  const weaknesses: string[] = []

  for (const m of (mastery || []) as any[]) {
    masteryMap[m.knowledge_point] = m.mastery
    if (m.mastery >= 0.7) strengths.push(m.knowledge_point)
    else if (m.mastery < 0.5) weaknesses.push(m.knowledge_point)
  }

  const patternCount: Record<string, number> = {}
  for (const m of (mistakes || []) as any[]) {
    patternCount[m.type] = (patternCount[m.type] || 0) + 1
  }
  const mistakePatterns = Object.entries(patternCount).map(([type, count]) => ({ type, count }))

  return {
    studentId: userId,
    masteryMap,
    mistakePatterns,
    strengths,
    weaknesses,
    learningStyle: 'practice',
    examCount: examCount || 0,
    recentTrend: strengths.length >= weaknesses.length ? 'improving' : 'stable',
  }
}

export async function getStudentMastery(userId: string): Promise<any[]> {
  const { data } = await getSupabase()
    .from('knowledge_mastery')
    .select('*')
    .eq('user_id', userId)
    .order('mastery', { ascending: true })
  return (data || []) as any[]
}

export async function getStudentMistakePatterns(userId: string): Promise<{ type: string; count: number }[]> {
  const { data } = await getSupabase()
    .from('mistakes')
    .select('type')
    .eq('user_id', userId)

  const counts: Record<string, number> = {}
  for (const m of (data || []) as any[]) {
    counts[m.type] = (counts[m.type] || 0) + 1
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
}

// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
//  ÿ������
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

export async function getDailyReminder(userId: string): Promise<DailyReminder | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await getSupabase()
    .from('daily_reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // û�н������ѣ��Զ�����
      return generateDailyReminder(userId)
    }
    throw new Error(`��ѯ��������ʧ��: ${error.message}`)
  }
  return data as DailyReminder
}

async function generateDailyReminder(userId: string): Promise<DailyReminder> {
  // ��ȡ��ǰ��Ծ�ƻ�
  const plan = await getActivePlan(userId)
  // ��ȡ���һ�η���
  const { data: recentAnalysis } = await getSupabase()
    .from('exam_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // ������������
  let reminderTitle = '����ѧϰ����'
  let reminderContent = '�����������ѧϰ�ƻ�ִ�У����ֽ��࣡'

  if (plan && plan.plan_content) {
    const today = new Date()
    const startDate = new Date(plan.start_date)
    const dayDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const todayPlan = (plan.plan_content as any[])?.find((d: any) => d.day === dayDiff)

    if (todayPlan) {
      reminderTitle = `��${todayPlan.day}�죺${todayPlan.focus}`
      reminderContent = `����ѧϰ ${todayPlan.total_duration_min || '?'} ����\n` +
        (todayPlan.tasks as any[])?.map((t: any) => `- ${t.description}��${t.duration_min}���ӣ�`).join('\n') || ''
    }
  } else if (recentAnalysis) {
    const km = (recentAnalysis.knowledge_mastery as any[]) || []
    const weakest = km.filter((k: any) => (k.mastery || 0) < 0.6)
    if (weakest.length > 0) {
      reminderTitle = '�ص㹥�˱���֪ʶ��'
      reminderContent = `��ı������ڣ�${weakest.map((k: any) => k.name).join('��')}\n��������ȸ�ϰ��Щ֪ʶ�㣬�����������ϰ��`
    }
  }

  const { data, error } = await getSupabase()
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

  if (error) throw new Error(`����ÿ������ʧ��: ${error.message}`)
  return data as DailyReminder
}

export async function acknowledgeReminder(
  reminderId: string,
  userId: string
): Promise<DailyReminder> {
  const { data, error } = await getSupabase()
    .from('daily_reminders')
    .update({ is_read: true, is_actioned: true })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`ȷ������ʧ��: ${error.message}`)
  return data as DailyReminder
}
