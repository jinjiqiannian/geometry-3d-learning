// ═══════════════════════════════════════════════════════
//  EduMindPage — 考试分析仪表盘
//  来源: archive Dashboard.tsx → JSX + edumind.css
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

export default function EduMindPage() {
  const [exams, setExams] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([edumindAPI.listExams(), edumindAPI.getStudentProfile()]).then(([ex, pr]) => {
      if (ex.status === 'fulfilled') setExams(ex.value.data?.items || ex.value.data || [])
      if (pr.status === 'fulfilled') setProfile(pr.value.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="edumind-loading">加载中...</div>

  return (
    <div className="edumind-page">
      <header className="edumind-header">
        <h1>考试分析</h1>
        <Link to="/edumind/upload" className="edumind-btn-primary">+ 上传试卷</Link>
      </header>

      {/* Quick Stats */}
      {profile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div className="edumind-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)' }}>考试次数</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px' }}>{profile.examCount}</div>
          </div>
          <div className="edumind-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)' }}>优势知识点</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px', color: '#22c55e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.strengths[0] || '-'}
            </div>
          </div>
          <div className="edumind-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)' }}>薄弱知识点</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px', color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.weaknesses[0] || '-'}
            </div>
          </div>
          <div className="edumind-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)' }}>学习趋势</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px', color: 'var(--edumind-primary)' }}>
              {profile.recentTrend === 'improving' ? '↑ 进步中' : profile.recentTrend === 'declining' ? '↓ 需关注' : '→ 稳定'}
            </div>
          </div>
        </div>
      )}

      {/* Weakness Alert */}
      {profile && profile.weaknesses.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 600, color: '#ef4444' }}>⚠️ 薄弱知识点</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--edumind-text-secondary)', marginTop: '4px' }}>
            {profile.weaknesses.slice(0, 3).join('、')}
          </div>
        </div>
      )}

      {/* Recent Exams */}
      <div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '12px' }}>最近考试</h2>
        {exams.length === 0 ? (
          <div className="edumind-card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📝</div>
            <p style={{ color: 'var(--edumind-text-secondary)' }}>还没有考试记录</p>
            <Link to="/edumind/upload" style={{ color: 'var(--edumind-primary)', fontSize: '0.9rem', marginTop: '8px', display: 'inline-block' }}>上传第一份试卷 →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {exams.map(exam => (
              <Link key={exam.id} to={`/edumind/report/${exam.id}`} className="edumind-exam-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--edumind-card-bg)', border: '1px solid var(--edumind-border)', borderRadius: '12px', textDecoration: 'none', color: 'var(--edumind-text)', transition: 'border-color 0.2s' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{exam.title || '未命名考试'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)', marginTop: '2px' }}>
                    {exam.subject} · {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('zh-CN') : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--edumind-primary)' }}>
                    {exam.actual_score != null ? exam.actual_score : '?'}
                    <span style={{ fontSize: '0.85rem', color: 'var(--edumind-text-secondary)' }}>/{exam.total_score || '?'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile spacer */}
      <div style={{ height: '64px' }} />
    </div>
  )
}
