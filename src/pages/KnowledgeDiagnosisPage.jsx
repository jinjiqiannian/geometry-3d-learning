// ═══════════════════════════════════════════════════════
//  KnowledgeDiagnosisPage — 知识点诊断
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import MasteryStars from '../components/MasteryStars.jsx'
import './EduMindPage.css'

export default function KnowledgeDiagnosisPage() {
  const [diagnosis, setDiagnosis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDiagnosis()
  }, [])

  async function loadDiagnosis() {
    try {
      setLoading(true)
      const res = await edumindAPI.getDiagnosis()
      setDiagnosis(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="edumind-page"><div className="edumind-loading">加载中...</div></div>
  }

  return (
    <div className="edumind-page">
      <Link to="/edumind" className="edumind-link" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← 返回仪表盘
      </Link>

      <h1 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>🔍 知识点诊断</h1>

      {error && <div className="edumind-error">{error}</div>}

      {diagnosis && (
        <>
          <div className="edumind-card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)' }}>总知识点</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{diagnosis.totalCount || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)' }}>已掌握</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--edumind-success)' }}>{diagnosis.masteredCount || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)' }}>待加强</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--edumind-danger)' }}>{(diagnosis.weakPoints || []).length}</div>
              </div>
            </div>
            {diagnosis.totalCount > 0 && (
              <div className="edumind-progress-bar" style={{ marginTop: '12px' }}>
                <div
                  className="edumind-progress-fill"
                  style={{ width: `${((diagnosis.masteredCount || 0) / diagnosis.totalCount) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* 薄弱知识点 */}
          <div className="edumind-card" style={{ marginBottom: '16px' }}>
            <h3>⚠️ 薄弱知识点（待加强）</h3>
            {(diagnosis.weakPoints || []).length === 0 ? (
              <div className="edumind-empty">
                <p>暂无薄弱知识点！继续保持</p>
              </div>
            ) : (
              <div className="edumind-diagnosis-grid">
                {diagnosis.weakPoints.map(p => (
                  <div key={p.id} className="edumind-diagnosis-item">
                    <div>
                      <div className="edumind-diagnosis-name">{p.name}</div>
                      {p.category && <div className="edumind-diagnosis-importance">{p.category}</div>}
                    </div>
                    <MasteryStars mastery={0.3} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 全部知识点 */}
          <div className="edumind-card">
            <h3>📚 全部知识点</h3>
            {(diagnosis.allPoints || []).length === 0 ? (
              <div className="edumind-empty">暂无知识点数据</div>
            ) : (
              <div className="edumind-diagnosis-grid">
                {diagnosis.allPoints.map(p => (
                  <div key={p.id} className="edumind-diagnosis-item">
                    <div>
                      <div className="edumind-diagnosis-name">{p.name}</div>
                      <div className="edumind-diagnosis-importance">
                        {p.category}
                        {p.importance ? ` · 重要性 ${'★'.repeat(p.importance)}` : ''}
                      </div>
                    </div>
                    <MasteryStars mastery={0.5} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link to="/edumind/upload" className="edumind-btn-primary">
          📝 上传新成绩单更新诊断
        </Link>
      </div>
    </div>
  )
}
