import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import './UserMenu.css'

export default function UserMenu() {
  const { user, signOut, displayPhone, profile } = useSupabase()
  const { isPro, isTeacher, plan } = useSubscription()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const handleAuth = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
  }

  const handleUpgrade = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-paywall'))
  }

  const handleFeedback = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-feedback'))
  }

  const planBadge = () => {
    if (isTeacher) return { label: '教师版', className: 'teacher' }
    if (isPro) return { label: '专业版', className: 'pro' }
    return { label: '免费版', className: 'free' }
  }

  const badge = planBadge()

  // Not logged in — show login button
  if (!user) {
    return (
      <div className="um-wrap">
        <button className="um-login-btn" onClick={handleAuth}>
          登录
        </button>
        <button
          className={`um-plan-badge ${badge.className}`}
          onClick={handleUpgrade}
        >
          {badge.label}
        </button>
      </div>
    )
  }

  // Logged in — show avatar + dropdown
  const displayName = displayPhone || user?.email || '?'
  const initial = (displayPhone?.slice(-1) || user?.email?.[0] || '?').toUpperCase()

  const menuItems = [
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: '个人中心',
      onClick: () => { navigate('/profile'); setOpen(false) },
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      label: '设置',
      onClick: () => { navigate('/settings'); setOpen(false) },
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      label: '意见反馈',
      onClick: () => { handleFeedback(); setOpen(false) },
    },
  ]

  // Only show upgrade for free users
  if (!isPro && !isTeacher) {
    menuItems.push({
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      label: '升级专业版',
      onClick: () => { handleUpgrade(); setOpen(false) },
      highlight: true,
    })
  }

  menuItems.push({
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    label: '退出登录',
    onClick: () => { signOut(); setOpen(false) },
    danger: true,
  })

  return (
    <div className="um-wrap" ref={menuRef}>
      <button
        className={`um-plan-badge ${badge.className}`}
        onClick={handleUpgrade}
      >
        {badge.label}
      </button>

      <button
        className={`um-avatar-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title={displayName}
      >
        <span className="um-avatar">{initial}</span>
        <svg className={`um-chevron ${open ? 'open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="um-dropdown">
          <div className="um-dropdown-header">
            <span className="um-dropdown-email">{displayName}</span>
            <span className={`um-dropdown-plan ${badge.className}`}>{badge.label}</span>
          </div>
          <div className="um-dropdown-divider" />
          {menuItems.map((item, i) => (
            <button
              key={i}
              className={`um-dropdown-item ${item.highlight ? 'highlight' : ''} ${item.danger ? 'danger' : ''}`}
              onClick={item.onClick}
            >
              <span className="um-dropdown-item-icon">{item.icon}</span>
              <span className="um-dropdown-item-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
