import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { SUBJECTS } from '../constants'
import './MobileBottomNav.css'

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

function BarChartIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}

function SubjectIcon({ type, color, active }) {
  const icons = {
    math: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'var(--text-muted)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
        <path d="M3 9l13 7 13-7" />
        <path d="M16 23V9" />
      </svg>
    ),
    physics: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'var(--text-muted)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
    chemistry: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'var(--text-muted)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 11L12 13" />
        <path d="M12 13L8 13" />
        <path d="M12 13L16 13" />
      </svg>
    ),
    biology: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'var(--text-muted)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="8" ry="10" />
        <path d="M12 4L12 20" />
        <path d="M6 8L18 8" />
        <path d="M6 12L18 12" />
        <path d="M6 16L18 16" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  }
  return icons[type] || icons.math
}

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/workspace', label: '工作台', icon: WorkspaceIcon },
  { path: '/history', label: '历史', icon: HistoryIcon },
  { path: '/edumind/profile', label: '分析', icon: BarChartIcon },
  { path: '/settings', label: '我的', icon: ProfileIcon },
]

export default function MobileBottomNav() {
  const location = useLocation()
  const [showSubjectMenu, setShowSubjectMenu] = useState(false)

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const getCurrentSubject = () => {
    const subject = SUBJECTS.find(s => location.pathname.startsWith(s.path))
    return subject || SUBJECTS[0]
  }

  const currentSubject = getCurrentSubject()

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="底部导航">
        {NAV_ITEMS.map((item, index) => {
          if (index === 0) {
            return (
              <div key={item.path} className="mb-nav-subject-wrapper">
                <Link
                  to={item.path}
                  className={`mb-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  aria-label={item.label}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <item.icon active={isActive(item.path)} />
                  <span className="mb-nav-label">{item.label}</span>
                </Link>
                <button
                  className="mb-nav-subject-toggle"
                  onClick={() => setShowSubjectMenu(v => !v)}
                  aria-label="切换学科"
                >
                  <SubjectIcon type={currentSubject.icon} color={currentSubject.color} active={true} />
                </button>
              </div>
            )
          }
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mb-nav-item ${active ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon active={active} />
              <span className="mb-nav-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {showSubjectMenu && (
        <>
          <div className="mb-subject-overlay" onClick={() => setShowSubjectMenu(false)} />
          <div className="mb-subject-menu">
            <div className="mb-subject-menu-header">
              <span className="mb-subject-menu-title">选择学科</span>
              <button className="mb-subject-menu-close" onClick={() => setShowSubjectMenu(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mb-subject-menu-list">
              {SUBJECTS.map(subject => (
                <Link
                  key={subject.id}
                  to={subject.path}
                  className={`mb-subject-menu-item ${subject.id === currentSubject.id ? 'active' : ''}`}
                  onClick={() => setShowSubjectMenu(false)}
                >
                  <div className="mb-subject-menu-item-icon" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                    <SubjectIcon type={subject.icon} color={subject.color} active={subject.id === currentSubject.id} />
                  </div>
                  <div className="mb-subject-menu-item-info">
                    <div className="mb-subject-menu-item-name">{subject.name}</div>
                    <div className="mb-subject-menu-item-desc">{subject.description}</div>
                  </div>
                  {subject.id === currentSubject.id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}