import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import './ProfilePage.css'

function getHistoryStats() {
  try {
    const history = JSON.parse(localStorage.getItem('jidong_history') || '[]')
    if (!history.length) return null

    const total = history.length
    const typeCounts = {}
    history.forEach(h => {
      const type = h.geometryType || h.type || 'unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    // Most practiced type
    let topType = ''
    let topCount = 0
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > topCount) { topType = type; topCount = count }
    })

    // Map type to Chinese
    const typeNames = {
      cube: '正方体', cuboid: '长方体', sphere: '球体',
      cylinder: '圆柱体', cone: '圆锥体', pyramid: '棱锥',
      prism: '棱柱', squareFrustum: '四棱台', circularFrustum: '圆台',
    }

    return {
      total,
      topType: typeNames[topType] || topType,
      topCount,
      recentDate: history[0]?.date || null,
    }
  } catch {
    return null
  }
}

export default function ProfilePage() {
  const { user, signOut } = useSupabase()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(getHistoryStats())
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="profile-page">
      <div className="app-container">
      <div className="profile-header">
        <Link to="/math" className="profile-back">← 返回</Link>
        <h1 className="profile-title">个人中心</h1>
      </div>

      <div className="profile-content">
        {/* ── User card ── */}
        <section className="profile-card profile-user-card">
          <div className="profile-user-top">
            <div className="profile-avatar">
              {user ? (user.email?.[0] || '?').toUpperCase() : '?'}
            </div>
            <div className="profile-user-info">
              <h2 className="profile-user-name">
                {user ? user.email?.split('@')[0] : '离线用户'}
              </h2>
              <p className="profile-user-email">
                {user ? user.email : '本地模式 · 无需登录'}
              </p>
            </div>
          </div>

          <div className="profile-user-actions">
            {user ? (
              <button className="profile-btn profile-btn-ghost" onClick={signOut}>
                退出登录
              </button>
            ) : (
              <button
                className="profile-btn profile-btn-primary"
                onClick={() => document.dispatchEvent(new CustomEvent('jidong:show-auth'))}
              >
                登录 / 注册
              </button>
            )}
          </div>
        </section>

        {/* ── Learning stats ── */}
        {stats && (
          <section className="profile-card">
            <h3 className="profile-card-title">学习统计</h3>
            <div className="profile-stats-grid">
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.total}</span>
                <span className="profile-stat-label">总解题数</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.topType}</span>
                <span className="profile-stat-label">常用题型</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.topCount}</span>
                <span className="profile-stat-label">该题型次数</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{formatDate(stats.recentDate)}</span>
                <span className="profile-stat-label">最近学习</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Quick links ── */}
        <section className="profile-card">
          <h3 className="profile-card-title">快捷入口</h3>
          <div className="profile-links">
            <Link to="/workspace" className="profile-link-item">
              <span>工作台</span>
              <span className="profile-link-arrow">→</span>
            </Link>
            <Link to="/settings" className="profile-link-item">
              <span>设置</span>
              <span className="profile-link-arrow">→</span>
            </Link>
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
