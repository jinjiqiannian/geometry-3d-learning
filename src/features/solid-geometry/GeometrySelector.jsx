import { GEOMETRIES } from '../../constants'
import './GeometrySelector.css'

// ── 教科书风格 SVG 几何图标（全实线，透明度区分前后）──
function GeoIcon({ type }) {
  const s = 28
  const stroke = '#333'
  const sw = 1.2

  switch (type) {
    // ── 正方体：正面微偏视角 ──
    case 'cube':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <rect x="6" y="4" width="14" height="14" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.35" />
          <rect x="9" y="7" width="14" height="14" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <line x1="6" y1="4" x2="9" y2="7" stroke={stroke} strokeWidth={sw} opacity="0.5" />
          <line x1="20" y1="4" x2="23" y2="7" stroke={stroke} strokeWidth={sw} opacity="0.5" />
          <line x1="6" y1="18" x2="9" y2="21" stroke={stroke} strokeWidth={sw} opacity="0.5" />
          <line x1="20" y1="18" x2="23" y2="21" stroke={stroke} strokeWidth={sw} opacity="0.5" />
        </svg>
      )

    // ── 球体：圆 + 赤道 + 经线 ──
    case 'sphere':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="10" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <ellipse cx="14" cy="14" rx="9.5" ry="4" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          <ellipse cx="14" cy="14" rx="4" ry="9.5" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.35" />
        </svg>
      )

    // ── 圆柱：顶椭圆 + 底椭圆 + 侧边 ──
    case 'cylinder':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <line x1="5" y1="9" x2="5" y2="21" stroke={stroke} strokeWidth={sw} />
          <line x1="23" y1="9" x2="23" y2="21" stroke={stroke} strokeWidth={sw} />
          <ellipse cx="14" cy="21" rx="9" ry="3" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <ellipse cx="14" cy="9" rx="9" ry="3" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
        </svg>
      )

    // ── 圆锥：底椭圆 + 顶点 + 母线 ──
    case 'cone':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <ellipse cx="14" cy="21" rx="9" ry="3" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <line x1="5" y1="21" x2="14" y2="4" stroke={stroke} strokeWidth={sw} />
          <line x1="23" y1="21" x2="14" y2="4" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="8" x2="14" y2="21" stroke={stroke} strokeWidth={0.6} opacity="0.35" />
        </svg>
      )

    // ── 正四棱锥：平行四边形底面 + 顶点 + 侧棱 ──
    case 'pyramid':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <polygon points="8,22 16,24 22,18 14,16" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.35" />
          <line x1="8" y1="22" x2="15" y2="4" stroke={stroke} strokeWidth={sw} />
          <line x1="16" y1="24" x2="15" y2="4" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          <line x1="22" y1="18" x2="15" y2="4" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="16" x2="15" y2="4" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          <circle cx="15" cy="4" r="1" fill={stroke} />
        </svg>
      )

    // ── 直角三棱柱：立式，底面/顶面三角形 + 垂直侧棱 ──
    case 'prism':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          {/* 底面三角形（稍大） */}
          <polygon points="14,23 22,26 6,26" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          {/* 顶面三角形（高21px） */}
          <polygon points="14,2 22,5 6,5" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.35" />
          {/* 侧棱 严格垂直 */}
          <line x1="14" y1="2" x2="14" y2="23" stroke={stroke} strokeWidth={sw} />
          <line x1="22" y1="5" x2="22" y2="26" stroke={stroke} strokeWidth={sw} />
          <line x1="6" y1="5" x2="6" y2="26" stroke={stroke} strokeWidth={sw} />
        </svg>
      )

    // ── 四棱台：大底面 + 小顶面 + 侧棱 ──
    case 'squareFrustum':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <rect x="5" y="16" width="16" height="10" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <rect x="9" y="4" width="10" height="7" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.35" />
          <line x1="5" y1="16" x2="9" y2="4" stroke={stroke} strokeWidth={sw} />
          <line x1="21" y1="16" x2="19" y2="4" stroke={stroke} strokeWidth={sw} />
          <line x1="5" y1="26" x2="9" y2="11" stroke={stroke} strokeWidth={sw} />
          <line x1="21" y1="26" x2="19" y2="11" stroke={stroke} strokeWidth={sw} />
        </svg>
      )

    // ── 圆台：底大椭圆 + 顶小椭圆 + 母线 ──
    case 'circularFrustum':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          <ellipse cx="14" cy="22" rx="10" ry="3.5" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <ellipse cx="14" cy="8" rx="5" ry="2" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          <line x1="4" y1="22" x2="9" y2="8" stroke={stroke} strokeWidth={sw} />
          <line x1="24" y1="22" x2="19" y2="8" stroke={stroke} strokeWidth={sw} />
        </svg>
      )

    // ── 长方体：正面视角矩形 + 后移侧面 ──
    case 'cuboid':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          {/* 后面（虚线效果用低透明度） */}
          <rect x="4" y="5" width="14" height="12" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.3" />
          {/* 前面（实线清晰） */}
          <rect x="8" y="9" width="14" height="12" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          {/* 连接线（侧面） */}
          <line x1="4" y1="5" x2="8" y2="9" stroke={stroke} strokeWidth={sw} opacity="0.45" />
          <line x1="18" y1="5" x2="22" y2="9" stroke={stroke} strokeWidth={sw} opacity="0.45" />
          <line x1="4" y1="17" x2="8" y2="21" stroke={stroke} strokeWidth={sw} opacity="0.45" />
          <line x1="18" y1="17" x2="22" y2="21" stroke={stroke} strokeWidth={sw} opacity="0.45" />
        </svg>
      )

    // ── 正八面体：上下双金字塔 ──
    case 'octahedron':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          {/* 赤道四边形（低透明度） */}
          <polygon points="6,14 14,8 22,14 14,20" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.3" />
          {/* 上金字塔 */}
          <polygon points="14,4 6,14 14,20" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          {/* 下金字塔 */}
          <polygon points="6,14 14,24 22,14 14,20" fill="none" stroke={stroke} strokeWidth={sw + 0.2} opacity="0.7" />
          {/* 右前棱 */}
          <line x1="14" y1="4" x2="22" y2="14" stroke={stroke} strokeWidth={sw} opacity="0.5" />
          {/* 右后棱 */}
          <line x1="14" y1="4" x2="14" y2="20" stroke={stroke} strokeWidth={sw} opacity="0.4" />
        </svg>
      )

    // ── 正四面体：三角形投影 ──
    case 'tetrahedron':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28">
          {/* 底面三角形 */}
          <polygon points="4,22 14,22 24,22" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.3" />
          {/* 正面三角形 */}
          <polygon points="4,22 14,22 14,6" fill="none" stroke={stroke} strokeWidth={sw + 0.3} />
          {/* 右侧面三角形 */}
          <polygon points="14,22 24,22 14,6" fill="none" stroke={stroke} strokeWidth={sw + 0.2} opacity="0.7" />
          {/* 左侧面三角形 */}
          <polygon points="4,22 14,6 24,22" fill="none" stroke={stroke} strokeWidth={sw} opacity="0.4" />
        </svg>
      )

    default:
      return <svg width={s} height={s} viewBox="0 0 28 28" />
  }
}

export default function GeometrySelector({ onSelect, currentType }) {
  return (
    <div className="geometry-selector">
      {GEOMETRIES.map(geo => (
        <button
          key={geo.id}
          className={`geo-btn ${currentType === geo.id ? 'active' : ''}`}
          onClick={() => onSelect(geo.id, { size: 2 })}
          title={geo.name}
        >
          <span className="icon"><GeoIcon type={geo.id} /></span>
          <span className="label">{geo.name}</span>
        </button>
      ))}
    </div>
  )
}
