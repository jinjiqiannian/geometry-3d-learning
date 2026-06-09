// ═══════════════════════════════════════════════════════
//  MobileBottomNav — 移动端底部 Tab 导航
//  固定在底部显示：首页 · 工作台 · 历史 · 我的
//  保证任何页面最多两次点击回到首页
// ═══════════════════════════════════════════════════════

import { Link, useLocation } from 'react-router-dom'
import './MobileBottomNav.css'

// ── SVG 图标组件 ────────────────────────────────────

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function WorkspaceIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" />
      <path d="M2 7l10 5 10-5" />
      <path d="M12 22V12" />
      <path d="M7 9.5l5 2.5 5-2.5" />
    </svg>
  )
}

function HistoryIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/workspace', label: '工作台', icon: WorkspaceIcon },
  { path: '/history', label: '历史', icon: HistoryIcon },
  { path: '/settings', label: '我的', icon: ProfileIcon },
]

export default function MobileBottomNav() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map(item => {
        const active = isActive(item.path)
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mb-nav-item ${active ? 'active' : ''}`}
          >
            <Icon active={active} />
            <span className="mb-nav-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
