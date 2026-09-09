import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── 品牌升级迁移：mathviz_* → jidong_*（旧用户本地数据不丢）──
const LS_KEYS = ['token', 'refresh_token', 'guest_id', 'tier', 'daily_usage', 'usage_date', 'history', 'workspaces', 'theme']
const SS_KEYS = ['replay_steps', 'replay_parsed']
const LS_COLON_KEYS = ['first_visit', 'feedback']

function migrateLegacyKeys() {
  const move = (key, newKey, store) => {
    try {
      const value = store.getItem(key)
      if (value !== null) {
        store.setItem(newKey, value)
        store.removeItem(key)
      }
    } catch { /* ignore */ }
  }
  LS_KEYS.forEach((k) => move(`mathviz_${k}`, `jidong_${k}`, localStorage))
  SS_KEYS.forEach((k) => move(`mathviz_${k}`, `jidong_${k}`, sessionStorage))
  LS_COLON_KEYS.forEach((k) => move(`mathviz:${k}`, `jidong:${k}`, localStorage))
}
migrateLegacyKeys()

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// Signal to boot watchdog in index.html that React mounted successfully
window.__MATHVIZ_MOUNTED__ = true
