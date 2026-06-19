// ═══════════════════════════════════════════════════════
//  LearningPlanPage — 学习路线图
//  来源: archive LearningPlanPage.tsx → JSX + edumind.css
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

export default function LearningPlanPage() {
  const [plan, setPlan] = useState(null)
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [duration, setDuration] = useState(7)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    edumindAPI.getActivePlan().then(r => r.data && setPlan(r.data)).catch(() => {})
    edumindAPI.listExams().then(r => setExams(r.data?.items || r.data || [])).catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!selectedExam) { setError('请选择考试'); return }
    setGenerating(true)
    setError('')
    try {
      const res = await edumindAPI.generatePlan(selectedExam, duration)
      setPlan(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="edumind-page">
      <Link to="/edumind" className="edumind-link" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← 返回首页
      </Link>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>📅 学习计划</h1>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.9rem', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!plan ? (
        <div className="edumind-card" style={{ maxWidth: '480px' }}>
          <h3>生成学习计划</h3>

          <div className="edumind-form-group">
            <label>选择考试</label>
            <select className="edumind-select" style={{ width: '100%' }} value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              <option value="">-- 请选择 --</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.title || '未命名'} ({ex.actual_score}/{ex.total_score})
                </option>
              ))}
            </select>
          </div>

          <div className="edumind-form-group">
            <label>计划时长</label>
            <div className="edumind-plan-selector">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  className={`edumind-plan-btn ${duration === d ? 'active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {d} 天
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="edumind-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {generating ? '生成中...' : '🚀 生成计划'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="edumind-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{plan.title || '学习计划'}</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--edumind-text-secondary)', marginTop: '4px' }}>
                  {plan.duration_days} 天计划 · 进度 {(plan.progress * 100).toFixed(0)}%
                </div>
              </div>
              <button
                style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setPlan(null)}
              >
                重新生成
              </button>
            </div>
            <div className="edumind-progress-bar" style={{ marginTop: '12px' }}>
              <div className="edumind-progress-fill" style={{ width: `${plan.progress * 100}%` }} />
            </div>
          </div>

          {(plan.plan_content || []).slice(0, 7).map(day => (
            <div key={day.day} className="edumind-card">
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600 }}>第 {day.day} 天：{day.focus}</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)' }}>
                共 {day.total_duration_min} 分钟
              </div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(day.tasks || []).map((task, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ color: 'var(--edumind-primary)' }}>·</span>
                    <span>{task.description}（{task.duration_min}分钟）</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(plan.plan_content || []).length > 7 && (
            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--edumind-text-secondary)' }}>
              还有 {(plan.plan_content || []).length - 7} 天计划...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
