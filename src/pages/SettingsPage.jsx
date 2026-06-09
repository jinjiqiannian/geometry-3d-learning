export default function SettingsPage() {
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
        设置
      </h2>
      <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
        设置页面即将上线
      </p>
    </div>
  )
}
