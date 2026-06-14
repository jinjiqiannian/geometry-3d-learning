import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import './FeedbackModal.css'

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '功能建议' },
  { value: 'bug', label: 'Bug 反馈' },
  { value: 'improvement', label: '体验优化' },
  { value: 'other', label: '其他' },
]

const STORAGE_KEY = 'mathviz:feedback'

export default function FeedbackModal() {
  const { user, displayPhone } = useSupabase()
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState('suggestion')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const titleRef = useRef(null)

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

  // 打开时预填联系人并聚焦
  useEffect(() => {
    if (visible) {
      setSubmitted(false)
      setError('')
      if (user) {
        setContact(displayPhone || user.email || '')
      }
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [visible, user, displayPhone])

  const reset = () => {
    setType('suggestion')
    setTitle('')
    setDescription('')
    setContact('')
    setSubmitted(false)
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('请详细描述你的反馈（至少 10 个字）')
      return
    }

    // 保存到 localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      existing.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type,
        title: title.trim(),
        description: description.trim(),
        contact: contact.trim(),
        user: user ? (displayPhone || user.email || user.id) : null,
        createdAt: new Date().toISOString(),
        status: 'pending',
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
      setSubmitted(true)
      setTimeout(() => setVisible(false), 2000)
    } catch {
      setError('提交失败，请重试')
    }
  }

  if (!visible) return null

  return (
    <div className="fb-overlay" onClick={() => setVisible(false)}>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fb-close" onClick={() => setVisible(false)}>×</button>

        {submitted ? (
          <>
            <div className="fb-success">
              <div className="fb-success-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="fb-title">感谢反馈！</h2>
              <p className="fb-desc">你的意见对我们非常重要，我们会认真阅读每一条反馈。</p>
            </div>
          </>
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
            <p className="fb-desc">帮助我们把几何维度做得更好</p>

            <form className="fb-form" onSubmit={handleSubmit}>
              {/* 反馈类型 */}
              <div className="fb-type-group">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`fb-type-btn ${type === t.value ? 'active' : ''}`}
                    onClick={() => setType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 标题 */}
              <input
                ref={titleRef}
                className="fb-input"
                type="text"
                placeholder="一句话概括"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError('') }}
                maxLength={100}
                autoComplete="off"
                required
              />

              {/* 详细描述 */}
              <textarea
                className="fb-textarea"
                placeholder="请详细描述你的想法、遇到的问题或建议…"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setError('') }}
                rows={4}
                maxLength={2000}
                required
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

              <button className="fb-submit" type="submit">
                提交反馈
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
