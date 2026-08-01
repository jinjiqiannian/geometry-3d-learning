/**
 * BrandLogo — 理解引擎
 * 抽象「层叠视窗」：两片错位平面 + 一条洞察斜线，不直写汉字、不绑科目。
 */
export default function BrandLogo({ size = 22, className = '', title = '理解引擎' }) {
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
      <rect
        x="4"
        y="7"
        width="18"
        height="18"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        opacity="0.35"
      />
      <rect
        x="10"
        y="5"
        width="18"
        height="18"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 20.5L24 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  )
}
