// ═══════════════════════════════════════════════════════
//  EduMindPage — 考试分析仪表盘主页
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import MasteryStars from '../components/MasteryStars.jsx'
import ErrorAttributionChart from '../components/ErrorAttributionChart.jsx'
import './EduMindPage.css'

export default function EduMindPage() {
  const [exams, setExams] = useState([])
  const [diagnosis, setDiagnosis] = useState(null)
  const [reminder, setReminder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [examRes, diagRes, remindRes] = await Promise.allSettled([
        edumindAPI.listExams(1, 5),
        edumindAPI.getDiagnosis(),
        edumindAPI.getDailyReminder(),
      ])
      if (examRes.status === 'fulfilled') setExams(examRes.value.data?.items || [])
      if (diagRes.status === 'fulfilled') setDiagnosis(diagRes.value.data)
      if (remindRes.status === 'fulfilled') setReminder(remindRes.value.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="edumind-loading">加载中...</div>
  }

  return (
    <div className="edumind-page">
      <header className="edumind-header">
        <h1>📊 考试分析</h1>
        <Link to="/edumind/upload" className="edumind-btn-primary">
          + 上传成绩单
        </Link>
      </header>

      {error && <div className="edumind-error">{error}</div>}

      {/* 今日提醒 */}
      {reminder && (
        <div className="edumind-card edumind-reminder">
          <div className="edumind-reminder-title">📌 {reminder.title}</div>
          <div className="edumind-reminder-content">{reminder.content}</div>
          <Link to="/edumind/coach" className="edumind-link">查看详情 →</Link>
        </div>
      )}

      <div className="edumind-grid">
        {/* 最近考试 */}
        <div className="edumind-card">
          <h3>最近考试</h3>
          {exams.length === 0 ? (
            <div className="edumind-empty">
              <p>还没有考试记录</p>
              <Link to="/edumind/upload" className="edumind-link">上传你的第一份成绩单 →</Link>
            </div>
          ) : (
            <ul className="edumind-exam-list">
              {exams.map(exam => (
                <li key={exam.id}>
                  <Link to={`/edumind/report/${exam.id}`} className="edumind-exam-item">
                    <span className="edumind-exam-title">{exam.title}</span>
                    <span className="edumind-exam-score">
                      {exam.score != null && exam.total_score != null
                        ? `${exam.score}/${exam.total_score}`
                        : '待分析'}
                    </span>
                    <span className="edumind-exam-date">
                      {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('zh-CN') : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {exams.length > 0 && (
            <Link to="/edumind/upload" className="edumind-link" style={{ marginTop: '8px', display: 'inline-block' }}>
              查看全部 →
            </Link>
          )}
        </div>

        {/* 薄弱知识点 */}
        <div className="edumind-card">
          <h3>薄弱知识点</h3>
          {diagnosis?.weakPoints?.length > 0 ? (
            <ul className="edumind-weak-list">
              {diagnosis.weakPoints.slice(0, 5).map(p => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <MasteryStars mastery={0.3} size="sm" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="edumind-empty">
              <p>暂无薄弱数据，完成考试分析后自动生成</p>
            </div>
          )}
        </div>

        {/* 快速操作 */}
        <div className="edumind-card">
          <h3>快速操作</h3>
          <div className="edumind-actions">
            <Link to="/edumind/upload" className="edumind-action-btn">
              📝 上传成绩单
            </Link>
            <Link to="/edumind/diagnosis" className="edumind-action-btn">
              🔍 知识点诊断
            </Link>
            <Link to="/edumind/plan" className="edumind-action-btn">
              📅 学习计划
            </Link>
            <Link to="/edumind/coach" className="edumind-action-btn">
              🤖 AI 教练
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
