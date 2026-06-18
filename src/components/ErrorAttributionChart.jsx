// ═══════════════════════════════════════════════════════
//  ErrorAttributionChart — 错误归因 CSS 柱状图
// ═══════════════════════════════════════════════════════

const ATTRIBUTION_CONFIG = {
  knowledge_gap: { label: '知识漏洞', color: '#ef4444', icon: '📚' },
  calculation_error: { label: '计算失误', color: '#f59e0b', icon: '🧮' },
  reading_error: { label: '审题错误', color: '#8b5cf6', icon: '📖' },
  time_pressure: { label: '时间压力', color: '#3b82f6', icon: '⏰' },
  psychological: { label: '心理因素', color: '#ec4899', icon: '🎯' },
}

export default function ErrorAttributionChart({ attributions = [] }) {
  if (!attributions || attributions.length === 0) {
    return <div style={{ color: '#888', fontSize: '0.9rem' }}>暂无归因数据</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {attributions.map((item) => {
        const config = ATTRIBUTION_CONFIG[item.type] || { label: item.type, color: '#666', icon: '❓' }
        const pct = Math.round(item.percentage)
        return (
          <div key={item.type}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
              <span>
                {config.icon} {config.label}
              </span>
              <span style={{ fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: config.color,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            {item.description && (
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>{item.description}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
