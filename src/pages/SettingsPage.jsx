// ═══════════════════════════════════════════════════════
//  SettingsPage — 账号 · 主题 · 数据
// ═══════════════════════════════════════════════════════
import { Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useTheme } from '../contexts/ThemeContext'
import './SettingsPage.css'

export default function SettingsPage() {
  const { user, connected } = useSupabase()
  const { theme, setTheme } = useTheme()

  return (
    <div className="settings-page">
      <div className="app-container">
      {/* ── Header ── */}
      <div className="settings-header">
        <Link to="/workspace" className="settings-back">← 返回工作台</Link>
        <h1 className="settings-title">设置</h1>
      </div>

      <div className="settings-content">
        {/* ── Account Card ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">账号</h2>
          <div className="settings-card-body">
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
          </div>
        </section>

        {/* ── AI 状态 ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">AI 解析</h2>
          <div className="settings-card-body">
            <div className="settings-row">
              <div>
                <span className="settings-label">解析引擎</span>
                <p className="settings-desc">题目由平台云端 AI 引擎处理，无需自行配置 API Key</p>
              </div>
              <span className="settings-status settings-status-ok">云端引擎</span>
            </div>
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
              <div className="settings-toggle-wrapper">
                <span className="settings-toggle-label">浅色</span>
                <button
                  className={`settings-toggle ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                >
                  <span className="settings-toggle-thumb"></span>
                </button>
                <span className="settings-toggle-label">深色</span>
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
                      localStorage.removeItem('jidong_history')
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
