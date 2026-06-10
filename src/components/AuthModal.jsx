import { useState, useEffect, useRef } from 'react'
import { useSupabase, isPhoneLike } from '../contexts/SupabaseContext'
import './AuthModal.css'

export default function AuthModal() {
  const { signIn, signUp, signInWithPhone, signUpWithPhone, signInWithGoogle, user, connected } = useSupabase()
  const [visible, setVisible] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [account, setAccount] = useState('')      // 统一输入框：手机号或邮箱
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // 自动判断输入类型
  const isPhone = isPhoneLike(account)

  useEffect(() => {
    const handler = () => setVisible(true)
    document.addEventListener('mathviz:show-auth', handler)
    return () => document.removeEventListener('mathviz:show-auth', handler)
  }, [])

  useEffect(() => {
    if (user) setVisible(false)
  }, [user])

  // 弹窗打开时聚焦输入框
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  if (!visible) return null

  const placeholder = isLogin ? '手机号或邮箱' : '手机号或邮箱'
  const inputType = 'text' // 统一 text，便于输入手机号

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        if (isPhone) {
          await signInWithPhone(account, password)
        } else {
          await signIn(account, password)
        }
      } else {
        if (isPhone) {
          await signUpWithPhone(account, password)
        } else {
          await signUp(account, password)
        }
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="auth-overlay" onClick={() => setVisible(false)}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-close" onClick={() => setVisible(false)}>×</button>
          <div className="auth-offline-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="auth-title">离线模式</h2>
          <p className="auth-desc">
            当前运行在本地模式，所有功能均可使用。
          </p>
          <ul className="auth-offline-features">
            <li>完整 3D 几何可视化</li>
            <li>AI 分步解题讲解</li>
            <li>每日 50 次免费使用</li>
            <li>历史记录本地保存</li>
          </ul>
          <p className="auth-offline-note">
            配置 Supabase 后可启用云端同步、账号系统和专业版订阅。
          </p>
          <div className="auth-actions">
            <button className="auth-submit" onClick={() => setVisible(false)}>
              开始使用
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-overlay" onClick={() => setVisible(false)}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={() => setVisible(false)}>×</button>

        {/* ── 登录方式图标 ── */}
        <div className="auth-icon-row">
          <div className="auth-icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
        </div>

        <h2 className="auth-title">{isLogin ? '欢迎回来' : '创建账号'}</h2>
        <p className="auth-desc">
          {isLogin ? '使用手机号或邮箱登录' : '支持手机号一键注册'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* ── 输入提示标签 ── */}
          <div className="auth-input-wrapper">
            <input
              ref={inputRef}
              className="auth-input"
              type={inputType}
              inputMode="text"
              placeholder={placeholder}
              value={account}
              onChange={(e) => { setAccount(e.target.value); setError('') }}
              autoComplete={isLogin ? 'username' : 'username'}
              required
            />
            {account && (
              <span className="auth-input-hint">
                {isPhone ? '📱 手机号' : '📧 邮箱'}
              </span>
            )}
          </div>

          <input
            className="auth-input"
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '请稍候…' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="auth-divider">
          <span>或</span>
        </div>

        <button className="auth-google" onClick={signInWithGoogle} type="button">
          使用 Google 账号登录
        </button>

        <p className="auth-switch">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => { setIsLogin(!isLogin); setError('') }}
          >
            {isLogin ? '注册' : '登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
