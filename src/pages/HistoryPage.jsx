import { Link } from 'react-router-dom'

export default function HistoryPage() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 40,
      color: 'var(--text-secondary)',
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        历史记录
      </h2>
      <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
        暂无解题记录
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          padding: '8px 20px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent)',
          color: 'var(--text-inverse)',
          textDecoration: 'none',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}
      >
        开始解题
      </Link>
    </div>
  )
}
