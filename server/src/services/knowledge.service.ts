// ═══════════════════════════════════════════════════════
//  Knowledge Service — 知识图谱 CRUD + 查询
// ═══════════════════════════════════════════════════════
import { getAnonClient } from '../db/client.js'
import type { KnowledgePoint, KnowledgePrerequisite } from '../types/index.js'

// ── 查询 ──────────────────────────────────────────

/**
 * 获取全部知识点（树形结构，按 lft 排序）
 */
export async function listKnowledgePoints(category?: string): Promise<KnowledgePoint[]> {
  const supabase = getAnonClient()

  let query = supabase
    .from('knowledge_points')
    .select('*')
    .order('lft', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(`查询知识点失败: ${error.message}`)
  return (data || []) as KnowledgePoint[]
}

/**
 * 获取单个知识点详情（含前置知识）
 */
export async function getKnowledgePoint(id: string): Promise<{
  point: KnowledgePoint | null
  prerequisites: KnowledgePoint[]
  children: KnowledgePoint[]
}> {
  const supabase = getAnonClient()

  // 当前节点
  const { data: point } = await supabase
    .from('knowledge_points')
    .select('*')
    .eq('id', id)
    .single()

  if (!point) return { point: null, prerequisites: [], children: [] }

  // 前置知识
  const { data: prereqLinks } = await supabase
    .from('knowledge_prerequisites')
    .select('prerequisite_id')
    .eq('knowledge_id', id)

  const prereqIds = (prereqLinks || []).map(p => p.prerequisite_id)

  let prerequisites: KnowledgePoint[] = []
  if (prereqIds.length > 0) {
    const { data: prereqPoints } = await supabase
      .from('knowledge_points')
      .select('*')
      .in('id', prereqIds)
    prerequisites = (prereqPoints || []) as KnowledgePoint[]
  }

  // 子节点（嵌套集：lft > parent.lft AND rgt < parent.rgt AND depth = parent.depth + 1）
  const { data: children } = await supabase
    .from('knowledge_points')
    .select('*')
    .gt('lft', point.lft)
    .lt('rgt', point.rgt)
    .eq('depth', point.depth + 1)
    .order('lft', { ascending: true })

  return {
    point: point as KnowledgePoint,
    prerequisites,
    children: (children || []) as KnowledgePoint[],
  }
}

/**
 * 获取学习路径（从根基到目标知识点）
 */
export async function getLearningPath(targetId: string): Promise<KnowledgePoint[]> {
  const supabase = getAnonClient()

  const { data: target } = await supabase
    .from('knowledge_points')
    .select('*')
    .eq('id', targetId)
    .single()

  if (!target) return []

  // 嵌套集：所有 lft < target.lft AND rgt > target.rgt 的节点 = 祖先路径
  const { data: path } = await supabase
    .from('knowledge_points')
    .select('*')
    .lt('lft', target.lft)
    .gt('rgt', target.rgt)
    .order('lft', { ascending: true })

  return (path || []) as KnowledgePoint[]
}

/**
 * 分析用户薄弱项（对比已掌握 vs 全部知识点）
 */
export async function analyzeWeaknesses(
  userId: string,
  category?: string
): Promise<{
  weakPoints: KnowledgePoint[]
  masteredCount: number
  totalCount: number
}> {
  const supabase = getAnonClient()

  // 获取用户错题关联的知识点
  const { data: errorPoints } = await supabase
    .from('error_book')
    .select('knowledge_gaps')
    .eq('user_id', userId)

  // 从错题中提取薄弱知识点
  const weakIds = new Set<string>()
  for (const record of errorPoints || []) {
    const gaps = record.knowledge_gaps as string[] | null
    if (gaps) {
      for (const id of gaps) weakIds.add(id)
    }
  }

  // 获取用户训练过的知识点
  const { data: trainedModels } = await supabase
    .from('user_model_mastery')
    .select('model_id')
    .eq('user_id', userId)
    .gte('mastery', 0.7) // 掌握度 >= 70% 视为已掌握

  const masteredModels = new Set((trainedModels || []).map(m => m.model_id))

  // 通过模型-知识点关联反推已掌握的知识点
  let masteredIds: string[] = []
  if (masteredModels.size > 0) {
    const { data: masteredTags } = await supabase
      .from('model_knowledge_tags')
      .select('knowledge_id')
      .in('model_id', Array.from(masteredModels))

    masteredIds = [...new Set((masteredTags || []).map(t => t.knowledge_id))]
  }

  // 获取全部知识点
  let query = supabase
    .from('knowledge_points')
    .select('*')
    .order('lft', { ascending: true })

  if (category) query = query.eq('category', category)

  const { data: allPoints } = await query
  const points = (allPoints || []) as KnowledgePoint[]

  // 薄弱 = 全部 - 已掌握 + 错题标注
  const masteredSet = new Set(masteredIds)
  const weakPoints = points.filter(p => !masteredSet.has(p.id) || weakIds.has(p.id))

  return {
    weakPoints,
    masteredCount: masteredSet.size,
    totalCount: points.length,
  }
}
