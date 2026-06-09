import { useState, useEffect } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import './AuthModal.css'

export default function AuthModal() {
  const { signIn, signUp, signInWithGoogle, user, connected } = useSupabase()
  const [visible, setVisible] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(true)
    document.addEventListener('mathviz:show-auth', handler)
    return () => document.removeEventListener('mathviz:show-auth', handler)
  }, [])

  useEffect(() => {
    if (user) setVisible(false)
  }, [user])

  if (!visible) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
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

        <h2 className="auth-title">{isLogin ? '登录' : '注册账号'}</h2>
        <p className="auth-desc">保存作品，解锁专业版功能</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
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
