// ═══════════════════════════════════════════════════════
//  MasteryStars — ★★★★★ 掌握度星标组件
// ═══════════════════════════════════════════════════════

export default function MasteryStars({ mastery = 0, size = 'md' }) {
  const clamped = Math.max(0, Math.min(1, mastery))
  const filled = Math.floor(clamped * 5)
  const remainder = clamped * 5 - filled
  const half = remainder >= 0.3 && remainder < 0.8
  const empty = 5 - filled - (half ? 1 : 0)

  const sizeMap = { sm: 14, md: 18, lg: 24 }
  const px = sizeMap[size] || sizeMap.md
  const color = mastery >= 0.8 ? '#22c55e' : mastery >= 0.6 ? '#eab308' : mastery >= 0.4 ? '#f97316' : '#ef4444'

  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center', verticalAlign: 'middle' }}>
      {Array.from({ length: filled }, (_, i) => (
        <svg key={`f-${i}`} width={px} height={px} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {half && (
        <svg key="half" width={px} height={px} viewBox="0 0 24 24">
          <defs>
            <linearGradient id="halfGrad">
              <stop offset="50%" stopColor={color} />
              <stop offset="50%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#halfGrad)" />
        </svg>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <svg key={`e-${i}`} width={px} height={px} viewBox="0 0 24 24" fill="#e5e7eb">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ marginLeft: '4px', fontSize: `${px - 2}px`, color: '#666' }}>
        {(clamped * 100).toFixed(0)}%
      </span>
    </span>
  )
}
