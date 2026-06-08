import { useLocation, Link } from 'react-router-dom'
import { MODULES } from '../constants'
import './HomePage.css' // reuse some styles

const placeholderStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: '60vh',
  textAlign: 'center',
  padding: '40px 24px',
}

const iconStyle = {
  fontSize: '64px',
  marginBottom: '20px',
  lineHeight: 1,
}

const titleStyle = {
  fontSize: '24px',
  fontWeight: 700,
  color: 'var(--color-text)',
  marginBottom: '12px',
}

const descStyle = {
  fontSize: '14px',
  color: 'var(--color-text-muted)',
  marginBottom: '32px',
  lineHeight: 1.6,
}

const btnStyle = {
  display: 'inline-block',
  padding: '12px 28px',
  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
  color: 'white',
  borderRadius: 'var(--radius-md)',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
  boxShadow: '0 2px 8px var(--color-primary-glow)',
  transition: 'all var(--transition-fast)',
}

export default function PlaceholderPage() {
  const location = useLocation()
  const path = location.pathname.replace(/\/$/, '')
  const mod = MODULES.find(m => m.path === path) || {
    name: '未知模块',
    icon: '📚',
    description: '该模块正在规划中',
  }

  return (
    <div style={placeholderStyles}>
      <span style={iconStyle}>{mod.icon}</span>
      <h1 style={titleStyle}>{mod.name}</h1>
      <p style={descStyle}>
        🚧 该模块正在开发中，敬请期待<br />
        {mod.description}
      </p>
      <Link to="/" style={btnStyle}
        onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 16px var(--color-primary-glow)' }}
        onMouseLeave={(e) => { e.target.style.transform = ''; e.target.style.boxShadow = '0 2px 8px var(--color-primary-glow)' }}
      >
        ← 返回首页
      </Link>
    </div>
  )
}
