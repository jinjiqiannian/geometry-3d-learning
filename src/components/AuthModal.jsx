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
      setError(err.message || 'Failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="auth-overlay" onClick={() => setVisible(false)}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-close" onClick={() => setVisible(false)}>×</button>
          <h2 className="auth-title">Backend not connected</h2>
          <p className="auth-desc">
            Authentication requires Supabase. You can still use core features offline.
          </p>
          <button className="auth-submit" onClick={() => setVisible(false)}>
            Continue offline
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-overlay" onClick={() => setVisible(false)}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={() => setVisible(false)}>×</button>

        <h2 className="auth-title">{isLogin ? 'Sign in' : 'Create account'}</h2>
        <p className="auth-desc">Save your work and access Pro features</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button className="auth-google" onClick={signInWithGoogle} type="button">
          Continue with Google
        </button>

        <p className="auth-switch">
          {isLogin ? 'No account?' : 'Have an account?'}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => { setIsLogin(!isLogin); setError('') }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
