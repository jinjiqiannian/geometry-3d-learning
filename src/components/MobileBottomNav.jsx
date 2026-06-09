// ═══════════════════════════════════════════════════════
//  MobileBottomNav — 移动端底部 Tab 导航
//  固定在底部显示：首页、工作台、历史、设置
//  保证任何页面最多两次点击回到首页
// ═══════════════════════════════════════════════════════

import { Link, useLocation } from 'react-router-dom'
import './MobileBottomNav.css'

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '◈' },
  { path: '/workspace', label: '工作台', icon: '◇' },
  { path: '/history', label: '历史', icon: '▣' },
  { path: '/settings', label: '设置', icon: '⚙' },
]

export default function MobileBottomNav() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`mb-nav-item ${isActive(item.path) ? 'active' : ''}`}
        >
          <span className="mb-nav-icon">{item.icon}</span>
          <span className="mb-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
