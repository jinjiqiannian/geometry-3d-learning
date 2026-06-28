// ═══════════════════════════════════════════════════════
//  ErrorAttributionChart — 错误归因柱状图 (div-based)
// ═══════════════════════════════════════════════════════

const CONFIG = {
  knowledge_gap: { label: '知识漏洞', color: '#ef4444', icon: '📚' },
  calculation_error: { label: '计算失误', color: '#f59e0b', icon: '🧮' },
  reading_error: { label: '审题错误', color: '#8b5cf6', icon: '📖' },
  time_pressure: { label: '时间压力', color: '#3b82f6', icon: '⏰' },
  psychological: { label: '心理因素', color: '#ec4899', icon: '🎯' },
}

export default function ErrorAttributionChart({ attributions = [] }) {
  if (!attributions || attributions.length === 0) {
    return <div style={{ color: 'var(--edumind-text-secondary)', fontSize: '0.9rem' }}>暂无归因数据</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {attributions.map(item => {
        const cfg = CONFIG[item.type] || { label: item.type, color: '#666', icon: '❓' }
        const pct = Math.round(item.percentage || 0)
        return (
          <div key={item.type}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
              <span>{cfg.icon} {cfg.label}</span>
              <span style={{ fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--edumind-border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
            {item.description && (
              <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)', marginTop: '2px' }}>{item.description}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
