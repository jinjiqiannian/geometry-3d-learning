// ═══════════════════════════════════════════════════════
//  Mistake Service — 错题本 CRUD + AI 分析
// ═══════════════════════════════════════════════════════
import { supabase } from '../lib/supabase.js'

export interface MistakeRecord {
  id: string
  user_id: string
  problem_text: string
  parsed_data: any
  wrong_answer: string | null
  correct_answer: string | null
  error_type: 'concept' | 'calculation' | 'careless' | 'other' | null
  geometry_type: string | null
  knowledge_point: string | null
  difficulty: number
  resolved: boolean
  tags: string[]
  workspace_id: string | null
  created_at: string
  resolved_at: string | null
}

export interface CreateMistakeInput {
  problem_text: string
  parsed_data?: any
  wrong_answer?: string
  correct_answer?: string
  error_type?: 'concept' | 'calculation' | 'careless' | 'other'
  geometry_type?: string
  knowledge_point?: string
  difficulty?: number
  workspace_id?: string
}

export interface AIAnalysis {
  error_type: 'concept' | 'calculation' | 'careless' | 'other'
  knowledge_point: string
  matched_model_id: string | null
  explanation: string
  suggestion: string
}

// ── CRUD ──────────────────────────────────────────

export async function listMistakes(
  userId: string,
  options?: {
    resolved?: boolean
    errorType?: string
    knowledgePoint?: string
    limit?: number
    offset?: number
  }
): Promise<{ items: MistakeRecord[]; total: number }> {
  supabase

  let query = supabase
    .from('error_book')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options?.resolved !== undefined) query = query.eq('resolved', options.resolved)
  if (options?.errorType) query = query.eq('error_type', options.errorType)
  if (options?.knowledgePoint) query = query.eq('knowledge_point', options.knowledgePoint)
  if (options?.limit) query = query.range(options.offset || 0, (options.offset || 0) + options.limit - 1)

  const { data, error, count } = await query
  if (error) throw new Error(`查询错题失败: ${error.message}`)

  return { items: (data || []) as MistakeRecord[], total: count || 0 }
}

export async function getMistake(id: string, userId: string): Promise<MistakeRecord | null> {
  supabase

  const { data, error } = await supabase
    .from('error_book')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as MistakeRecord
}

export async function createMistake(userId: string, input: CreateMistakeInput): Promise<MistakeRecord> {
  supabase

  const { data, error } = await supabase
    .from('error_book')
    .insert({
      user_id: userId,
      problem_text: input.problem_text,
      parsed_data: input.parsed_data || {},
      wrong_answer: input.wrong_answer || null,
      correct_answer: input.correct_answer || null,
      error_type: input.error_type || null,
      geometry_type: input.geometry_type || null,
      knowledge_point: input.knowledge_point || null,
      difficulty: input.difficulty || 1,
      workspace_id: input.workspace_id || null,
    })
    .select()
    .single()

  if (error) throw new Error(`创建错题失败: ${error.message}`)
  return data as MistakeRecord
}

export async function updateMistake(
  id: string,
  userId: string,
  updates: Partial<{
    wrong_answer: string
    correct_answer: string
    error_type: string
    knowledge_point: string
    difficulty: number
    resolved: boolean
    tags: string[]
  }>
): Promise<MistakeRecord> {
  supabase

  const payload: any = { ...updates }
  if (updates.resolved === true) payload.resolved_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('error_book')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`更新错题失败: ${error.message}`)
  return data as MistakeRecord
}

export async function deleteMistake(id: string, userId: string): Promise<void> {
  supabase

  const { error } = await supabase
    .from('error_book')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(`删除错题失败: ${error.message}`)
}

// ── 统计 ──────────────────────────────────────────

export interface MistakeStats {
  total: number
  unresolved: number
  byType: Record<string, number>
  byKnowledgePoint: Record<string, number>
}

export async function getMistakeStats(userId: string): Promise<MistakeStats> {
  const { items } = await listMistakes(userId)

  const byType: Record<string, number> = {}
  const byKnowledgePoint: Record<string, number> = {}

  for (const item of items) {
    if (item.error_type) byType[item.error_type] = (byType[item.error_type] || 0) + 1
    if (item.knowledge_point) byKnowledgePoint[item.knowledge_point] = (byKnowledgePoint[item.knowledge_point] || 0) + 1
  }

  return {
    total: items.length,
    unresolved: items.filter(i => !i.resolved).length,
    byType,
    byKnowledgePoint,
  }
}

// ── AI 错题分析 ──────────────────────────────────

/**
 * 对错题执行 AI 分析（调用 DeepSeek Flash）
 * 分析错误类型、知识点、给出建议
 */
export async function analyzeMistake(
  problemText: string,
  wrongAnswer?: string,
  correctAnswer?: string
): Promise<AIAnalysis> {
  const { env } = await import('../config/env.js')

  const prompt = `你是一个数学错题分析专家。分析以下错题：

题目：${problemText}
${wrongAnswer ? `学生答案：${wrongAnswer}` : ''}
${correctAnswer ? `正确答案：${correctAnswer}` : ''}

请输出 JSON：
{
  "error_type": "concept|calculation|careless|other",
  "knowledge_point": "知识点标签",
  "matched_model_id": null,
  "explanation": "错误原因分析",
  "suggestion": "改进建议"
}

要求：
- error_type: concept=概念理解错, calculation=计算错, careless=审题粗心
- knowledge_point: 用中文短标签，如"异面直线夹角"、"体对角线"
- explanation: 1-2句话说明错因
- suggestion: 1-2句话给出改进建议`

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个数学错题分析专家。只输出 JSON，不要额外文字。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    throw new Error('AI 分析失败')
  }

  const data = await response.json() as any
  const text = data.choices?.[0]?.message?.content || '{}'

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      error_type: 'other',
      knowledge_point: '未知',
      matched_model_id: null,
      explanation: 'AI 分析暂不可用',
      suggestion: '请自行分析错误原因',
    }
  }

  try {
    return JSON.parse(jsonMatch[0]) as AIAnalysis
  } catch {
    return {
      error_type: 'other',
      knowledge_point: '未知',
      matched_model_id: null,
      explanation: 'AI 分析暂不可用',
      suggestion: '请自行分析错误原因',
    }
  }
}
