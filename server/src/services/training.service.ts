// ═══════════════════════════════════════════════════════
//  Training Service — EduMind 自适应训练引擎
// ═══════════════════════════════════════════════════════
import { supabase } from '../lib/supabase.js'

export interface TrainingRecord {
  id: string
  user_id: string
  model_id: string
  level: number
  score: number | null
  time_spent: number | null
  is_correct: boolean | null
  is_complete: boolean
  created_at: string
}

export interface ModelMastery {
  user_id: string
  model_id: string
  mastery: number
  level: number
  attempts: number
  avg_score: number
  last_practiced: string | null
}

// ── 提交训练结果 ──────────────────────────────

export async function submitTraining(
  userId: string,
  modelId: string,
  data: { score: number; timeSpent: number; isCorrect: boolean; level: number }
): Promise<TrainingRecord> {
  supabase

  const { data: record, error } = await supabase
    .from('training_records')
    .insert({
      user_id: userId,
      model_id: modelId,
      level: data.level,
      score: data.score,
      time_spent: data.timeSpent,
      is_correct: data.isCorrect,
      is_complete: true,
    })
    .select('*')
    .single()

  if (error) throw new Error(`提交失败: ${error.message}`)

  // 更新掌握度
  await updateMastery(userId, modelId)

  return record as TrainingRecord
}

async function updateMastery(userId: string, modelId: string): Promise<void> {
  supabase

  // 统计该模型的历史训练数据
  const { data: records } = await supabase
    .from('training_records')
    .select('score, level, is_correct')
    .eq('user_id', userId)
    .eq('model_id', modelId)
    .eq('is_complete', true)

  if (!records || records.length === 0) return

  const total = records.length
  const avgScore = records.reduce((s, r) => s + (r.score || 0), 0) / total
  const correctRate = records.filter(r => r.is_correct).length / total
  const maxLevel = Math.max(...records.map(r => r.level))

  // mastery = 正确率 × 0.6 + 平均分/100 × 0.4
  const mastery = Math.min(correctRate * 0.6 + (avgScore / 100) * 0.4, 1)

  // 升级逻辑：mastery >= 0.8 且 尝试次数 >= 3 且 最高level=当前 → 升级
  const { data: current } = await supabase
    .from('user_model_mastery')
    .select('level')
    .eq('user_id', userId)
    .eq('model_id', modelId)
    .single()

  const currentLevel = (current as ModelMastery | null)?.level || 1
  const nextLevel = (mastery >= 0.8 && total >= 3 && maxLevel >= currentLevel)
    ? Math.min(currentLevel + 1, 5)
    : currentLevel

  await supabase
    .from('user_model_mastery')
    .upsert({
      user_id: userId,
      model_id: modelId,
      mastery,
      level: nextLevel,
      attempts: total,
      avg_score: Math.round(avgScore * 10) / 10,
      last_practiced: new Date().toISOString(),
    }, { onConflict: 'user_id,model_id' })
}

// ── 查询 ──────────────────────────────────────────

export async function getTrainingProgress(userId: string): Promise<{
  records: TrainingRecord[]
  mastery: ModelMastery[]
}> {
  supabase

  const [{ data: records }, { data: mastery }] = await Promise.all([
    supabase.from('training_records').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('user_model_mastery').select('*').eq('user_id', userId).order('mastery', { ascending: false }),
  ])

  return {
    records: (records || []) as TrainingRecord[],
    mastery: (mastery || []) as ModelMastery[],
  }
}

export async function getNextRecommendedModel(userId: string): Promise<{
  modelId: string | null
  reason: string
}> {
  supabase

  // 获取用户薄弱项
  const { data: mastery } = await supabase
    .from('user_model_mastery')
    .select('*')
    .eq('user_id', userId)
    .order('mastery', { ascending: true })
    .limit(5)

  // 如果有薄弱模型，推荐掌握度最低的
  if (mastery && mastery.length > 0) {
    const weakest = (mastery as ModelMastery[])[0]
    return {
      modelId: weakest.model_id,
      reason: `你在「${weakest.model_id}」的掌握度为 ${Math.round(weakest.mastery * 100)}%，建议继续练习`,
    }
  }

  // 没有历史记录，推荐第一个立体几何模型
  const { data: firstModel } = await supabase
    .from('math_models')
    .select('id, title')
    .eq('category', '立体几何')
    .order('difficulty', { ascending: true })
    .limit(1)
    .single()

  if (firstModel) {
    return { modelId: firstModel.id, reason: `从「${(firstModel as any).title}」开始吧！` }
  }

  return { modelId: null, reason: '暂无推荐' }
}
