// ═══════════════════════════════════════════════════════
//  MistakeBookPage — 错题本
//  留存核心：学生回顾错题，AI 分析错因，同类题推荐
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './MistakeBookPage.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const ERROR_TYPE_LABELS = {
  concept: '概念理解',
  calculation: '计算失误',
  careless: '审题粗心',
  other: '其他',
}

const ERROR_TYPE_COLORS = {
  concept: '#ef4444',
  calculation: '#f59e0b',
  careless: '#8b5cf6',
  other: '#6b7280',
}

export default function MistakeBookPage() {
  const [mistakes, setMistakes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterResolved, setFilterResolved] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('mathviz_token')
    if (saved) setToken(saved)
  }, [])

  const fetchMistakes = useCallback(async () => {
    if (!token) { setLoading(false); return }
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (filterResolved === 'resolved') params.set('resolved', 'true')
      if (filterResolved === 'unresolved') params.set('resolved', 'false')

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/mistakes?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/mistakes/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (listRes.ok) {
        const listData = await listRes.json()
        setMistakes(listData.data?.items || [])
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }
    } catch (err) {
      setError('加载失败，请检查登录状态')
    } finally {
      setLoading(false)
    }
  }, [token, filterResolved])

  useEffect(() => { fetchMistakes() }, [fetchMistakes])

  const handleResolve = async (id, resolved) => {
    try {
      const res = await fetch(`${API_BASE}/api/mistakes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resolved }),
      })
      if (res.ok) fetchMistakes()
    } catch {}
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条错题？')) return
    try {
      const res = await fetch(`${API_BASE}/api/mistakes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchMistakes()
    } catch {}
  }

  if (!token) {
    return (
      <div className="mb-page">
        <div className="mb-empty">
          <div className="mb-empty-icon">📝</div>
          <h2>请先登录</h2>
          <p>登录后即可查看和管理错题本</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-page">
      <div className="mb-header">
        <h1>错题本</h1>
        <p className="mb-subtitle">记录错误，针对性提升</p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="mb-stats">
          <div className="mb-stat-card">
            <span className="mb-stat-value">{stats.total}</span>
            <span className="mb-stat-label">总计</span>
          </div>
          <div className="mb-stat-card accent">
            <span className="mb-stat-value">{stats.unresolved}</span>
            <span className="mb-stat-label">待复习</span>
          </div>
          {Object.entries(stats.byType || {}).map(([type, count]) => (
            <div key={type} className="mb-stat-card mini">
              <span className="mb-stat-value" style={{ color: ERROR_TYPE_COLORS[type] || '#6b7280' }}>
                {count}
              </span>
              <span className="mb-stat-label">{ERROR_TYPE_LABELS[type] || type}</span>
            </div>
          ))}
        </div>
      )}

      {/* 过滤器 */}
      <div className="mb-filters">
        {['all', 'unresolved', 'resolved'].map(f => (
          <button
            key={f}
            className={`mb-filter-btn ${filterResolved === f ? 'active' : ''}`}
            onClick={() => setFilterResolved(f)}
          >
            {f === 'all' ? '全部' : f === 'unresolved' ? '未掌握' : '已掌握'}
          </button>
        ))}
      </div>

      {/* 错题列表 */}
      {loading ? (
        <div className="mb-loading">加载中...</div>
      ) : mistakes.length === 0 ? (
        <div className="mb-empty">
          <div className="mb-empty-icon">✨</div>
          <h2>还没有错题</h2>
          <p>做题后如果有不会的，会自动记录到这里</p>
          <Link to="/workspace" className="mb-goto-btn">去做题</Link>
        </div>
      ) : (
        <div className="mb-list">
          {mistakes.map(m => (
            <div key={m.id} className={`mb-item ${m.resolved ? 'resolved' : ''}`}>
              <div className="mb-item-main" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                <div className="mb-item-left">
                  <span className="mb-error-type" style={{
                    backgroundColor: (ERROR_TYPE_COLORS[m.error_type] || '#6b7280') + '18',
                    color: ERROR_TYPE_COLORS[m.error_type] || '#6b7280',
                  }}>
                    {ERROR_TYPE_LABELS[m.error_type] || '未知'}
                  </span>
                  {m.knowledge_point && (
                    <span className="mb-knowledge-tag">{m.knowledge_point}</span>
                  )}
                  {m.difficulty && (
                    <span className="mb-difficulty">{'★'.repeat(m.difficulty)}</span>
                  )}
                </div>
                <div className="mb-item-text">{m.problem_text}</div>
                <div className="mb-item-meta">
                  <span>{new Date(m.created_at).toLocaleDateString('zh-CN')}</span>
                  <span className={`mb-resolve-badge ${m.resolved ? 'done' : 'pending'}`}>
                    {m.resolved ? '已掌握' : '待复习'}
                  </span>
                </div>
              </div>

              {expandedId === m.id && (
                <div className="mb-item-detail">
                  {m.wrong_answer && (
                    <div className="mb-detail-row">
                      <span className="mb-detail-label">我的答案</span>
                      <span className="mb-detail-value wrong">{m.wrong_answer}</span>
                    </div>
                  )}
                  {m.correct_answer && (
                    <div className="mb-detail-row">
                      <span className="mb-detail-label">正确答案</span>
                      <span className="mb-detail-value correct">{m.correct_answer}</span>
                    </div>
                  )}
                  <div className="mb-detail-actions">
                    <button
                      className={`mb-action-btn ${m.resolved ? 'outline' : 'primary'}`}
                      onClick={() => handleResolve(m.id, !m.resolved)}
                    >
                      {m.resolved ? '标记未掌握' : '标记已掌握'}
                    </button>
                    {m.workspace_id && (
                      <Link to={`/workspace?id=${m.workspace_id}`} className="mb-action-btn outline">
                        查看详情
                      </Link>
                    )}
                    <button className="mb-action-btn danger" onClick={() => handleDelete(m.id)}>
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
