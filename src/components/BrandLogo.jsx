/**
 * BrandLogo — 即懂
 * 图形语言：疑惑（问号）→ 橙光点亮 → 对钩（懂了）。
 * 静态图标取「最终态」：对钩 + 橙点。构图为点钩一体的对角平衡——
 * 点（起点）与钩（终点）居中收拢，四边留白均匀，48px 下依然清晰。
 * currentColor 自适应深浅主题。
 */
export default function BrandLogo({ size = 22, className = '', title = '即懂' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label={title}
    >
      {/* 光晕：问题被点亮（弱化，不抢钩的重量） */}
      <circle
        cx="10.2"
        cy="17.2"
        r="4.2"
        style={{ stroke: 'var(--accent)' }}
        strokeWidth="1.1"
        opacity="0.24"
      />
      {/* 橙色光点（疑问的圆点，被点亮）——用品牌橙变量，深浅主题自适应 */}
      <circle cx="10.2" cy="17.2" r="2.2" style={{ fill: 'var(--accent)' }} />
      {/* 对钩：问号被补完，变成「懂了」——加粗线，承担主要视觉重量 */}
      <path
        d="M12.6 18.8 L16.1 22.4 L24.6 10.8"
        stroke="currentColor"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
