// ═══════════════════════════════════════════════════════
//  LearningPlanPage — 学习路线图 (7/30/90天)
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

const DURATIONS = [7, 30, 90]

export default function LearningPlanPage() {
  const [searchParams] = useSearchParams()
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(searchParams.get('examId') || '')
  const [duration, setDuration] = useState(7)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    edumindAPI.listExams(1, 20).then(res => {
      setExams(res.data?.items || [])
    }).catch(() => {})

    // Check for existing plan
    edumindAPI.getActivePlan().then(res => {
      if (res.data) setPlan(res.data)
    }).catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!selectedExam) {
      setError('请先选择一份考试分析')
      return
    }
    setGenerating(true)
    setError(null)
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
        ← 返回仪表盘
      </Link>

      <h1 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>📅 学习路线图</h1>

      {error && <div className="edumind-error">{error}</div>}

      {/* 计划生成器 */}
      {!plan && (
        <div className="edumind-card" style={{ marginBottom: '16px' }}>
          <h3>生成学习计划</h3>
          <div className="edumind-form-group">
            <label>选择考试分析</label>
            <select className="edumind-select" value={selectedExam} onChange={e => setSelectedExam(e.target.value)} style={{ width: '100%' }}>
              <option value="">-- 请选择 --</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.score}/{ex.total_score})
                </option>
              ))}
            </select>
          </div>
          <div className="edumind-form-group">
            <label>计划时长</label>
            <div className="edumind-plan-selector">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`edumind-plan-btn ${duration === d ? 'active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {d} 天
                </button>
              ))}
            </div>
          </div>
          <button className="edumind-btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '🚀 生成学习计划'}
          </button>
        </div>
      )}

      {/* 已有计划 */}
      {plan && (
        <>
          <div className="edumind-card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>{plan.title}</h3>
                <div style={{ color: 'var(--edumind-text-secondary)', fontSize: '0.85rem' }}>
                  {plan.duration_days}天计划 · 开始于 {plan.start_date ? new Date(plan.start_date).toLocaleDateString('zh-CN') : ''}
                  {plan.goal ? ` · 目标: ${plan.goal}` : ''}
                </div>
              </div>
              <div className="edumind-btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'default' }}>
                进度 {(plan.progress * 100).toFixed(0)}%
              </div>
            </div>
            <div className="edumind-progress-bar">
              <div className="edumind-progress-fill" style={{ width: `${(plan.progress || 0) * 100}%` }} />
            </div>
            <button
              className="edumind-btn-primary"
              style={{ marginTop: '12px', fontSize: '0.8rem', padding: '6px 12px', background: 'transparent', border: '1px solid var(--edumind-border)' }}
              onClick={() => setPlan(null)}
            >
              重新生成
            </button>
          </div>

          {/* 每日计划时间线 */}
          <div className="edumind-card">
            <h3>每日计划</h3>
            {(plan.plan_content || []).length === 0 ? (
              <div className="edumind-empty">暂无计划内容</div>
            ) : (
              <div className="edumind-timeline">
                {(plan.plan_content || []).slice(0, 14).map((day, idx) => (
                  <div key={idx} className={`edumind-timeline-day ${day.completed ? 'completed' : ''}`}>
                    <h4>第 {day.day} 天：{day.focus}</h4>
                    {(day.tasks || []).map((task, ti) => (
                      <div key={ti} className="edumind-task">
                        <input type="checkbox" checked={day.completed} readOnly />
                        <span>{task.description}（{task.duration_min}分钟）</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)', marginTop: '4px' }}>
                      共 {day.total_duration_min || 0} 分钟
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(plan.plan_content || []).length > 14 && (
              <div style={{ textAlign: 'center', marginTop: '12px', color: 'var(--edumind-text-secondary)', fontSize: '0.85rem' }}>
                还有 {(plan.plan_content || []).length - 14} 天计划...
              </div>
            )}
          </div>
        </>
      )}

      {!plan && exams.length === 0 && (
        <div className="edumind-empty" style={{ marginTop: '24px' }}>
          <p>还没有考试数据，请先上传成绩单</p>
          <Link to="/edumind/upload" className="edumind-link">上传成绩单 →</Link>
        </div>
      )}
    </div>
  )
}
