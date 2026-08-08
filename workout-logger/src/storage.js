const STORAGE_KEY = 'setlog-v1'

const DEFAULT_DATA = {
  settings: {
    unit: 'kg', // kg | lb
    restSeconds: 90,
  },
  customs: [], // [{ id, name, category }] 用户常用动作
  workouts: [], // { id, date, startedAt, finishedAt, exercises[] }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_DATA)
    const parsed = JSON.parse(raw)
    return {
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
      customs: Array.isArray(parsed.customs) ? parsed.customs : [],
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
    }
  } catch {
    return structuredClone(DEFAULT_DATA)
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportJson(data) {
  return JSON.stringify(data, null, 2)
}

export function importJson(text) {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('无效的备份文件')
  return {
    settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
    customs: Array.isArray(parsed.customs) ? parsed.customs : [],
    workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
  }
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${m}月${d}日 周${week}`
}

export function createWorkout(date = todayKey()) {
  return {
    id: uid(),
    date,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    note: '',
    exercises: [],
  }
}

export function createExercise(name, category = 'other') {
  return {
    id: uid(),
    name: name.trim(),
    category,
    sets: [],
  }
}

export function countSets(workout) {
  return (workout.exercises || []).reduce((n, e) => n + (e.sets?.length || 0), 0)
}

export function createSet({ weight = 0, reps = 0 } = {}) {
  return {
    id: uid(),
    weight: Number(weight) || 0,
    reps: Number(reps) || 0,
    at: new Date().toISOString(),
  }
}

/** 按时间从新到旧遍历所有训练中的同名动作，取最近一次有组的末组 */
export function findLastPerformance(workouts, exerciseName, excludeWorkoutId) {
  const name = exerciseName.trim()
  if (!name) return null

  const sorted = [...(workouts || [])].sort((a, b) => {
    const ta = a.startedAt || a.date || ''
    const tb = b.startedAt || b.date || ''
    return tb.localeCompare(ta)
  })

  for (const w of sorted) {
    if (excludeWorkoutId && w.id === excludeWorkoutId) continue
    for (const ex of w.exercises || []) {
      if (ex.name !== name || !ex.sets?.length) continue
      const last = ex.sets[ex.sets.length - 1]
      return {
        weight: last.weight,
        reps: last.reps,
        date: w.date,
        setCount: ex.sets.length,
        category: ex.category,
      }
    }
  }
  return null
}

/** 最近用过的动作（去重，最多 limit 个） */
export function recentExercises(workouts, limit = 8) {
  const seen = new Set()
  const list = []
  const sorted = [...(workouts || [])].sort((a, b) => {
    const ta = a.startedAt || a.date || ''
    const tb = b.startedAt || b.date || ''
    return tb.localeCompare(ta)
  })

  for (const w of sorted) {
    for (const ex of [...(w.exercises || [])].reverse()) {
      const key = ex.name.trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      list.push({ name: key, category: ex.category || 'other' })
      if (list.length >= limit) return list
    }
  }
  return list
}

/** 最近一场有动作的训练（可排除当前） */
export function findLastWorkout(workouts, excludeWorkoutId) {
  const sorted = [...(workouts || [])].sort((a, b) => {
    const ta = a.startedAt || a.date || ''
    const tb = b.startedAt || b.date || ''
    return tb.localeCompare(ta)
  })
  for (const w of sorted) {
    if (excludeWorkoutId && w.id === excludeWorkoutId) continue
    if ((w.exercises || []).length === 0) continue
    return w
  }
  return null
}

/**
 * 从某场训练复制动作列表（不复制组），并带上末组重量/次数作为预填
 * @returns {{ exercises: object[], drafts: Record<string, {weight:string,reps:string}> }}
 */
export function buildTemplateFromWorkout(source) {
  const exercises = []
  const drafts = {}
  for (const src of source.exercises || []) {
    const name = (src.name || '').trim()
    if (!name) continue
    const ex = createExercise(name, src.category || 'other')
    exercises.push(ex)
    const last = src.sets?.[src.sets.length - 1]
    if (last) {
      drafts[ex.id] = { weight: String(last.weight), reps: String(last.reps) }
    }
  }
  return { exercises, drafts }
}

export function addCustomExercise(customs, name, category = 'other') {
  const trimmed = name.trim()
  if (!trimmed) return customs
  if ((customs || []).some((c) => c.name === trimmed)) return customs
  return [
    { id: uid(), name: trimmed, category },
    ...(customs || []),
  ]
}

export function removeCustomExercise(customs, id) {
  return (customs || []).filter((c) => c.id !== id)
}

/** 同名动作历史：按日期从旧到新，每场取最大重量与对应次数 */
export function exerciseHistory(workouts, exerciseName, limit = 8) {
  const name = exerciseName.trim()
  if (!name) return []

  const points = []
  const sorted = [...(workouts || [])].sort((a, b) => {
    const ta = a.date || a.startedAt || ''
    const tb = b.date || b.startedAt || ''
    return ta.localeCompare(tb)
  })

  for (const w of sorted) {
    for (const ex of w.exercises || []) {
      if (ex.name !== name || !ex.sets?.length) continue
      let best = ex.sets[0]
      for (const s of ex.sets) {
        if (Number(s.weight) > Number(best.weight)) best = s
        else if (
          Number(s.weight) === Number(best.weight) &&
          Number(s.reps) > Number(best.reps)
        ) {
          best = s
        }
      }
      points.push({
        date: w.date,
        workoutId: w.id,
        maxWeight: Number(best.weight) || 0,
        reps: Number(best.reps) || 0,
        sets: ex.sets.length,
      })
    }
  }

  if (points.length <= limit) return points
  return points.slice(-limit)
}

export { uid }
