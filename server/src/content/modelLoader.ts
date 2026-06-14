// ═══════════════════════════════════════════════════════
//  MathModel Loader — 从 /content/models/ 加载数学模型
//  源文件为 JSON，启动时加载到内存，运行时只读
// ═══════════════════════════════════════════════════════
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { MathModel, ModelCategory, DifficultyLevel } from '../types/index.js'

// ── 路径解析 ──────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const CONTENT_DIR = resolve(__dirname, '../../../../content/models')

// ── 内存存储 ──────────────────────────────────────
let loaded = false
const models = new Map<string, MathModel>()
const byCategory = new Map<ModelCategory, MathModel[]>()

// ── 匹配结果 ──────────────────────────────────────
export interface MatchResult {
  model: MathModel
  confidence: 'high' | 'medium' | 'low'
  matchedBy: 'keyword' | 'pattern' | 'llm'
}

// ═══════════════════════════════════════════════════════
//  初始化
// ═══════════════════════════════════════════════════════

function walkDir(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...walkDir(full))
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(full)
      }
    }
  } catch {
    // Directory doesn't exist yet — that's OK for development
  }
  return files
}

/**
 * 加载所有模型到内存。启动时调用一次。
 */
export function loadModels(): void {
  if (loaded) return
  models.clear()
  byCategory.clear()

  const files = walkDir(CONTENT_DIR)
  let loadedCount = 0
  let errorCount = 0

  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf-8')
      const model = JSON.parse(raw) as MathModel

      // Basic validation
      if (!model.id || !model.title || !model.category) {
        console.warn(`  ⚠️ Model loader: skipping ${file} — missing id/title/category`)
        errorCount++
        continue
      }

      if (models.has(model.id)) {
        console.warn(`  ⚠️ Model loader: duplicate id "${model.id}" in ${file}`)
        errorCount++
        continue
      }

      models.set(model.id, model)
      const cat = model.category as ModelCategory
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(model)
      loadedCount++
    } catch (err) {
      console.warn(`  ⚠️ Model loader: error reading ${file}:`, (err as Error).message)
      errorCount++
    }
  }

  // Sort each category by difficulty
  for (const [, catModels] of byCategory) {
    catModels.sort((a, b) => a.difficulty - b.difficulty)
  }

  loaded = true
  console.log(`  📚 MathModel loaded: ${loadedCount} models (${errorCount} errors)`)
}

// ═══════════════════════════════════════════════════════
//  查询接口
// ═══════════════════════════════════════════════════════

/** 获取所有模型 */
export function getAllModels(): MathModel[] {
  if (!loaded) loadModels()
  return Array.from(models.values())
}

/** 按 ID 获取模型 */
export function getModelById(id: string): MathModel | undefined {
  if (!loaded) loadModels()
  return models.get(id)
}

/** 按分类获取模型 */
export function getModelsByCategory(category: ModelCategory): MathModel[] {
  if (!loaded) loadModels()
  return byCategory.get(category) || []
}

/** 按难度过滤 */
export function getModelsByDifficulty(min: DifficultyLevel, max: DifficultyLevel): MathModel[] {
  if (!loaded) loadModels()
  return Array.from(models.values()).filter(
    m => m.difficulty >= min && m.difficulty <= max
  )
}

// ═══════════════════════════════════════════════════════
//  文本匹配引擎
// ═══════════════════════════════════════════════════════

/**
 * 将输入题目文本与模型库匹配
 * 先关键词 → 再正则 → 返回所有匹配结果（按置信度排序）
 */
export function matchProblem(text: string): MatchResult[] {
  if (!loaded) loadModels()
  if (!text || text.length < 3) return []

  const results: MatchResult[] = []
  const normalized = text.toLowerCase()

  for (const model of models.values()) {
    const { keywords, patterns, requiresLLM } = model.recognition

    // Step 1: 关键词匹配
    const keywordHit = keywords.some(kw => normalized.includes(kw.toLowerCase()))
    if (!keywordHit) continue

    // Step 2: 正则匹配
    const patternHit = patterns.some(p => {
      try {
        return new RegExp(p, 'i').test(normalized)
      } catch {
        return false
      }
    })

    if (patternHit) {
      results.push({ model, confidence: 'high', matchedBy: 'pattern' })
    } else if (keywordHit) {
      results.push({
        model,
        confidence: requiresLLM ? 'low' : 'medium',
        matchedBy: requiresLLM ? 'llm' : 'keyword',
      })
    }
  }

  // 按置信度排序
  const order = { high: 0, medium: 1, low: 2 }
  results.sort((a, b) => order[a.confidence] - order[b.confidence])

  return results
}
