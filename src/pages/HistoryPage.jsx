import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './HistoryPage.css'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
      setHistory(saved)
    } catch { /* */ }
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
      } catch { /* */ }
      navigate(`/workspace?q=${encodeURIComponent(item.text)}&replay=1`)
    } else {
      navigate(`/workspace?q=${encodeURIComponent(item.text)}`)
    }
  }

  const handleClear = () => {
    try {
      localStorage.removeItem('mathviz_history')
      setHistory([])
    } catch { /* */ }
  }

  // 按日期分组
  const grouped = history.reduce((groups, item) => {
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
        {history.length > 0 && (
          <button className="history-clear" onClick={handleClear}>
            清空记录
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">◈</div>
          <h2 className="history-empty-title">暂无学习记录</h2>
          <p className="history-empty-desc">开始解一道几何题，记录会自动保存</p>
          <Link to="/" className="history-empty-cta">开始解题</Link>
        </div>
      ) : (
        <div className="history-list">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="history-group">
              <div className="history-group-label">{dateLabel}</div>
              {items.map((item, i) => (
                <button
                  key={i}
                  className="history-item"
                  onClick={() => handleContinue(item)}
                >
                  <div className="history-item-main">
                    <span className="history-item-time">{formatTime(item.date)}</span>
                    <div className="history-item-content">
                      <span className="history-item-type">
                        {item.type || '立体几何'}
                      </span>
                      <span className="history-item-text">
                        {item.text?.slice(0, 80)}{item.text?.length > 80 ? '…' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="history-item-arrow">→</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
