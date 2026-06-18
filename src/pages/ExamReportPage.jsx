// ═══════════════════════════════════════════════════════
//  ExamReportPage — AI 分析报告展示
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import MasteryStars from '../components/MasteryStars.jsx'
import ErrorAttributionChart from '../components/ErrorAttributionChart.jsx'
import './EduMindPage.css'

export default function ExamReportPage() {
  const { id } = useParams()
  const [exam, setExam] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    loadReport()
  }, [id])

  async function loadReport() {
    try {
      setLoading(true)
      setError(null)

      const examRes = await edumindAPI.getExam(id)
      setExam(examRes.data)

      // 尝试获取分析结果
      try {
        const analysisRes = await edumindAPI.getAnalysis(id)
        const a = analysisRes.data
        setAnalysis(a)

        if (a && (a.status === 'pending' || a.status === 'processing')) {
          setPolling(true)
          pollAnalysis()
        }
      } catch {
        setAnalysis(null)
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
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          setAnalysis(res.data)
          setPolling(false)
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        setPolling(false)
      }
    }, 2000)
  }

  async function handleAnalyze() {
    try {
      setPolling(true)
      await edumindAPI.analyze(id)
      pollAnalysis()
    } catch (err) {
      setError(err.message)
      setPolling(false)
    }
  }

  if (loading) {
    return <div className="edumind-page"><div className="edumind-loading">加载中...</div></div>
  }

  if (error) {
    return (
      <div className="edumind-page">
        <div className="edumind-error">{error}</div>
        <Link to="/edumind" className="edumind-link">← 返回仪表盘</Link>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="edumind-page">
        <div className="edumind-empty">考试不存在</div>
        <Link to="/edumind" className="edumind-link">← 返回仪表盘</Link>
      </div>
    )
  }

  const analysisPending = !analysis || analysis.status === 'pending' || analysis.status === 'processing'
  const scorePct = exam.total_score > 0 ? ((exam.score / exam.total_score) * 100).toFixed(1) : null

  return (
    <div className="edumind-page">
      <Link to="/edumind" className="edumind-link" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← 返回仪表盘
      </Link>

      {/* 报告头部 */}
      <div className="edumind-card" style={{ marginBottom: '16px' }}>
        <div className="edumind-report-header">
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.3rem' }}>{exam.title}</h1>
            <div style={{ color: 'var(--edumind-text-secondary)', fontSize: '0.9rem' }}>
              {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('zh-CN') : ''}
              {exam.duration_min ? ` · ${exam.duration_min}分钟` : ''}
              {exam.subject ? ` · ${exam.subject}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="edumind-report-score">
              <span className="score-value">{exam.score ?? '?'}</span>
              <span className="score-total">/{exam.total_score ?? '?'}</span>
            </div>
            {scorePct && (
              <div style={{ color: 'var(--edumind-text-secondary)', fontSize: '0.9rem' }}>
                得分率 {scorePct}%
              </div>
            )}
            {exam.grade && <div className="edumind-report-grade">{exam.grade}</div>}
          </div>
        </div>

        {/* 分析状态 */}
        {polling && (
          <div className="edumind-stage-badge processing" style={{ marginBottom: '8px' }}>
            🔄 AI 分析中，请稍候...
          </div>
        )}
        {analysis?.status === 'failed' && (
          <div className="edumind-stage-badge failed" style={{ marginBottom: '8px' }}>
            ❌ 分析失败，请重试
          </div>
        )}
        {analysisPending && !polling && (
          <button className="edumind-btn-primary" onClick={handleAnalyze}>
            🤖 开始 AI 分析
          </button>
        )}
      </div>

      {analysis && analysis.status === 'completed' && (
        <>
          {/* 总体评价 */}
          {analysis.overall_summary && (
            <div className="edumind-card edumind-section">
              <h2>📋 总体评价</h2>
              <p style={{ lineHeight: '1.7', color: 'var(--edumind-text-secondary)' }}>{analysis.overall_summary}</p>
            </div>
          )}

          {/* 错误归因 */}
          <div className="edumind-card edumind-section">
            <h2>🎯 错误归因</h2>
            <ErrorAttributionChart attributions={analysis.error_attribution || []} />
          </div>

          {/* 知识点掌握度 */}
          <div className="edumind-card edumind-section">
            <h2>📊 知识点掌握度</h2>
            {(analysis.knowledge_mastery || []).length === 0 ? (
              <div className="edumind-empty">暂无掌握度数据</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(analysis.knowledge_mastery || [])
                  .sort((a, b) => (a.mastery || 0) - (b.mastery || 0))
                  .map(k => (
                    <div key={k.knowledge_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--edumind-border)' }}>
                      <div>
                        <span>{k.name}</span>
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--edumind-text-secondary)' }}>
                          ({k.questions_count}题, {(k.correct_rate * 100).toFixed(0)}%正确率)
                        </span>
                      </div>
                      <MasteryStars mastery={k.mastery || 0} size="sm" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 改进建议 */}
          <div className="edumind-card edumind-section">
            <h2>💡 改进建议</h2>
            {(analysis.improvement_suggestions || []).length === 0 ? (
              <div className="edumind-empty">暂无建议</div>
            ) : (
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                {(analysis.improvement_suggestions || [])
                  .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                  .map((s, i) => (
                    <li key={i} style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                      <strong>{s.suggestion}</strong>
                    </li>
                  ))}
              </ol>
            )}
          </div>

          {/* 逐题分析 */}
          {(exam.questions || []).length > 0 && (
            <div className="edumind-card edumind-section">
              <h2>📝 逐题分析</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exam.questions.map((q, idx) => {
                  const pct = q.score > 0 ? ((q.earned / q.score) * 100).toFixed(0) : 0
                  const mastery = q.score > 0 ? q.earned / q.score : 0
                  return (
                    <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--edumind-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>第 {idx + 1} 题</span>
                        <span style={{ color: mastery >= 0.6 ? 'var(--edumind-success)' : 'var(--edumind-danger)' }}>
                          {q.earned}/{q.score} ({pct}%)
                        </span>
                      </div>
                      {q.content && <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)', marginBottom: '4px' }}>{q.content}</div>}
                      <MasteryStars mastery={mastery} size="sm" />
                      {(q.knowledge_points || []).length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--edumind-text-secondary)' }}>
                          知识点: {q.knowledge_points.join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 生成学习计划按钮 */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/edumind/plan" className="edumind-btn-primary">
              📅 基于此分析生成学习计划
            </Link>
          </div>
        </>
      )}

      {analysis?.status === 'failed' && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="edumind-btn-primary" onClick={handleAnalyze}>
            重新分析
          </button>
        </div>
      )}
    </div>
  )
}
