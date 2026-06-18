// ═══════════════════════════════════════════════════════
//  AICoachPage — AI 学习教练 + 每日提醒
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

export default function AICoachPage() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [reminder, setReminder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const chatRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  async function loadData() {
    try {
      const [remindRes, historyRes] = await Promise.allSettled([
        edumindAPI.getDailyReminder(),
        edumindAPI.getCoachHistory(),
      ])
      if (remindRes.status === 'fulfilled') setReminder(remindRes.value.data)
      if (historyRes.status === 'fulfilled') setMessages(historyRes.value.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || sending) return

    const userMsg = { role: 'user', content: question.trim(), id: 'temp-' + Date.now() }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setSending(true)

    try {
      const res = await edumindAPI.askCoach(userMsg.content)
      if (res.data) {
        setMessages(prev => [...prev, res.data])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleAcknowledge() {
    if (!reminder?.id) return
    try {
      await edumindAPI.acknowledgeReminder(reminder.id)
      setReminder(prev => prev ? { ...prev, is_read: true, is_actioned: true } : null)
    } catch {}
  }

  if (loading) {
    return <div className="edumind-page"><div className="edumind-loading">加载中...</div></div>
  }

  return (
    <div className="edumind-page">
      <Link to="/edumind" className="edumind-link" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← 返回仪表盘
      </Link>

      <h1 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>🤖 AI 学习教练</h1>

      {error && <div className="edumind-error">{error}</div>}

      {/* 今日提醒 */}
      {reminder && (
        <div className="edumind-card edumind-reminder" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="edumind-reminder-title">📌 {reminder.title}</div>
              <div className="edumind-reminder-content">{reminder.content}</div>
            </div>
            {!reminder.is_actioned && (
              <button
                className="edumind-btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 10px', flexShrink: 0 }}
                onClick={handleAcknowledge}
              >
                知道了
              </button>
            )}
            {reminder.is_actioned && (
              <span style={{ color: 'var(--edumind-success)', fontSize: '0.85rem', flexShrink: 0 }}>✅ 已读</span>
            )}
          </div>
        </div>
      )}

      {/* 聊天界面 */}
      <div className="edumind-card">
        <h3>💬 向 AI 教练提问</h3>
        <div ref={chatRef} className="edumind-chat">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--edumind-text-secondary)', padding: '24px' }}>
              <p>你可以问我：</p>
              <p style={{ fontSize: '0.85rem' }}>"这道题为什么错了？"</p>
              <p style={{ fontSize: '0.85rem' }}>"我该如何提高导数部分？"</p>
              <p style={{ fontSize: '0.85rem' }}>"今天应该复习什么？"</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`edumind-chat-message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {sending && (
            <div className="edumind-chat-message assistant" style={{ opacity: 0.7 }}>
              思考中...
            </div>
          )}
        </div>

        <form className="edumind-chat-input" onSubmit={handleAsk}>
          <input
            className="edumind-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="输入你的问题..."
            disabled={sending}
          />
          <button type="submit" className="edumind-btn-primary" disabled={sending || !question.trim()}>
            发送
          </button>
        </form>
      </div>
    </div>
  )
}
