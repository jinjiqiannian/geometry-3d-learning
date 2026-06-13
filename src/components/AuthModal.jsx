import { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabase, isPhoneLike } from '../contexts/SupabaseContext'
import './AuthModal.css'

// ── 阶段枚举 ──
const STEP_PHONE = 'phone'          // 输入手机号
const STEP_CODE = 'code'            // 输入验证码
const STEP_PASSWORD = 'password'    // 设置密码（注册时）

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export default function AuthModal() {
  const { signIn, signUp, signInWithPhone, signUpWithPhone, signInWithGoogle, user, connected } = useSupabase()

  const [visible, setVisible] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(STEP_PHONE)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [codeVerified, setCodeVerified] = useState(false)

  const inputRef = useRef(null)
  const codeRef = useRef(null)

  const isPhone = isPhoneLike(account) || (account.length > 0 && /^\d/.test(account))

  // ── 弹窗控制 ──
  useEffect(() => {
    const handler = () => setVisible(true)
    document.addEventListener('mathviz:show-auth', handler)
    return () => document.removeEventListener('mathviz:show-auth', handler)
  }, [])

  // Escape key to close
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') setVisible(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  useEffect(() => {
    if (user) setVisible(false)
  }, [user])

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100)
      resetForm()
    }
  }, [visible, isLogin])

  // ── 倒计时 ──
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const resetForm = () => {
    setAccount('')
    setPassword('')
    setCode('')
    setStep(STEP_PHONE)
    setError('')
    setCountdown(0)
    setCodeVerified(false)
  }

  // ── 发送验证码 ──
  const sendCode = useCallback(async () => {
    if (countdown > 0) return
    setError('')
    setLoading(true)

    try {
      // 优先使用 Edge Function
      const anonKey = SUPABASE_ANON_KEY
      const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1]

      if (projectRef && anonKey) {
        const fnUrl = `https://${projectRef}.supabase.co/functions/v1/send-sms`
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ phone: account.replace(/\s/g, ''), purpose: isLogin ? 'login' : 'register' }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || '发送失败')
        }

        // 开发模式：显示后端返回的验证码
        if (data.dev && data.code) {
          setError('') // 清除错误
          console.log(`[DEV] 验证码: ${data.code}`)
          // 用一个不那么显眼的方式提示
        }
      } else {
        // 降级：模拟发送（离线模式）
        await new Promise(r => setTimeout(r, 800))
        console.log('[DEV] 模拟验证码: 123456')
      }

      setStep(STEP_CODE)
      setCountdown(60)
      setTimeout(() => codeRef.current?.focus(), 100)
    } catch (err) {
      setError(err.message || '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }, [account, countdown, isLogin])

  // ── 验证验证码 ──
  const verifyCode = useCallback(async () => {
    if (!code || code.length < 4) {
      setError('请输入完整验证码')
      return
    }
    setError('')
    setLoading(true)

    try {
      const anonKey = SUPABASE_ANON_KEY
      const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1]

      if (projectRef && anonKey) {
        const fnUrl = `https://${projectRef}.supabase.co/functions/v1/verify-code`
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ phone: account.replace(/\s/g, ''), code, purpose: isLogin ? 'login' : 'register' }),
        })
        const data = await res.json()

        if (!res.ok || !data.success || !data.verified) {
          throw new Error(data.error || '验证码错误')
        }
      } else {
        // 降级：任何验证码都通过
        if (code !== '123456') {
          throw new Error('验证码错误（开发模式请用 123456）')
        }
      }

      setCodeVerified(true)

      if (isLogin) {
        // 登录：验证码通过后自动登录
        await handlePhoneLogin()
      } else {
        // 注册：进入设置密码步骤
        setStep(STEP_PASSWORD)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    } catch (err) {
      setError(err.message || '验证失败')
    } finally {
      setLoading(false)
    }
  }, [code, account, isLogin])

  // ── 手机号登录（验证码通过后）──
  const handlePhoneLogin = async () => {
    try {
      // 验证码通过 → 尝试用内部邮箱登录
      // 如果用户已存在，密码是他们自己设置的
      await signInWithPhone(account, password || '')
      setVisible(false)
    } catch {
      // 用户可能还没注册，引导注册
      setError('该手机号尚未注册，请先注册')
      setIsLogin(false)
      setStep(STEP_PASSWORD)
    }
  }

  // ── 提交（邮箱模式/最终注册）──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // 登录：邮箱+密码 或 手机号+密码
        if (isPhone) {
          await signInWithPhone(account, password)
        } else {
          await signIn(account, password)
        }
      } else {
        // 注册
        if (isPhone) {
          if (!codeVerified) {
            throw new Error('请先验证手机号')
          }
          if (!password || password.length < 6) {
            throw new Error('密码至少 6 个字符')
          }
          await signUpWithPhone(account, password)
        } else {
          if (!password || password.length < 6) {
            throw new Error('密码至少 6 个字符')
          }
          await signUp(account, password)
        }
      }
    } catch (err) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  const placeholder = isPhone ? '输入手机号' : '手机号或邮箱'

  // ═══════════════════════════════════
  //  离线模式
  // ═══════════════════════════════════
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
          <p className="auth-desc">当前运行在本地模式，所有功能均可使用。</p>
          <ul className="auth-offline-features">
            <li>完整 3D 几何可视化</li>
            <li>AI 分步解题讲解</li>
            <li>每日 50 次免费使用</li>
            <li>历史记录本地保存</li>
          </ul>
          <p className="auth-offline-note">配置 Supabase 后可启用云端同步、账号系统和专业版订阅。</p>
          <div className="auth-actions">
            <button className="auth-submit" onClick={() => setVisible(false)}>开始使用</button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════
  //  正常模式
  // ═══════════════════════════════════
  return (
    <div className="auth-overlay" onClick={() => setVisible(false)}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={() => setVisible(false)}>×</button>

        <div className="auth-icon-row">
          <div className="auth-icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
        </div>

        <h2 className="auth-title">
          {isLogin ? '欢迎回来' : '创建账号'}
        </h2>
        <p className="auth-desc">
          {isLogin
            ? (step === STEP_CODE ? `验证码已发送至 ${account}` : '手机号或邮箱登录')
            : (step === STEP_CODE ? '输入短信验证码' : step === STEP_PASSWORD ? '请设置登录密码' : '手机号快速注册')
          }
        </p>

        {/* ── Step 1: 输入手机号 ── */}
        {step === STEP_PHONE && (
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
            <div className="auth-input-wrapper">
              <input
                ref={inputRef}
                className="auth-input"
                type="text"
                inputMode="text"
                placeholder={placeholder}
                value={account}
                onChange={(e) => { setAccount(e.target.value); setError('') }}
                autoComplete="off"
                name="mathviz-account"
                required
              />
              {account && (
                <span className="auth-input-hint">
                  {isPhone ? '📱' : '📧'}
                </span>
              )}
            </div>

            {error && <div className="auth-error">{error}</div>}

            {isPhone ? (
              /* 手机号 → 发验证码 */
              <button
                className="auth-submit"
                type="button"
                onClick={sendCode}
                disabled={loading || countdown > 0 || !account}
              >
                {loading ? '发送中…' : countdown > 0 ? `${countdown}秒后重发` : '📱 获取验证码'}
              </button>
            ) : (
              /* 邮箱 → 输入密码 */
              <>
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
              </>
            )}
          </form>
        )}

        {/* ── Step 2: 输入验证码 ── */}
        {step === STEP_CODE && (
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); verifyCode(); }}>
            <div className="auth-input-wrapper">
              <input
                ref={codeRef}
                className="auth-input auth-code-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="输入 6 位验证码"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                autoComplete="one-time-code"
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="button" onClick={verifyCode} disabled={loading || code.length < 4}>
              {loading ? '验证中…' : '✅ 验证'}
            </button>

            <button
              className="auth-link-btn"
              type="button"
              onClick={sendCode}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${countdown}秒后重新发送` : '重新发送验证码'}
            </button>
          </form>
        )}

        {/* ── Step 3: 设置密码（注册）── */}
        {step === STEP_PASSWORD && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <span className="auth-check-badge">✅ 手机号已验证</span>
            </div>

            <input
              ref={inputRef}
              className="auth-input"
              type="password"
              placeholder="设置登录密码（至少 6 位）"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              minLength={6}
              autoComplete="new-password"
              required
            />

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? '创建中…' : '🎉 完成注册'}
            </button>
          </form>
        )}

        {/* ── 分隔 & 其他登录方式 ── */}
        {step === STEP_PHONE && (
          <>
            <div className="auth-divider"><span>或</span></div>
            <button className="auth-google" onClick={signInWithGoogle} type="button">
              使用 Google 账号登录
            </button>
          </>
        )}

        {/* ── 切换登录/注册 ── */}
        {step === STEP_PHONE && (
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
        )}

        {/* ── 返回 ── */}
        {step !== STEP_PHONE && (
          <p className="auth-switch">
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => { setStep(STEP_PHONE); setError(''); setCountdown(0); }}
            >
              ← 返回
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
