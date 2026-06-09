import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import './ProfilePage.css'

function getHistoryStats() {
  try {
    const history = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
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
  const { user, connected, signOut } = useSupabase()
  const { plan, isPro, isTeacher, dailyUsage, dailyLimit, remaining, initiateUpgrade, manageSubscription } = useSubscription()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(getHistoryStats())
  }, [])

  const planBadge = () => {
    if (isTeacher) return { label: '教师版', className: 'teacher' }
    if (isPro) return { label: '专业版', className: 'pro' }
    return { label: '免费版', className: 'free' }
  }

  const badge = planBadge()

  const handleUpgrade = () => {
    if (!user) {
      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
      return
    }
    if (isTeacher) {
      manageSubscription()
      return
    }
    initiateUpgrade('pro', 'monthly')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <Link to="/" className="profile-back">← 返回首页</Link>
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
              <span className={`profile-plan-badge ${badge.className}`}>
                {badge.label}
              </span>
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
                onClick={() => document.dispatchEvent(new CustomEvent('mathviz:show-auth'))}
              >
                登录 / 注册
              </button>
            )}
          </div>
        </section>

        {/* ── Subscription card ── */}
        <section className="profile-card">
          <h3 className="profile-card-title">订阅方案</h3>
          <div className="profile-stats-grid">
            <div className="profile-stat">
              <span className="profile-stat-value">{badge.label}</span>
              <span className="profile-stat-label">当前方案</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">
                {isPro || isTeacher ? '∞' : `${remaining}/${dailyLimit}`}
              </span>
              <span className="profile-stat-label">今日剩余</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">
                {dailyUsage || 0}
              </span>
              <span className="profile-stat-label">今日已用</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">
                {connected ? '已连接' : '离线'}
              </span>
              <span className="profile-stat-label">云端状态</span>
            </div>
          </div>

          <div className="profile-subscription-action">
            {isPro || isTeacher ? (
              <>
                <p className="profile-subscription-desc">
                  你正在使用 {badge.label}，享受全部功能。
                </p>
                <button className="profile-btn profile-btn-secondary" onClick={manageSubscription}>
                  管理订阅
                </button>
              </>
            ) : (
              <>
                <p className="profile-subscription-desc">
                  免费版每日 {dailyLimit} 次生成。升级专业版解锁无限使用。
                </p>
                <button className="profile-btn profile-btn-gradient" onClick={handleUpgrade}>
                  升级专业版 ¥19/月
                </button>
              </>
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
            <Link to="/history" className="profile-link-item">
              <span>学习历史</span>
              <span className="profile-link-arrow">→</span>
            </Link>
            <Link to="/settings" className="profile-link-item">
              <span>设置</span>
              <span className="profile-link-arrow">→</span>
            </Link>
            <Link to="/pricing" className="profile-link-item">
              <span>查看定价方案</span>
              <span className="profile-link-arrow">→</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
