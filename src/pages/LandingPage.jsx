import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { EXAMPLES } from '../constants'
import { recommendProblems } from '../engines/difficultyEngine'
import CameraCapture from '../features/solid-geometry/CameraCapture'
import './LandingPage.css'

// ── Logo SVG 组件 ─────────────────────────────────
function GeometryLogo() {
  return (
    <svg className="landing-logo-svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
      <path d="M3 9l13 7 13-7" />
      <path d="M16 23V9" />
      <path d="M8 13.5l8 4 8-4" />
      <path d="M8 18.5l8 4 8-4" />
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { isPro } = useSubscription()

  // ── Input state ──
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const cameraApiKey = useRef('')
  useEffect(() => {
    try { cameraApiKey.current = localStorage.getItem('mathviz_deepseek_key') || localStorage.getItem('mathviz_openai_key') || '' }
    catch { /* */ }
  }, [])

  // ── 历史记录（localStorage） ──
  const [history, setHistory] = useState([])
  const [recommended, setRecommended] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
      setHistory(saved.slice(0, 5))
      // 自适应推荐
      if (saved.length > 0) {
        const recs = recommendProblems(saved)
        setRecommended(recs)
      }
    } catch { /* */ }
  }, [])

  // ── Handle generate ──
  const handleGenerate = useCallback(async (text) => {
    const trimmed = text.trim()
    if (trimmed.length < 3) return

    setLoading(true)
    setError(null)

    // 导航到工作台，附带题目
    navigate(`/workspace?q=${encodeURIComponent(trimmed)}`)
  }, [navigate])

  // ── Submit ──
  const handleSubmit = () => {
    handleGenerate(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── 点击例题 ──
  const handleExample = (text) => {
    setInput(text)
    handleGenerate(text)
  }

  // ── 最近学习记录 ──
  const handleContinue = (item) => {
    navigate(`/workspace?q=${encodeURIComponent(item.text)}`)
  }

  // ── 拍照识别完成 ──
  const handleGeometryRecognized = useCallback((result) => {
    const desc = result?.explanation || result?.text || ''
    if (desc) setInput(prev => prev ? `${prev}\n${desc}` : desc)
    setShowCamera(false)
  }, [])

  // ── 格式化日期 ──
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="landing">
      {/* ── Hero ─────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-logo">
            <GeometryLogo />
            <span className="landing-logo-text">几何维度</span>
          </div>

          <h1 className="landing-title">
            AI 立体几何学习助手
          </h1>
          <p className="landing-subtitle">
            输入一道几何题，自动生成三维讲解
          </p>

          {/* ── Input ── */}
          <div className={`landing-input-wrap ${focused ? 'focused' : ''}`}>
            <textarea
              className="landing-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="输入一道立体几何题，如：正方体ABCD-A₁B₁C₁D₁棱长为2，求异面直线A₁B与B₁C所成角余弦值"
              rows={3}
              spellCheck={false}
            />
            <div className="landing-input-footer">
              <span className="landing-input-hint">
                {loading ? '解析中…' : (input.trim().length < 3 ? '请输入题目' : '按 Enter 发送')}
              </span>
              <button
                className="landing-submit"
                onClick={handleSubmit}
                disabled={input.trim().length < 3 || loading}
              >
                {loading ? '解析中…' : '开始解析'}
                <span className="landing-submit-shortcut">↵</span>
              </button>
            </div>
          </div>

          {error && <div className="landing-error">{error}</div>}

          {/* 拍照输入 */}
          <div className="landing-camera-toggle">
            {!showCamera ? (
              <button
                className="landing-camera-trigger"
                onClick={() => setShowCamera(true)}
              >
                拍照识别几何体
              </button>
            ) : (
              <div className="landing-camera-panel">
                <CameraCapture
                  apiKey={cameraApiKey.current}
                  onGeometryGenerated={handleGeometryRecognized}
                />
                <button
                  className="landing-camera-close"
                  onClick={() => setShowCamera(false)}
                >
                  收起
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 热门例题 ──────────────────────────── */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">热门例题</h2>
        </div>
        <div className="landing-examples-grid">
          {EXAMPLES.slice(0, 6).map((ex) => (
            <button
              key={ex.id}
              className="landing-example-card"
              onClick={() => handleExample(ex.text)}
            >
              <span className="landing-example-category">{ex.category}</span>
              <span className="landing-example-title">{ex.title}</span>
              <span className="landing-example-desc">{ex.text.slice(0, 40)}…</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 为你推荐（自适应） ───────────────── */}
      {recommended && recommended.recommendations?.length > 0 && (
        <section className="landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">为你推荐</h2>
            <span className="landing-section-hint">{recommended.reason}</span>
          </div>
          <div className="landing-examples-grid">
            {recommended.recommendations.map((rec, i) => (
              <button
                key={`rec-${i}`}
                className="landing-example-card"
                onClick={() => handleExample(rec.text)}
              >
                <span className="landing-example-category">
                  {rec.difficulty === 'easy' ? '🟢 入门' : rec.difficulty === 'medium' ? '🟡 进阶' : '🔴 挑战'}
                </span>
                <span className="landing-example-title">{rec.title}</span>
                <span className="landing-example-desc">{rec.text.slice(0, 40)}…</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 最近学习 ──────────────────────────── */}
      {history.length > 0 && (
        <section className="landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">最近学习</h2>
          </div>
          <div className="landing-history-list">
            {history.map((item, i) => (
              <button
                key={i}
                className="landing-history-item"
                onClick={() => handleContinue(item)}
              >
                <div className="landing-history-left">
                  <span className="landing-history-date">{formatDate(item.date)}</span>
                  <span className="landing-history-text">{item.text.slice(0, 60)}{item.text.length > 60 ? '…' : ''}</span>
                </div>
                <span className="landing-history-arrow">→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer 品牌区 ─────────────────────── */}
      <section className="landing-footer">
        <div className="landing-footer-brand">
          <GeometryLogo />
          <span>几何维度</span>
        </div>
        <p className="landing-footer-text">
          AI 驱动的立体几何学习工具 · 三步学会一道题
        </p>
        {!isPro && (
          <button
            className="landing-footer-upgrade"
            onClick={() => document.dispatchEvent(new CustomEvent('mathviz:show-paywall'))}
          >
            升级专业版，解锁无限解析
          </button>
        )}
      </section>
    </div>
  )
}
