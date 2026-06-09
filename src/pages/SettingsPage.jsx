import { Link } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: 40,
      color: 'var(--text-secondary)',
    }}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          alignSelf: 'flex-start',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--accent-subtle)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
      >
        ← 返回首页
      </Link>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          设置
        </h2>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
          设置页面即将上线
        </p>
      </div>
    </div>
  )
}
