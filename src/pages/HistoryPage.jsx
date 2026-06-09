import { Link } from 'react-router-dom'

export default function HistoryPage() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: 40,
      color: 'var(--text-secondary)',
      position: 'relative',
    }}>
      {/* ← 返回首页 */}
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
    </div>
  )
}
