import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { feedbackAPI } from '../services/api'
import './FeedbackAdminPage.css'

const TYPE_LABELS = {
  suggestion: '功能建议',
  bug: 'Bug 反馈',
  improvement: '体验优化',
  satisfaction: '解题评价',
  'learning-difficulty': '学习困难',
  other: '其他',
}

const TYPE_ICONS = {
  suggestion: '💡',
  bug: '🐛',
  improvement: '✨',
  satisfaction: '⭐',
  'learning-difficulty': '📚',
  other: '💬',
}

const STATUS_LABELS = {
  pending: '待处理',
  reviewed: '已处理',
  resolved: '已解决',
  archived: '已归档',
}

const STATUS_CLASS = {
  pending: 'status-pending',
  reviewed: 'status-reviewed',
  resolved: 'status-resolved',
  archived: 'status-archived',
}

export default function FeedbackAdminPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [listRes, statsRes] = await Promise.all([
        feedbackAPI.list({
          type: filterType || undefined,
          status: filterStatus || undefined,
        }),
        feedbackAPI.stats(),
      ])
      setItems(listRes.data?.items || [])
      setStats(statsRes.data)
    } catch {
      setError('加载失败，请确认后端服务已启动')
      setItems([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStatus])

  useEffect(() => { loadData() }, [loadData])

  const handleUpdate = async (id, updates) => {
    setUpdatingId(id)
    try {
      await feedbackAPI.update(id, updates)
      await loadData()
    } catch {
      setError('更新失败')
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  function formatTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 60) return `${mins}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const currentType = filterType || '全部'
  const currentStatus = filterStatus || '全部'

  return (
    <div className="fap-page">
      <div className="fap-header">
        <button className="fap-back" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="fap-title">反馈管理</h1>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="fap-stats">
          {[
            { label: '全部', value: stats.total, color: '' },
            { label: '待处理', value: stats.pending, color: 'var(--color-error)' },
            { label: '已处理', value: stats.reviewed, color: 'var(--accent)' },
            { label: '已解决', value: stats.resolved, color: 'var(--color-success)' },
          ].map(s => (
            <div key={s.label} className="fap-stat-card">
              <span className="fap-stat-value" style={{ color: s.color || 'var(--text-primary)' }}>
                {s.value}
              </span>
              <span className="fap-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 筛选 */}
      <div className="fap-filters">
        <div className="fap-filter-group">
          <label className="fap-filter-label">类型</label>
          <select
            className="fap-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">全部</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="fap-filter-group">
          <label className="fap-filter-label">状态</label>
          <select
            className="fap-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">全部</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <button className="fap-refresh-btn" onClick={loadData} disabled={loading}>
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>

      {error && <div className="fap-error">{error}</div>}

      {/* 列表 */}
      <div className="fap-list">
        {!loading && items.length === 0 && (
          <div className="fap-empty">
            <span className="fap-empty-icon">📭</span>
            <p>暂无反馈</p>
          </div>
        )}

        {items.map(item => (
          <div key={item.id} className={`fap-item ${expandedId === item.id ? 'expanded' : ''}`}>
            <button
              className="fap-item-header"
              onClick={() => toggleExpand(item.id)}
            >
              <span className="fap-item-icon">{TYPE_ICONS[item.type] || '💬'}</span>
              <div className="fap-item-info">
                <span className="fap-item-type">{TYPE_LABELS[item.type] || item.type}</span>
                {item.title && (
                  <span className="fap-item-title">{item.title}</span>
                )}
                {item.type === 'satisfaction' && item.rating && (
                  <span className="fap-item-rating">
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                    <span className="fap-item-rating-num">{item.rating}/5</span>
                  </span>
                )}
              </div>
              <span className={`fap-item-status ${STATUS_CLASS[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
              <span className="fap-item-time">{formatTime(item.created_at)}</span>
              <svg
                className={`fap-item-chevron ${expandedId === item.id ? 'open' : ''}`}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedId === item.id && (
              <div className="fap-item-body">
                <div className="fap-item-detail">
                  <div className="fap-detail-row">
                    <span className="fap-detail-label">描述</span>
                    <p className="fap-detail-text">{item.description || '（无描述）'}</p>
                  </div>

                  {item.contact && (
                    <div className="fap-detail-row">
                      <span className="fap-detail-label">联系方式</span>
                      <span className="fap-detail-value">{item.contact}</span>
                    </div>
                  )}

                  {item.user_id && (
                    <div className="fap-detail-row">
                      <span className="fap-detail-label">用户</span>
                      <span className="fap-detail-value fap-mono">{item.user_id.slice(0, 8)}...</span>
                    </div>
                  )}

                  <div className="fap-detail-row">
                    <span className="fap-detail-label">时间</span>
                    <span className="fap-detail-value">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                  </div>

                  <div className="fap-detail-row">
                    <span className="fap-detail-label">状态</span>
                    <span className={`fap-detail-status ${STATUS_CLASS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                </div>

                <div className="fap-item-actions">
                  <span className="fap-actions-label">操作：</span>
                  {item.status === 'pending' && (
                    <>
                      <button
                        className="fap-action-btn"
                        onClick={() => handleUpdate(item.id, { status: 'reviewed' })}
                        disabled={updatingId === item.id}
                      >
                        标记已处理
                      </button>
                      <button
                        className="fap-action-btn primary"
                        onClick={() => handleUpdate(item.id, { status: 'resolved' })}
                        disabled={updatingId === item.id}
                      >
                        标记已解决
                      </button>
                    </>
                  )}
                  {item.status === 'reviewed' && (
                    <button
                      className="fap-action-btn primary"
                      onClick={() => handleUpdate(item.id, { status: 'resolved' })}
                      disabled={updatingId === item.id}
                    >
                      标记已解决
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <button
                      className="fap-action-btn ghost"
                      onClick={() => handleUpdate(item.id, { status: 'pending' })}
                      disabled={updatingId === item.id}
                    >
                      重新打开
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
