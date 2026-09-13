import { memo } from 'react'
import './MathText.css'

/**
 * 把 normalizeLatexForDisplay 输出的纯文本数学记号渲染成带样式的 HTML。
 * 目前支持：向量 →AB（横跨字母的上箭头）。
 * 其余文本原样输出，不做 HTML 注入，安全。
 */
const VECTOR_RE = /→([A-Z][A-Z0-9'′]*)/g

function renderMathText(text) {
  if (!text) return null
  const str = String(text)
  const parts = []
  let lastIndex = 0
  let m
  VECTOR_RE.lastIndex = 0
  while ((m = VECTOR_RE.exec(str)) !== null) {
    if (m.index > lastIndex) {
      parts.push(str.slice(lastIndex, m.index))
    }
    parts.push(
      <span key={`vec-${m.index}`} className="math-vec" title={`向量 ${m[1]}`}>
        {m[1]}
      </span>
    )
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex))
  }
  return parts
}

function MathText({ text, className = '', as: Tag = 'span' }) {
  return <Tag className={`math-text ${className}`}>{renderMathText(text)}</Tag>
}

export default memo(MathText)
