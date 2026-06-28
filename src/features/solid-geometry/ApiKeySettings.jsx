import { useState } from 'react'
import { validateApiKey } from '../../engines/problemParser'

export default function ApiKeySettings({ apiKey, onApiKeyChange }) {
  const [open, setOpen] = useState(false)
  const [inputKey, setInputKey] = useState(apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // { ok, message }

  const hasKey = apiKey && apiKey.length > 10

  // ── 保存 ──
  const handleSave = () => {
    const trimmed = inputKey.trim()
    if (trimmed) {
      onApiKeyChange(trimmed)
      setTestResult(null)
      setOpen(false)
    }
  }

  // ── 清除 ──
  const handleClear = () => {
    setInputKey('')
    onApiKeyChange('')
    setTestResult(null)
  }

  // ── 测试连接 ──
  const handleTest = async () => {
    const trimmed = inputKey.trim()
    if (!trimmed) return

    setTesting(true)
    setTestResult(null)
    try {
      const { valid, error } = await validateApiKey(trimmed)
      if (valid) {
        setTestResult({ ok: true, message: '连接成功！API Key 有效' })
      } else {
        setTestResult({ ok: false, message: error || '连接失败' })
      }
    } catch (e) {
      setTestResult({ ok: false, message: '网络错误，请检查网络连接' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      {/* 触发按钮 */}
      <button
        className={`apikey-trigger ${hasKey ? 'configured' : 'unconfigured'}`}
        onClick={() => { setOpen(true); setInputKey(apiKey || ''); setTestResult(null) }}
        title={hasKey ? 'API Key 已配置' : 'API Key 未配置'}
      >
        {hasKey ? '🔑 已配置' : '🔑 设置 API Key'}
      </button>

      {/* 弹窗 */}
      {open && (
        <div className="apikey-overlay" onClick={() => setOpen(false)}>
          <div className="apikey-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚙️ API Key 设置</h3>
            <p className="apikey-desc">
              输入你的 Anthropic API Key，用于 AI 解析几何题目。
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
                获取 Key →
              </a>
            </p>

            <div className="apikey-input-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="apikey-input"
                value={inputKey}
                onChange={(e) => { setInputKey(e.target.value); setTestResult(null) }}
                placeholder="sk-ant-api03-..."
                spellCheck={false}
                autoComplete="off"
              />
              <button
                className="apikey-toggle"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? '隐藏' : '显示'}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>

            {/* 测试结果 */}
            {testResult && (
              <div className={`apikey-test-result ${testResult.ok ? 'success' : 'error'}`}>
                {testResult.ok ? '✅ ' : '❌ '}{testResult.message}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="apikey-actions">
              <button className="apikey-action-btn test" onClick={handleTest} disabled={testing || !inputKey.trim()}>
                {testing ? '测试中...' : '🔍 测试连接'}
              </button>
              <div className="apikey-actions-right">
                {apiKey && (
                  <button className="apikey-action-btn danger" onClick={handleClear}>
                    清除
                  </button>
                )}
                <button className="apikey-action-btn cancel" onClick={() => setOpen(false)}>
                  取消
                </button>
                <button className="apikey-action-btn save" onClick={handleSave} disabled={!inputKey.trim()}>
                  保存
                </button>
              </div>
            </div>

            <p className="apikey-note">
              💡 Key 仅存储在浏览器本地，不会上传到任何服务器。
            </p>
          </div>
        </div>
      )}
    </>
  )
}
