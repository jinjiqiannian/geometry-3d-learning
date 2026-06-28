import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import { useSubscription } from '../contexts/SubscriptionContext'
import { SUBJECTS } from '../constants'
import './AppNavigation.css'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/workspace', label: '工作台' },
  { path: '/history', label: '历史' },
  { path: '/edumind/profile', label: '考试分析' },
  { path: '/settings', label: '设置' },
]

function LogoIcon() {
  return (
    <svg className="app-nav-logo-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
      <path d="M3 9l13 7 13-7" />
      <path d="M16 23V9" />
      <path d="M8 13.5l8 4 8-4" />
      <path d="M8 18.5l8 4 8-4" />
    </svg>
  )
}

function SubjectIcon({ type, size = 18 }) {
  const icons = {
    math: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
        <path d="M3 9l13 7 13-7" />
        <path d="M16 23V9" />
      </svg>
    ),
    physics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
    chemistry: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <circle cx="12" cy="8" r="3" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 11L12 13" />
        <path d="M12 13L8 13" />
        <path d="M12 13L16 13" />
        <path d="M12 11C10 11 8 13 8 13" />
        <path d="M12 11C14 11 16 13 16 13" />
      </svg>
    ),
    biology: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
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

export default function AppNavigation() {
  const location = useLocation()
  const { plan, isPro } = useSubscription()
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)

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
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-nav-logo">
          <LogoIcon />
          <span className="app-nav-brand">几何维度</span>
        </Link>

        <div className="app-nav-subject-dropdown" onMouseEnter={() => setShowSubjectDropdown(true)} onMouseLeave={() => setShowSubjectDropdown(false)}>
          <button className="app-nav-subject-btn" aria-haspopup="true" aria-expanded={showSubjectDropdown}>
            <SubjectIcon type={currentSubject.icon} />
            <span className="app-nav-subject-name">{currentSubject.name}</span>
            <svg className="app-nav-subject-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 4.5l3 3 3-3" />
            </svg>
          </button>
          {showSubjectDropdown && (
            <div className="app-nav-subject-menu" role="menu">
              {SUBJECTS.map(subject => (
                <Link
                  key={subject.id}
                  to={subject.path}
                  className={`app-nav-subject-item ${subject.id === currentSubject.id ? 'active' : ''}`}
                  role="menuitem"
                  onClick={() => setShowSubjectDropdown(false)}
                >
                  <div className="app-nav-subject-item-icon" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                    <SubjectIcon type={subject.icon} size={16} />
                  </div>
                  <div className="app-nav-subject-item-content">
                    <div className="app-nav-subject-item-name">{subject.name}</div>
                    <div className="app-nav-subject-item-desc">{subject.description}</div>
                  </div>
                  {subject.id === currentSubject.id && (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <polyline points="4 8 8 12 12 4" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="app-nav-links" aria-label="主导航">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`app-nav-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="app-nav-right">
        <ThemeToggle />
        <Link
          to="/pricing"
          className={`app-nav-pricing ${isPro ? 'is-pro' : ''}`}
        >
          {isPro ? (plan === 'teacher' ? '教师版' : 'Pro') : ''}
          {!isPro && <span className="app-nav-upgrade-dot" />}
        </Link>
        <UserMenu />
      </div>
    </nav>
  )
}