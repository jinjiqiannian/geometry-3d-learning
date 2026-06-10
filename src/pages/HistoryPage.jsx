import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GEOMETRY_NAMES } from '../constants'
import './HistoryPage.css'

const ALL_TYPES = '全部类型'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [filterType, setFilterType] = useState(ALL_TYPES)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // index of item to delete

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
      setHistory(saved)
    } catch (err) {
      console.warn('HistoryPage: Failed to load history from localStorage', err)
    }
  }, [])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const handleContinue = (item) => {
    // 如果有已保存的步骤，通过 sessionStorage 传递，避免重复 AI 请求
    if (item.steps && item.steps.length > 0) {
      try {
        sessionStorage.setItem('mathviz_replay_steps', JSON.stringify(item.steps))
        sessionStorage.setItem('mathviz_replay_parsed', JSON.stringify(item.parsedData || null))
      } catch (err) {
        console.warn('HistoryPage: Failed to save replay to sessionStorage', err)
      }
      navigate(`/workspace?q=${encodeURIComponent(item.text)}&replay=1`)
    } else {
      navigate(`/workspace?q=${encodeURIComponent(item.text)}`)
    }
  }

  const handleClear = () => {
    try {
      localStorage.removeItem('mathviz_history')
      setHistory([])
    } catch (err) {
      console.warn('HistoryPage: Failed to clear history', err)
    }
  }

  const handleDeleteOne = (index) => {
    try {
      const updated = history.filter((_, i) => i !== index)
      localStorage.setItem('mathviz_history', JSON.stringify(updated))
      setHistory(updated)
      setDeleteConfirm(null)
    } catch (err) {
      console.warn('HistoryPage: Failed to delete history item', err)
    }
  }

  // ── 提取所有出现过的类型 ──
  const availableTypes = [...new Set(history.map(item => item.type || '其他'))]

  // ── 按类型筛选 ──
  const filtered = filterType === ALL_TYPES
    ? history
    : history.filter(item => (item.type || '其他') === filterType)

  // 按日期分组
  const grouped = filtered.reduce((groups, item) => {
    const dateKey = formatDate(item.date)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(item)
    return groups
  }, {})

  return (
    <div className="history-page">
      <div className="history-header">
        <Link to="/" className="history-back">← 返回首页</Link>
        <h1 className="history-title">学习记录</h1>
        <div className="history-header-actions">
          {availableTypes.length > 1 && (
            <select
              className="history-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value={ALL_TYPES}>{ALL_TYPES}（{history.length}）</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>
                  {GEOMETRY_NAMES[t] || t}（{history.filter(item => (item.type || '其他') === t).length}）
                </option>
              ))}
            </select>
          )}
          {history.length > 0 && (
            <button className="history-clear" onClick={handleClear}>
              清空全部
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">◈</div>
          <h2 className="history-empty-title">
            {history.length === 0 ? '暂无学习记录' : '没有匹配的记录'}
          </h2>
          <p className="history-empty-desc">
            {history.length === 0 ? '开始解一道几何题，记录会自动保存' : '尝试切换筛选类型'}
          </p>
          <Link to="/" className="history-empty-cta">开始解题</Link>
        </div>
      ) : (
        <div className="history-list">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="history-group">
              <div className="history-group-label">
                {dateLabel}
                <span className="history-group-count">{items.length} 题</span>
              </div>
              {items.map((item, groupIdx) => {
                const globalIdx = history.indexOf(item)
                return (
                  <div key={groupIdx} className="history-item-wrap">
                    <button
                      className="history-item"
                      onClick={() => handleContinue(item)}
                    >
                      <div className="history-item-main">
                        <span className="history-item-time">{formatTime(item.date)}</span>
                        <div className="history-item-content">
                          <span className="history-item-type">
                            {GEOMETRY_NAMES[item.type] || item.type || '立体几何'}
                            {item.steps?.length > 0 && (
                              <span className="history-item-badge">可回放</span>
                            )}
                          </span>
                          <span className="history-item-text">
                            {item.text?.slice(0, 80)}{item.text?.length > 80 ? '…' : ''}
                          </span>
                        </div>
                      </div>
                      <span className="history-item-arrow">→</span>
                    </button>
                    <button
                      className="history-item-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (deleteConfirm === globalIdx) {
                          handleDeleteOne(globalIdx)
                        } else {
                          setDeleteConfirm(globalIdx)
                          // 3秒后自动取消确认
                          setTimeout(() => setDeleteConfirm(null), 3000)
                        }
                      }}
                      title={deleteConfirm === globalIdx ? '确认删除' : '删除此记录'}
                    >
                      {deleteConfirm === globalIdx ? '确认?' : '×'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
