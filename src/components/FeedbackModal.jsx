import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { feedbackAPI } from '../services/api'
import './FeedbackModal.css'

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '功能建议' },
  { value: 'bug', label: 'Bug 反馈' },
  { value: 'improvement', label: '体验优化' },
  { value: 'satisfaction', label: '解题评价' },
  { value: 'other', label: '其他' },
]

const STORAGE_KEY = 'mathviz:feedback'
const RATING_LABELS = ['', '很差', '较差', '一般', '满意', '非常满意']

export default function FeedbackModal() {
  const { user, displayPhone } = useSupabase()
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState('suggestion')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const inputRef = useRef(null)

  // ── 弹窗控制 ──
  useEffect(() => {
    const handler = () => setVisible(true)
    document.addEventListener('mathviz:show-feedback', handler)
    return () => document.removeEventListener('mathviz:show-feedback', handler)
  }, [])

  // Escape 关闭
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') setVisible(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  // 打开时重置状态
  useEffect(() => {
    if (visible) {
      setSubmitted(false)
      setError('')
      setRating(0)
      setHoverRating(0)
      if (user) {
        setContact(displayPhone || user.email || '')
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible, user, displayPhone])

  const reset = () => {
    setType('suggestion')
    setDescription('')
    setContact('')
    setRating(0)
    setSubmitted(false)
    setError('')
  }

  // ── 本地存储兜底 ──
  function saveToLocal(feedback) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      existing.push(feedback)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    } catch { /* ignore */ }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // 校验
    if (type === 'satisfaction' && rating === 0) {
      setError('请选择评分')
      return
    }

    setIsSubmitting(true)

    const feedback = {
      type,
      title: type === 'satisfaction' ? `评分 ${rating}/5` : FEEDBACK_TYPES.find(t => t.value === type)?.label || type,
      description: description.trim(),
      contact: contact.trim() || undefined,
    }

    if (type === 'satisfaction') {
      feedback.rating = rating
    }

    // 1) 尝试 API 提交
    try {
      await feedbackAPI.submit(feedback)
    } catch {
      // API 不可用 → 走本地兜底
      saveToLocal({
        ...feedback,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        user: user ? (displayPhone || user.email || user.id) : null,
        createdAt: new Date().toISOString(),
        status: 'pending',
      })
    }

    setIsSubmitting(false)
    setSubmitted(true)
    reset()
  }

  if (!visible) return null

  return (
    <div className="fb-overlay" onClick={() => setVisible(false)}>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fb-close" onClick={() => setVisible(false)}>×</button>

        {submitted ? (
          <div className="fb-success">
            <div className="fb-success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="fb-title">感谢反馈！</h2>
            <p className="fb-desc">你的意见对我们非常重要，我们会认真阅读每一条反馈。</p>
            <button className="fb-submit fb-close-btn" onClick={() => setVisible(false)}>
              关闭
            </button>
          </div>
        ) : (
          <>
            <div className="fb-icon-row">
              <div className="fb-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            <h2 className="fb-title">意见反馈</h2>
            <p className="fb-desc">帮助我们把理解引擎做得更好</p>

            <form className="fb-form" onSubmit={handleSubmit}>
              {/* 反馈类型 */}
              <div className="fb-type-group">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`fb-type-btn ${type === t.value ? 'active' : ''}`}
                    onClick={() => {
                      setType(t.value)
                      setError('')
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ⭐ 解题评价 — 评分 */}
              {type === 'satisfaction' && (
                <div className="fb-rating-section">
                  <label className="fb-section-label">你的评分</label>
                  <div className="fb-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`fb-star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        tabIndex={-1}
                      >
                        {star <= (hoverRating || rating) ? '★' : '☆'}
                      </button>
                    ))}
                    <span className="fb-star-label">
                      {RATING_LABELS[hoverRating || rating] || ''}
                    </span>
                  </div>
                </div>
              )}

              {/* 详细描述 */}
              <textarea
                ref={inputRef}
                className="fb-textarea"
                placeholder={type === 'satisfaction' ? '你觉得这次的解题体验如何？有什么想说的吗…' : '请详细描述你的想法、遇到的问题或建议…'}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setError('') }}
                rows={4}
                maxLength={2000}
              />
              <span className="fb-count">{description.length}/2000</span>

              {/* 联系方式 */}
              <input
                className="fb-input"
                type="text"
                placeholder="联系方式（选填，方便我们联系你）"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={100}
                autoComplete="off"
              />

              {error && <div className="fb-error">{error}</div>}

              <button className="fb-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中…' : '提交反馈'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
