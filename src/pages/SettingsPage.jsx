// ═══════════════════════════════════════════════════════
//  SettingsPage — API · 模型 · 账号
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme } from '../contexts/ThemeContext'
import './SettingsPage.css'

const STORAGE_KEYS = {
  apiProvider: 'mathviz_api_provider',
  modelPreference: 'mathviz_model_preference',
  deepseekApiKey: 'mathviz_deepseek_key',
  openaiApiKey: 'mathviz_openai_key',
}

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', models: ['v4-pro', 'v4-flash'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
]

export default function SettingsPage() {
  const { user, connected } = useSupabase()
  const { plan, isPro, isTeacher, dailyUsage, dailyLimit, initiateUpgrade, manageSubscription } = useSubscription()
  const { theme, setTheme, isDark } = useTheme()

  // ── Local state ──────────────────────────────────
  const [apiProvider, setApiProvider] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.apiProvider) || 'deepseek' }
    catch { return 'deepseek' }
  })
  const [modelPreference, setModelPreference] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.modelPreference) || 'v4-pro' }
    catch { return 'v4-pro' }
  })
  const [apiKey, setApiKey] = useState(() => {
    try {
      const key = apiProvider === 'deepseek'
        ? localStorage.getItem(STORAGE_KEYS.deepseekApiKey) || ''
        : localStorage.getItem(STORAGE_KEYS.openaiApiKey) || ''
      return key
    } catch { return '' }
  })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // Reload key when provider changes
  useEffect(() => {
    try {
      const key = apiProvider === 'deepseek'
        ? localStorage.getItem(STORAGE_KEYS.deepseekApiKey) || ''
        : localStorage.getItem(STORAGE_KEYS.openaiApiKey) || ''
      setApiKey(key)
    } catch { /* */ }
  }, [apiProvider])

  // ── Handlers ─────────────────────────────────────
  const handleProviderChange = (providerId) => {
    setApiProvider(providerId)
    try { localStorage.setItem(STORAGE_KEYS.apiProvider, providerId) }
    catch { /* */ }
    setSaved(false)
  }

  const handleModelChange = (model) => {
    setModelPreference(model)
    try { localStorage.setItem(STORAGE_KEYS.modelPreference, model) }
    catch { /* */ }
    flashSaved()
  }

  const handleSaveKey = () => {
    try {
      const storageKey = apiProvider === 'deepseek'
        ? STORAGE_KEYS.deepseekApiKey
        : STORAGE_KEYS.openaiApiKey
      localStorage.setItem(storageKey, apiKey.trim())
      flashSaved()
    } catch { /* */ }
  }

  const handleClearKey = () => {
    try {
      const storageKey = apiProvider === 'deepseek'
        ? STORAGE_KEYS.deepseekApiKey
        : STORAGE_KEYS.openaiApiKey
      localStorage.removeItem(storageKey)
      setApiKey('')
      flashSaved()
    } catch { /* */ }
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Plan badge ───────────────────────────────────
  const planBadge = () => {
    if (isTeacher) return { label: '教师版', className: 'pro' }
    if (isPro) return { label: '专业版', className: 'pro' }
    return { label: '免费版', className: 'free' }
  }

  const badge = planBadge()
  const currentProvider = PROVIDERS.find(p => p.id === apiProvider)

  return (
    <div className="settings-page">
      <div className="app-container">
      {/* ── Header ── */}
      <div className="settings-header">
        <Link to="/" className="settings-back">← 返回首页</Link>
        <h1 className="settings-title">设置</h1>
      </div>

      <div className="settings-content">
        {/* ── Account Card ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">账号</h2>
          <div className="settings-card-body">
            <div className="settings-row">
              <span className="settings-label">当前方案</span>
              <span className={`settings-plan-badge ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            {plan && (
              <div className="settings-row">
                <span className="settings-label">方案名称</span>
                <span className="settings-value">{plan}</span>
              </div>
            )}
            {dailyLimit != null && (
              <div className="settings-row">
                <span className="settings-label">今日用量</span>
                <span className="settings-value">
                  {dailyUsage || 0} / {dailyLimit} 次
                </span>
              </div>
            )}
            {user ? (
              <>
                <div className="settings-row">
                  <span className="settings-label">邮箱</span>
                  <span className="settings-value">{user.email}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Supabase</span>
                  <span className="settings-value settings-status-ok">已连接</span>
                </div>
              </>
            ) : (
              <div className="settings-row">
                <span className="settings-label">登录状态</span>
                <span className="settings-value settings-status-off">
                  {connected ? '未登录' : '离线模式'}
                </span>
              </div>
            )}

            {/* Subscription action */}
            <div className="settings-row settings-row-action">
              {isPro || isTeacher ? (
                <button
                  className="settings-btn settings-btn-secondary"
                  onClick={() => manageSubscription()}
                >
                  管理订阅
                </button>
              ) : (
                <button
                  className="settings-btn settings-btn-primary"
                  onClick={() => {
                    if (!user) {
                      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
                      return
                    }
                    initiateUpgrade('pro', 'monthly')
                  }}
                >
                  升级专业版
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── API Provider Card ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">AI 接口</h2>
          <div className="settings-card-body">
            {/* Provider selector */}
            <div className="settings-row">
              <span className="settings-label">提供商</span>
              <div className="settings-toggle-group">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    className={`settings-toggle-btn ${apiProvider === p.id ? 'active' : ''}`}
                    onClick={() => handleProviderChange(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Model selector */}
            <div className="settings-row">
              <span className="settings-label">默认模型</span>
              <div className="settings-toggle-group">
                {currentProvider?.models.map(m => (
                  <button
                    key={m}
                    className={`settings-toggle-btn ${modelPreference === m ? 'active' : ''}`}
                    onClick={() => handleModelChange(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div className="settings-row settings-row-col">
              <span className="settings-label">API Key</span>
              <div className="settings-key-wrap">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="settings-key-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`输入 ${currentProvider?.name || ''} API Key`}
                  spellCheck={false}
                />
                <button
                  className="settings-key-toggle"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? '隐藏' : '显示'}
                >
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
              <div className="settings-key-actions">
                <button className="settings-btn settings-btn-primary" onClick={handleSaveKey}>
                  保存
                </button>
                {apiKey && (
                  <button className="settings-btn settings-btn-ghost" onClick={handleClearKey}>
                    清除
                  </button>
                )}
                {saved && <span className="settings-saved-hint">✓ 已保存</span>}
              </div>
            </div>

            <p className="settings-hint">
              API Key 仅保存在浏览器本地，不会上传到服务器。
            </p>
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">外观</h2>
          <div className="settings-card-body">
            <div className="settings-row">
              <div>
                <span className="settings-label">主题模式</span>
                <p className="settings-desc">切换深色/浅色主题，跟随系统或手动设置</p>
              </div>
              <div className="settings-toggle-group">
                <button
                  className={`settings-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  ☀️ 浅色
                </button>
                <button
                  className={`settings-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  🌙 深色
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="settings-card settings-card-danger">
          <h2 className="settings-card-title">数据管理</h2>
          <div className="settings-card-body">
            <div className="settings-row">
              <div>
                <span className="settings-label">清除本地数据</span>
                <p className="settings-desc">删除所有保存在浏览器的学习记录和设置</p>
              </div>
              <button
                className="settings-btn settings-btn-danger"
                onClick={() => {
                  if (window.confirm('确定要清除所有本地数据吗？此操作不可撤销。')) {
                    try {
                      localStorage.removeItem('mathviz_history')
                      localStorage.removeItem(STORAGE_KEYS.deepseekApiKey)
                      localStorage.removeItem(STORAGE_KEYS.openaiApiKey)
                      setApiKey('')
                      window.location.reload()
                    } catch (err) {
                      console.warn('SettingsPage: Failed to clear local data', err)
                      alert('清除失败，请手动清理浏览器数据。')
                    }
                  }
                }}
              >
                清除
              </button>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
