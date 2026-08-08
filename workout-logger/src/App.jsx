import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CATEGORIES,
  categoryLabel,
  exercisesInCategory,
  guessCategory,
} from './exercises'
import {
  countSets,
  createExercise,
  createSet,
  createWorkout,
  exportJson,
  findLastPerformance,
  findLastWorkout,
  formatDateLabel,
  importJson,
  loadData,
  recentExercises,
  buildTemplateFromWorkout,
  addCustomExercise,
  removeCustomExercise,
  exerciseHistory,
  saveData,
  todayKey,
} from './storage'
import './App.css'

const REST_OPTIONS = [60, 90, 120, 180]

function buzz() {
  try {
    navigator.vibrate?.([120, 60, 120])
  } catch {
    /* ignore */
  }
}

/** 同动作最大重量迷你柱状图 */
function WeightSparkline({ points, unit }) {
  if (!points || points.length < 2) return null
  const max = Math.max(...points.map((p) => p.maxWeight), 1)
  const w = 160
  const h = 36
  const gap = 3
  const barW = (w - gap * (points.length - 1)) / points.length
  const last = points[points.length - 1]
  const first = points[0]
  const delta = last.maxWeight - first.maxWeight
  const deltaText =
    delta === 0 ? '持平' : delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`

  return (
    <div className="spark">
      <svg className="spark__chart" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden>
        {points.map((p, i) => {
          const bh = Math.max(2, (p.maxWeight / max) * (h - 2))
          const x = i * (barW + gap)
          const y = h - bh
          const isLast = i === points.length - 1
          return (
            <rect
              key={`${p.date}-${i}`}
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx="2"
              fill={isLast ? 'var(--accent)' : 'var(--primary)'}
              opacity={isLast ? 1 : 0.45}
            />
          )
        })}
      </svg>
      <div className="spark__meta">
        <span>
          近{points.length}次最高 {last.maxWeight}
          {unit}
        </span>
        <span className={delta > 0 ? 'spark__up' : delta < 0 ? 'spark__down' : ''}>
          {deltaText}
        </span>
      </div>
    </div>
  )
}

function RestTimer({ seconds = 90, active, resetKey = 0, onDone, onCancel }) {
  const [left, setLeft] = useState(seconds)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) return
    setLeft(seconds)
    const started = Date.now()
    const timer = setInterval(() => {
      const remain = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))
      setLeft(remain)
      if (remain <= 0) {
        clearInterval(timer)
        buzz()
        onDoneRef.current?.()
      }
    }, 250)
    return () => clearInterval(timer)
  }, [active, seconds, resetKey])

  if (!active) return null

  const m = String(Math.floor(left / 60)).padStart(1, '0')
  const s = String(left % 60).padStart(2, '0')

  return (
    <div className="rest-bar" role="status">
      <div className="rest-bar__text">
        <span className="rest-bar__label">休息</span>
        <span className="rest-bar__time">
          {m}:{s}
        </span>
      </div>
      <div className="rest-bar__track">
        <div
          className="rest-bar__fill"
          style={{ width: `${((seconds - left) / seconds) * 100}%` }}
        />
      </div>
      <button type="button" className="btn btn--ghost rest-bar__skip" onClick={onCancel}>
        跳过
      </button>
    </div>
  )
}

function TodayView({ data, setData, unit }) {
  const today = todayKey()
  const workout = data.workouts.find((w) => w.date === today && !w.finishedAt)
  const restSeconds = Number(data.settings.restSeconds) || 90
  const customs = data.customs || []
  const lastWorkout = useMemo(
    () => findLastWorkout(data.workouts, workout?.id),
    [data.workouts, workout?.id],
  )
  const [nameDraft, setNameDraft] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [catFilter, setCatFilter] = useState('chest')
  const [resting, setResting] = useState(false)
  const [restKey, setRestKey] = useState(0)
  const [drafts, setDrafts] = useState({})
  const [editing, setEditing] = useState(null)

  const recent = useMemo(() => recentExercises(data.workouts, 8), [data.workouts])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('setlog-pending-drafts')
      if (!raw) return
      sessionStorage.removeItem('setlog-pending-drafts')
      const pending = JSON.parse(raw)
      if (pending && typeof pending === 'object') {
        setDrafts((prev) => ({ ...prev, ...pending }))
      }
    } catch {
      /* ignore */
    }
  }, [])

  const updateWorkout = (nextWorkout) => {
    setData((prev) => {
      const workouts = prev.workouts.map((w) =>
        w.id === nextWorkout.id ? nextWorkout : w,
      )
      return { ...prev, workouts }
    })
  }

  const applyTemplate = (source, targetWorkout) => {
    const { exercises, drafts: nextDrafts } = buildTemplateFromWorkout(source)
    if (exercises.length === 0) {
      alert('上场没有可复制的动作')
      return
    }
    updateWorkout({ ...targetWorkout, exercises })
    setDrafts((prev) => ({ ...prev, ...nextDrafts }))
    setShowAdd(false)
  }

  const startWorkout = () => {
    const w = createWorkout(today)
    setData((prev) => ({ ...prev, workouts: [w, ...prev.workouts] }))
  }

  const startFromLast = () => {
    if (!lastWorkout) return
    const w = createWorkout(today)
    const { exercises, drafts: nextDrafts } = buildTemplateFromWorkout(lastWorkout)
    w.exercises = exercises
    setData((prev) => ({ ...prev, workouts: [w, ...prev.workouts] }))
    setDrafts(nextDrafts)
  }

  const copyLastIntoCurrent = () => {
    if (!workout || !lastWorkout) return
    if (workout.exercises.length > 0) {
      if (!confirm('将用上场动作替换当前列表（已记的组会清空），继续？')) return
    }
    applyTemplate(lastWorkout, workout)
  }

  const toggleFavorite = (name, category) => {
    const trimmed = name.trim()
    setData((prev) => {
      const exists = (prev.customs || []).some((c) => c.name === trimmed)
      return {
        ...prev,
        customs: exists
          ? (prev.customs || []).filter((c) => c.name !== trimmed)
          : addCustomExercise(prev.customs, trimmed, category),
      }
    })
  }

  const isFavorite = (name) => (customs || []).some((c) => c.name === name)

  const finishWorkout = () => {
    if (!workout) return
    if (!confirm('结束今天的训练？')) return
    updateWorkout({ ...workout, finishedAt: new Date().toISOString() })
    setResting(false)
  }

  const addExercise = (name, category) => {
    const trimmed = name.trim()
    if (!trimmed || !workout) return
    if (workout.exercises.some((e) => e.name === trimmed)) {
      alert('本场已有同名动作')
      return
    }
    const cat = category || guessCategory(trimmed)
    const ex = createExercise(trimmed, cat)
    const prev = findLastPerformance(data.workouts, trimmed, workout.id)
    updateWorkout({ ...workout, exercises: [...workout.exercises, ex] })
    if (prev) {
      setDrafts((d) => ({
        ...d,
        [ex.id]: { weight: String(prev.weight), reps: String(prev.reps) },
      }))
    }
    setNameDraft('')
    setShowAdd(false)
  }

  const removeExercise = (exerciseId) => {
    if (!workout || !confirm('删除这个动作及全部组？')) return
    updateWorkout({
      ...workout,
      exercises: workout.exercises.filter((e) => e.id !== exerciseId),
    })
  }

  const getDraft = (exercise) => {
    const d = drafts[exercise.id]
    if (d) return d
    const last = exercise.sets[exercise.sets.length - 1]
    if (last) {
      return { weight: String(last.weight), reps: String(last.reps) }
    }
    const prev = findLastPerformance(data.workouts, exercise.name, workout?.id)
    if (prev) {
      return { weight: String(prev.weight), reps: String(prev.reps) }
    }
    return { weight: '', reps: '' }
  }

  const setDraft = (exerciseId, patch) => {
    setDrafts((prev) => {
      const base = prev[exerciseId] || { weight: '', reps: '' }
      return { ...prev, [exerciseId]: { ...base, ...patch } }
    })
  }

  const logSet = (exercise, overrides = {}) => {
    if (!workout) return
    const draft = getDraft(exercise)
    const weight = overrides.weight ?? draft.weight
    const reps = overrides.reps ?? draft.reps
    if (weight === '' || reps === '' || Number(reps) <= 0) {
      alert('请填写重量和次数')
      return
    }
    const set = createSet({ weight, reps })
    const exercises = workout.exercises.map((e) =>
      e.id === exercise.id ? { ...e, sets: [...e.sets, set] } : e,
    )
    updateWorkout({ ...workout, exercises })
    setDrafts((prev) => ({
      ...prev,
      [exercise.id]: { weight: String(set.weight), reps: String(set.reps) },
    }))
    setRestKey((k) => k + 1)
    setResting(true)
  }

  const bumpWeight = (exercise, delta) => {
    const draft = getDraft(exercise)
    const current = Number(draft.weight) || 0
    const next = Math.max(0, Math.round((current + delta) * 10) / 10)
    setDrafts((prev) => ({
      ...prev,
      [exercise.id]: { weight: String(next), reps: draft.reps },
    }))
  }

  const copyLast = (exercise) => {
    const last = exercise.sets[exercise.sets.length - 1]
    if (!last) return
    logSet(exercise, { weight: last.weight, reps: last.reps })
  }

  const deleteSet = (exerciseId, setId) => {
    if (!workout) return
    const exercises = workout.exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
        : e,
    )
    updateWorkout({ ...workout, exercises })
    if (editing?.setId === setId) setEditing(null)
  }

  const startEditSet = (exerciseId, set) => {
    setEditing({
      exerciseId,
      setId: set.id,
      weight: String(set.weight),
      reps: String(set.reps),
    })
  }

  const saveEditSet = () => {
    if (!workout || !editing) return
    const weight = Number(editing.weight)
    const reps = Number(editing.reps)
    if (Number.isNaN(weight) || Number.isNaN(reps) || reps <= 0) {
      alert('请填写有效的重量和次数')
      return
    }
    const exercises = workout.exercises.map((e) => {
      if (e.id !== editing.exerciseId) return e
      return {
        ...e,
        sets: e.sets.map((s) =>
          s.id === editing.setId ? { ...s, weight, reps } : s,
        ),
      }
    })
    updateWorkout({ ...workout, exercises })
    setEditing(null)
  }

  const libraryChips = exercisesInCategory(catFilter)
  const activeNames = new Set(workout?.exercises.map((e) => e.name) || [])

  if (!workout) {
    const finishedToday = data.workouts.find((w) => w.date === today && w.finishedAt)
    return (
      <section className="panel">
        <header className="panel__head">
          <p className="eyebrow">今日</p>
          <h1>{formatDateLabel(today)}</h1>
        </header>
        {finishedToday ? (
          <div className="empty-card">
            <p>今天的训练已结束</p>
            <p className="muted">
              {finishedToday.exercises.length} 动作 · {countSets(finishedToday)} 组
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                const w = createWorkout(today)
                setData((prev) => ({
                  ...prev,
                  workouts: [w, ...prev.workouts],
                }))
              }}
            >
              再开一场
            </button>
            {lastWorkout && (
              <button type="button" className="btn btn--ghost btn--block" onClick={startFromLast}>
                复制上场动作开练
              </button>
            )}
          </div>
        ) : (
          <div className="empty-card">
            <p>准备好了就开练</p>
            <p className="muted">记录每组重量 × 次数，数据存在本机浏览器</p>
            <button type="button" className="btn btn--primary btn--xl" onClick={startWorkout}>
              开始训练
            </button>
            {lastWorkout && (
              <button type="button" className="btn btn--ghost btn--block" onClick={startFromLast}>
                复制上场 · {lastWorkout.exercises.length} 个动作
              </button>
            )}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="panel">
      <header className="panel__head">
        <p className="eyebrow">训练中</p>
        <h1>{formatDateLabel(today)}</h1>
        <p className="muted head-meta">
          {workout.exercises.length} 动作 · {countSets(workout)} 组
        </p>
      </header>

      <RestTimer
        active={resting}
        resetKey={restKey}
        seconds={restSeconds}
        onDone={() => setResting(false)}
        onCancel={() => setResting(false)}
      />

      <div className="actions-row">
        <button type="button" className="btn btn--primary" onClick={() => setShowAdd(true)}>
          + 加动作
        </button>
        {lastWorkout && (
          <button type="button" className="btn btn--ghost" onClick={copyLastIntoCurrent}>
            复制上场
          </button>
        )}
        <button type="button" className="btn btn--danger-ghost" onClick={finishWorkout}>
          结束训练
        </button>
      </div>

      <label className="note-field">
        <span className="section-label">本场备注</span>
        <textarea
          className="input input--note"
          rows={2}
          placeholder="状态、睡眠、伤痛…（可选）"
          value={workout.note || ''}
          onChange={(e) => updateWorkout({ ...workout, note: e.target.value })}
        />
      </label>

      {showAdd && (
        <div className="add-sheet">
          {customs.length > 0 && (
            <div className="recent-block">
              <p className="section-label">我的常用</p>
              <div className="chip-row chip-row--tight">
                {customs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chip chip--fav"
                    disabled={activeNames.has(item.name)}
                    onClick={() => addExercise(item.name, item.category)}
                  >
                    ★ {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="recent-block">
              <p className="section-label">最近用过</p>
              <div className="chip-row chip-row--tight">
                {recent.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className="chip chip--recent"
                    disabled={activeNames.has(item.name)}
                    onClick={() => addExercise(item.name, item.category)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="section-label">按部位选</p>
          <div className="cat-tabs" role="tablist" aria-label="动作分类">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={catFilter === c.id}
                className={catFilter === c.id ? 'cat-tab is-on' : 'cat-tab'}
                onClick={() => setCatFilter(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="chip-row">
            {libraryChips.map((item) => (
              <button
                key={item.name}
                type="button"
                className="chip"
                disabled={activeNames.has(item.name)}
                onClick={() => addExercise(item.name, item.category)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <input
            className="input"
            placeholder="自定义动作名称"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addExercise(nameDraft, catFilter)
            }}
          />
          <div className="actions-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => addExercise(nameDraft, catFilter)}
              disabled={!nameDraft.trim()}
            >
              添加为「{categoryLabel(catFilter)}」
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!nameDraft.trim()}
              onClick={() => {
                const name = nameDraft.trim()
                if (!name) return
                setData((prev) => ({
                  ...prev,
                  customs: addCustomExercise(prev.customs, name, catFilter),
                }))
                addExercise(name, catFilter)
              }}
            >
              添加并收藏
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowAdd(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {workout.exercises.length === 0 && !showAdd && (
        <div className="empty-inline muted">先加一个动作，再记第一组</div>
      )}

      <div className="exercise-list">
        {workout.exercises.map((exercise) => {
          const draft = getDraft(exercise)
          const cat = exercise.category || guessCategory(exercise.name)
          const prev = findLastPerformance(data.workouts, exercise.name, workout.id)
          return (
            <article key={exercise.id} className="exercise">
              <div className="exercise__head">
                <div className="exercise__title">
                  <span className="cat-badge">{categoryLabel(cat)}</span>
                  <h2>{exercise.name}</h2>
                </div>
                <div className="exercise__actions">
                  <button
                    type="button"
                    className={isFavorite(exercise.name) ? 'link-btn link-btn--on' : 'link-btn'}
                    title={isFavorite(exercise.name) ? '取消常用' : '收藏为常用'}
                    onClick={() => toggleFavorite(exercise.name, cat)}
                  >
                    {isFavorite(exercise.name) ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => removeExercise(exercise.id)}
                  >
                    删除
                  </button>
                </div>
              </div>

              {prev && exercise.sets.length === 0 && (
                <button
                  type="button"
                  className="prev-hint"
                  onClick={() =>
                    setDrafts((d) => ({
                      ...d,
                      [exercise.id]: {
                        weight: String(prev.weight),
                        reps: String(prev.reps),
                      },
                    }))
                  }
                >
                  上次 {prev.weight} {unit} × {prev.reps}
                  <span>填入</span>
                </button>
              )}

              <WeightSparkline
                points={exerciseHistory(data.workouts, exercise.name, 8)}
                unit={unit}
              />

              <ul className="set-list">
                {exercise.sets.map((s, i) => {
                  const isEdit = editing?.setId === s.id
                  if (isEdit) {
                    return (
                      <li key={s.id} className="set-row set-row--edit">
                        <span className="set-row__idx">{i + 1}</span>
                        <input
                          className="input input--num input--sm"
                          inputMode="decimal"
                          value={editing.weight}
                          onChange={(e) =>
                            setEditing((ed) => ({ ...ed, weight: e.target.value }))
                          }
                          aria-label="编辑重量"
                        />
                        <input
                          className="input input--num input--sm"
                          inputMode="numeric"
                          value={editing.reps}
                          onChange={(e) =>
                            setEditing((ed) => ({ ...ed, reps: e.target.value }))
                          }
                          aria-label="编辑次数"
                        />
                        <button type="button" className="link-btn" onClick={saveEditSet}>
                          存
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setEditing(null)}
                        >
                          消
                        </button>
                      </li>
                    )
                  }
                  return (
                    <li key={s.id} className="set-row">
                      <button
                        type="button"
                        className="set-row__tap"
                        onClick={() => startEditSet(exercise.id, s)}
                      >
                        <span className="set-row__idx">{i + 1}</span>
                        <span className="set-row__main">
                          {s.weight} {unit} × {s.reps}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => deleteSet(exercise.id, s.id)}
                      >
                        撤
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="log-grid">
                <label className="field">
                  <span>重量</span>
                  <input
                    className="input input--num"
                    inputMode="decimal"
                    value={draft.weight}
                    onChange={(e) => setDraft(exercise.id, { weight: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>次数</span>
                  <input
                    className="input input--num"
                    inputMode="numeric"
                    value={draft.reps}
                    onChange={(e) => setDraft(exercise.id, { reps: e.target.value })}
                  />
                </label>
              </div>

              <div className="quick-row">
                <button type="button" className="btn btn--ghost" onClick={() => bumpWeight(exercise, -2.5)}>
                  −2.5
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => bumpWeight(exercise, 2.5)}>
                  +2.5
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => copyLast(exercise)}
                  disabled={exercise.sets.length === 0}
                >
                  同上一组
                </button>
                <button type="button" className="btn btn--accent" onClick={() => logSet(exercise)}>
                  记一组
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function HistoryView({ data, setData, unit, onReuse }) {
  const items = useMemo(() => {
    return [...data.workouts]
      .filter((w) => w.finishedAt || w.exercises.some((e) => e.sets.length > 0))
      .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  }, [data.workouts])

  const [openId, setOpenId] = useState(null)

  const deleteWorkout = (id) => {
    if (!confirm('删除这场训练记录？')) return
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((w) => w.id !== id),
    }))
    if (openId === id) setOpenId(null)
  }

  const reuseWorkout = (source) => {
    if (!source.exercises?.length) {
      alert('这场没有动作可复制')
      return
    }
    onReuse?.(source)
  }

  if (items.length === 0) {
    return (
      <section className="panel">
        <header className="panel__head">
          <p className="eyebrow">历史</p>
          <h1>还没有记录</h1>
        </header>
        <p className="muted">完成一场训练后会出现在这里</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <header className="panel__head">
        <p className="eyebrow">历史</p>
        <h1>过往训练</h1>
      </header>
      <div className="history-list">
        {items.map((w) => {
          const setCount = countSets(w)
          const cats = [
            ...new Set(
              w.exercises.map((e) => categoryLabel(e.category || guessCategory(e.name))),
            ),
          ]
          const open = openId === w.id
          return (
            <article key={w.id} className="history-card">
              <button
                type="button"
                className="history-card__toggle"
                onClick={() => setOpenId(open ? null : w.id)}
              >
                <div>
                  <strong>{formatDateLabel(w.date)}</strong>
                  <p className="muted">
                    {w.exercises.length} 动作 · {setCount} 组
                    {!w.finishedAt ? ' · 进行中' : ''}
                  </p>
                  {cats.length > 0 && (
                    <p className="history-cats">{cats.join(' · ')}</p>
                  )}
                  {w.note ? (
                    <p className="history-cats history-cats--note">
                      {w.note.length > 36 ? `${w.note.slice(0, 36)}…` : w.note}
                    </p>
                  ) : null}
                </div>
                <span className="history-card__chev" aria-hidden>
                  {open ? '▾' : '▸'}
                </span>
              </button>
              {open && (
                <div className="history-card__body">
                  {w.note ? <p className="history-note">{w.note}</p> : null}
                  {w.exercises.map((e) => {
                    const hist = exerciseHistory(data.workouts, e.name, 8)
                    return (
                      <div key={e.id} className="history-ex">
                        <h3>
                          <span className="cat-badge cat-badge--sm">
                            {categoryLabel(e.category || guessCategory(e.name))}
                          </span>
                          {e.name}
                        </h3>
                        <WeightSparkline points={hist} unit={unit} />
                        <ul>
                          {e.sets.map((s, i) => (
                            <li key={s.id}>
                              第{i + 1}组 · {s.weight} {unit} × {s.reps}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    onClick={() => reuseWorkout(w)}
                  >
                    用这场开练
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--block"
                    onClick={() => deleteWorkout(w.id)}
                  >
                    删除这场
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SettingsView({ data, setData }) {
  const fileRef = useRef(null)
  const unit = data.settings.unit
  const restSeconds = Number(data.settings.restSeconds) || 90
  const customs = data.customs || []
  const [favName, setFavName] = useState('')
  const [favCat, setFavCat] = useState('other')

  const patchSettings = (patch) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }))
  }

  const addFav = () => {
    const name = favName.trim()
    if (!name) return
    setData((prev) => ({
      ...prev,
      customs: addCustomExercise(prev.customs, name, favCat),
    }))
    setFavName('')
  }

  const doExport = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `setlog-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (file) => {
    try {
      const text = await file.text()
      const next = importJson(text)
      if (!confirm('导入会覆盖当前本地数据，继续？')) return
      setData(next)
      alert('导入成功')
    } catch (err) {
      alert(err.message || '导入失败')
    }
  }

  const clearAll = () => {
    if (!confirm('清空全部训练记录？此操作不可恢复（除非你有备份）。')) return
    setData((prev) => ({ ...prev, workouts: [] }))
  }

  return (
    <section className="panel">
      <header className="panel__head">
        <p className="eyebrow">设置</p>
        <h1>SETLOG</h1>
      </header>

      <div className="settings-block">
        <h2>单位</h2>
        <div className="seg">
          <button
            type="button"
            className={unit === 'kg' ? 'seg__btn is-on' : 'seg__btn'}
            onClick={() => patchSettings({ unit: 'kg' })}
          >
            公斤 kg
          </button>
          <button
            type="button"
            className={unit === 'lb' ? 'seg__btn is-on' : 'seg__btn'}
            onClick={() => patchSettings({ unit: 'lb' })}
          >
            磅 lb
          </button>
        </div>
      </div>

      <div className="settings-block">
        <h2>组间休息</h2>
        <p className="muted">记一组后自动倒计时，结束时手机震动提醒</p>
        <div className="seg seg--4">
          {REST_OPTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              className={restSeconds === sec ? 'seg__btn is-on' : 'seg__btn'}
              onClick={() => patchSettings({ restSeconds: sec })}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      <div className="settings-block">
        <h2>我的常用动作</h2>
        <p className="muted">加动作时置顶显示，训练中点 ★ 也可收藏</p>
        {customs.length === 0 ? (
          <p className="muted">还没有常用动作</p>
        ) : (
          <ul className="fav-list">
            {customs.map((c) => (
              <li key={c.id} className="fav-list__item">
                <span>
                  <span className="cat-badge cat-badge--sm">{categoryLabel(c.category)}</span>
                  {c.name}
                </span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      customs: removeCustomExercise(prev.customs, c.id),
                    }))
                  }
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="fav-add">
          <input
            className="input"
            placeholder="动作名称"
            value={favName}
            onChange={(e) => setFavName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFav()
            }}
          />
          <select
            className="input input--select"
            value={favCat}
            onChange={(e) => setFavCat(e.target.value)}
            aria-label="分类"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!favName.trim()}
            onClick={addFav}
          >
            加入常用
          </button>
        </div>
      </div>

      <div className="settings-block">
        <h2>备份</h2>
        <p className="muted">数据只存在本机浏览器。换手机或清缓存前请先导出。</p>
        <div className="actions-row">
          <button type="button" className="btn btn--primary" onClick={doExport}>
            导出 JSON
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="settings-block">
        <h2>危险区</h2>
        <button type="button" className="btn btn--danger-ghost" onClick={clearAll}>
          清空全部记录
        </button>
      </div>
    </section>
  )
}

export default function App() {
  const [data, setData] = useState(() => loadData())
  const [tab, setTab] = useState('today')

  useEffect(() => {
    saveData(data)
  }, [data])

  const unit = data.settings.unit === 'lb' ? 'lb' : 'kg'

  const reuseFromHistory = (source) => {
    const today = todayKey()
    const active = data.workouts.find((w) => w.date === today && !w.finishedAt)
    const { exercises, drafts } = buildTemplateFromWorkout(source)
    if (exercises.length === 0) return

    if (active) {
      if (
        active.exercises.length > 0 &&
        !confirm('今日已有进行中的训练，将替换动作列表，继续？')
      ) {
        return
      }
      setData((prev) => ({
        ...prev,
        workouts: prev.workouts.map((w) =>
          w.id === active.id ? { ...w, exercises } : w,
        ),
      }))
    } else {
      const w = createWorkout(today)
      w.exercises = exercises
      setData((prev) => ({ ...prev, workouts: [w, ...prev.workouts] }))
    }

    // drafts 存在 TodayView 本地 state，无法直接注入；把预填写进 sessionStorage
    try {
      sessionStorage.setItem('setlog-pending-drafts', JSON.stringify(drafts))
    } catch {
      /* ignore */
    }
    setTab('today')
  }

  return (
    <div className="app">
      <main className="app__main">
        {tab === 'today' && <TodayView data={data} setData={setData} unit={unit} />}
        {tab === 'history' && (
          <HistoryView
            data={data}
            setData={setData}
            unit={unit}
            onReuse={reuseFromHistory}
          />
        )}
        {tab === 'settings' && <SettingsView data={data} setData={setData} />}
      </main>

      <nav className="tabbar" aria-label="主导航">
        <button
          type="button"
          className={tab === 'today' ? 'tabbar__btn is-on' : 'tabbar__btn'}
          onClick={() => setTab('today')}
        >
          今日
        </button>
        <button
          type="button"
          className={tab === 'history' ? 'tabbar__btn is-on' : 'tabbar__btn'}
          onClick={() => setTab('history')}
        >
          历史
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'tabbar__btn is-on' : 'tabbar__btn'}
          onClick={() => setTab('settings')}
        >
          设置
        </button>
      </nav>
    </div>
  )
}
