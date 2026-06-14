// ═══════════════════════════════════════════════════════
//  Model Service — 数学模型库
// ═══════════════════════════════════════════════════════
import { supabase } from '../lib/supabase.js'

export interface MathModel {
  id: string
  title: string
  category: string
  difficulty: number
  sub_category: string | null
  methods: string[]
  traps: string[]
  ai_prompt: string | null
  recognition: string[]
  created_at: string
}

export interface ProblemBankItem {
  id: string
  model_id: string
  title: string
  content: string
  answer: string | null
  difficulty: number
  source: string | null
  params: Record<string, any>
  is_template: boolean
  created_at: string
}

// ── 查询 ──────────────────────────────────────────

export async function listModels(category?: string): Promise<MathModel[]> {
  supabase
  let query = supabase.from('math_models').select('*').order('difficulty', { ascending: true })

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) throw new Error(`查询模型失败: ${error.message}`)
  return (data || []) as MathModel[]
}

export async function getModel(id: string): Promise<{
  model: MathModel | null
  examples: ProblemBankItem[]
}> {
  supabase

  const { data: model } = await supabase
    .from('math_models')
    .select('*')
    .eq('id', id)
    .single()

  if (!model) return { model: null, examples: [] }

  const { data: examples } = await supabase
    .from('problem_bank')
    .select('*')
    .eq('model_id', id)
    .order('difficulty', { ascending: true })
    .limit(10)

  return {
    model: model as MathModel,
    examples: (examples || []) as ProblemBankItem[],
  }
}

// ── 模型匹配引擎 ────────────────────────────────

export interface MatchResult {
  modelId: string | null
  confidence: number      // 0-1
  matchedKeywords: string[]
}

/**
 * 根据题目文本匹配数学模型
 * 策略：关键词匹配 → 按命中率排序
 */
export function matchModel(problemText: string, models: MathModel[]): MatchResult {
  const normalized = problemText.toLowerCase().replace(/\s+/g, '')

  let best: MatchResult = { modelId: null, confidence: 0, matchedKeywords: [] }

  for (const model of models) {
    const keywords = model.recognition || []
    const matched = keywords.filter(kw => normalized.includes(kw.toLowerCase().replace(/\s+/g, '')))

    if (matched.length === 0) continue

    const confidence = Math.min(matched.length / Math.max(keywords.length, 1), 1)

    if (confidence > best.confidence || (confidence === best.confidence && matched.length > best.matchedKeywords.length)) {
      best = { modelId: model.id, confidence, matchedKeywords: matched }
    }
  }

  return best
}

export async function matchModelFromDB(problemText: string, category?: string): Promise<MatchResult> {
  const models = await listModels(category)
  return matchModel(problemText, models)
}
