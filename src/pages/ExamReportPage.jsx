// ═══════════════════════════════════════════════════════
//  ExamReportPage — AI 分析报告展示
//  来源: archive AnalysisPage.tsx → JSX + edumind.css
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

const MISTYPE_LABEL = {
  CALCULATION_ERROR: '计算错误',
  READING_ERROR: '审题错误',
  CONCEPT_ERROR: '知识漏洞',
  REASONING_ERROR: '推理错误',
  CARELESS_ERROR: '粗心错误',
}

const TYPE_COLORS = {
  CALCULATION_ERROR: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  CONCEPT_ERROR: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  READING_ERROR: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  REASONING_ERROR: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  CARELESS_ERROR: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}

export default function ExamReportPage() {
  const { id } = useParams()
  const [exam, setExam] = useState(null)
  const [mistakes, setMistakes] = useState([])
  const [mastery, setMastery] = useState([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    loadAnalysis()
  }, [id])

  async function loadAnalysis() {
    try {
      const [ex, an] = await Promise.allSettled([
        edumindAPI.getExam(id),
        edumindAPI.getAnalysis(id),
      ])
      if (ex.status === 'fulfilled') setExam(ex.value.data)
      if (an.status === 'fulfilled') {
        const d = an.value.data
        setMistakes(d?.mistakes || [])
        setMastery(d?.mastery || [])
        if (d?.status === 'pending' || d?.status === 'processing') {
          setPolling(true)
          pollAnalysis()
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function pollAnalysis() {
    const interval = setInterval(async () => {
      try {
        const res = await edumindAPI.getAnalysis(id)
        if (res.data?.status === 'completed' || res.data?.status === 'failed') {
          setMistakes(res.data?.mistakes || [])
          setMastery(res.data?.mastery || [])
          setPolling(false)
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        setPolling(false)
      }
    }, 2000)
  }

  if (loading) return <div className="edumind-loading">加载中...</div>
  if (error) return <div className="edumind-error">{error}</div>
  if (!exam) return <div className="edumind-page"><div className="edumind-empty">考试不存在</div></div>

  const scorePct = exam.total_score && exam.actual_score != null
    ? ((exam.actual_score / exam.total_score) * 100).toFixed(1)
    : null

  return (
    <div className="edumind-page">
      <Link to="/edumind" className="edumind-link" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← 返回首页
      </Link>

      {/* Header */}
      <div className="edumind-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{exam.title || '考试分析'}</h1>
            <div style={{ fontSize: '0.9rem', color: 'var(--edumind-text-secondary)', marginTop: '4px' }}>
              {exam.subject} · {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('zh-CN') : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--edumind-primary)' }}>{exam.actual_score ?? '?'}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--edumind-text-secondary)' }}>/ {exam.total_score ?? '?'}</div>
            {scorePct && <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)' }}>得分率 {scorePct}%</div>}
          </div>
        </div>

        {polling && (
          <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--edumind-primary)', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', padding: '8px 12px' }}>
            🔄 AI 分析中，请稍候...
          </div>
        )}
      </div>

      {/* Mistakes */}
      {mistakes.length > 0 && (
        <div className="edumind-card edumind-section">
          <h2>错题归因</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mistakes.map(m => {
              const tc = TYPE_COLORS[m.type] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }
              return (
                <div key={m.id} style={{ padding: '12px', background: 'var(--edumind-card-bg)', border: '1px solid var(--edumind-border)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                      {MISTYPE_LABEL[m.type] || m.type}
                    </span>
                    {m.reason && <span style={{ fontSize: '0.9rem', color: 'var(--edumind-text-secondary)' }}>{m.reason}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mastery */}
      {mastery.length > 0 && (
        <div className="edumind-card edumind-section">
          <h2>知识点掌握度</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mastery.map(k => (
              <div key={k.knowledge_point}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
                  <span>{k.knowledge_point}</span>
                  <span style={{ fontWeight: 600, color: 'var(--edumind-primary)' }}>{(k.mastery * 100).toFixed(0)}%</span>
                </div>
                <div className="edumind-progress-bar">
                  <div
                    className="edumind-progress-fill"
                    style={{
                      width: `${k.mastery * 100}%`,
                      background: k.mastery >= 0.7 ? '#22c55e' : k.mastery >= 0.4 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)', marginTop: '2px' }}>{k.correct_count}/{k.question_count} 题正确</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mistakes.length === 0 && mastery.length === 0 && !polling && (
        <div className="edumind-empty">暂无分析数据</div>
      )}
    </div>
  )
}
