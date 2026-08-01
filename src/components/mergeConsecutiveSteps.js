/**
 * 展示层：合并连续相同 ProofStep（title + rule），不改动原始数据结构。
 * 同谓词归纳交由 formatMergedContent（仅展示文本）。
 */

import { formatMergedContent } from './formatMergedContent'
import { toTextbookMath } from './statementCompressor'

export { toTextbookMath }

function sameConsecutiveKey(a, b) {
  if (!a || !b) return false
  if (a.title !== b.title) return false
  return (a.rule ?? null) === (b.rule ?? null)
}

/** 非空 formula 去重（保持出现顺序） */
function dedupeFormulas(formulas) {
  const seen = []
  for (const f of formulas) {
    if (f && !seen.includes(f)) seen.push(f)
  }
  return seen
}

/**
 * @param {Array<{title?: string, content?: string, formula?: string, rule?: string}>} steps
 * @returns {Array<{step: object, originalIndices: number[], merged: boolean}>}
 */
export function mergeConsecutiveSteps(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) return []

  const groups = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const last = groups[groups.length - 1]
    if (last && sameConsecutiveKey(last.members[0], step)) {
      last.members.push(step)
      last.originalIndices.push(i)
    } else {
      groups.push({ members: [step], originalIndices: [i] })
    }
  }

  return groups.map(({ members, originalIndices }) => {
    const contents = members.map((m) => m.content ?? '')
    const uniqueFormulas = dedupeFormulas(members.map((m) => m.formula ?? ''))
    const formula =
      uniqueFormulas.length === 1
        ? uniqueFormulas[0]
        : uniqueFormulas.length > 0
          ? uniqueFormulas.join('；')
          : (members[0].formula ?? '')

    // 正文：同谓词归纳后的数学表达式（无自然语言总结）
    const content = formatMergedContent(contents)

    return {
      step: {
        ...members[0],
        title: members[0].title,
        content,
        formula,
      },
      originalIndices,
      merged: members.length > 1,
    }
  })
}

/**
 * 将原始 currentStep 映射到合并后的展示下标。
 */
export function mapCurrentStepToMergedIndex(groups, currentStep = 0) {
  if (!groups.length) return 0
  const idx = groups.findIndex((g) => g.originalIndices.includes(currentStep))
  return idx >= 0 ? idx : 0
}
