/**
 * 将智谱 VL 读图得到的 visionHints 合并进本地 semantic。
 * 文字/本地解析优先：已有 relation / point / plane 不被图覆盖。
 * 合并后清除 pointPositions，需再跑 validateAndCompleteSemantic。
 */

/**
 * @param {object} semantic - parseProblemToSemantic 结果（会被浅拷贝后返回）
 * @param {{ relations?: string[], points?: string[], planes?: string[] } | null | undefined} hints
 * @returns {object}
 */
export function mergeVisionHints(semantic, hints) {
  if (!semantic || typeof semantic !== 'object') return semantic
  if (!hints || typeof hints !== 'object') return semantic

  const out = {
    ...semantic,
    points: Array.isArray(semantic.points) ? [...semantic.points] : [],
    relations: Array.isArray(semantic.relations) ? [...semantic.relations] : [],
    planes: Array.isArray(semantic.planes)
      ? semantic.planes.map((p) => (typeof p === 'object' ? { ...p } : p))
      : [],
    importantPlanes: Array.isArray(semantic.importantPlanes)
      ? [...semantic.importantPlanes]
      : [],
  }

  const pointSet = new Set(out.points)
  for (const p of hints.points || []) {
    if (typeof p === 'string' && /^[A-Z][A-Z0-9']*$/.test(p) && !pointSet.has(p)) {
      out.points.push(p)
      pointSet.add(p)
    }
  }

  const relSet = new Set(out.relations)
  for (const r of hints.relations || []) {
    if (typeof r !== 'string' || !r.trim()) continue
    const key = r.trim()
    if (relSet.has(key)) continue
    // 同主体+同谓词已存在（文字优先）→ 跳过图侧
    const [subj, pred] = key.split(/\s+/)
    const conflict = [...relSet].some((existing) => {
      const parts = existing.split(/\s+/)
      return parts[0] === subj && parts[1] === pred
    })
    if (conflict) continue
    out.relations.push(key)
    relSet.add(key)
  }

  const planeLabels = new Set(
    out.planes
      .map((p) => (typeof p === 'string' ? p : p?.label))
      .filter(Boolean)
      .concat(out.importantPlanes),
  )
  for (const pl of hints.planes || []) {
    if (typeof pl !== 'string' || pl.length < 3) continue
    if (planeLabels.has(pl)) continue
    out.planes.push({ label: pl, points: pl.match(/[A-Z][0-9]*'?/g) || [] })
    if (!out.importantPlanes.includes(pl)) out.importantPlanes.push(pl)
    planeLabels.add(pl)
  }

  // 强制重算坐标（新中点等）
  delete out.pointPositions
  out._visionHintsMerged = true
  return out
}
