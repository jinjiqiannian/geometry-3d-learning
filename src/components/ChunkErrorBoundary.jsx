// ═══════════════════════════════════════════════════════
//  ChunkErrorBoundary — 懒加载 chunk 失败兜底
//  捕获 dynamic import() 的网络错误，自动重试 + 手动刷新
// ═══════════════════════════════════════════════════════

import { Component } from 'react'
import './ErrorBoundary.css'

const MAX_AUTO_RETRIES = 2

/**
 * 判断是否为 chunk 加载失败（动态 import 网络错误）
 */
function isChunkError(error) {
  if (!error) return false
  const msg = error.message || String(error)
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported module')
  )
}

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
    this._retryTimer = null
  }

  static getDerivedStateFromError(error) {
    // Handle ALL errors — never re-throw. React 19 error propagation
    // from getDerivedStateFromError is unreliable across Suspense boundaries.
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.warn('ChunkErrorBoundary: chunk load failure —', error.message)
  }

  componentDidUpdate(prevProps, prevState) {
    // Auto-retry when a new error appears and we're under the limit
    if (this.state.hasError && !prevState.hasError) {
      const nextCount = this.state.retryCount + 1
      if (nextCount <= MAX_AUTO_RETRIES) {
        this._retryTimer = setTimeout(() => {
          this.setState({ hasError: false, error: null, retryCount: nextCount })
        }, 1000 * nextCount)
      }
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) clearTimeout(this._retryTimer)
  }

  handleRetry = () => {
    if (this._retryTimer) clearTimeout(this._retryTimer)
    this.setState({ hasError: false, error: null, retryCount: 0 })
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const chunkErr = isChunkError(this.state.error)
      const isRetrying = chunkErr && this.state.retryCount < MAX_AUTO_RETRIES

      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            {isRetrying ? (
              <>
                <div style={{
                  width: 28, height: 28,
                  border: '3px solid var(--border-subtle, #e0e0e8)',
                  borderTopColor: 'var(--accent, #6366f1)',
                  borderRadius: '50%',
                  animation: 'boot-spin 0.8s linear infinite',
                  marginBottom: 12,
                }} />
                <p className="error-boundary-desc" style={{ marginBottom: 0 }}>
                  资源加载失败，正在自动重试…
                </p>
              </>
            ) : (
              <>
                <div className="error-boundary-icon">!</div>
                <h2 className="error-boundary-title">
                  {chunkErr ? '页面加载失败' : '页面渲染异常'}
                </h2>
                <p className="error-boundary-desc">
                  {chunkErr
                    ? '模块资源加载失败，可能是网络波动或 CDN 缓存更新中。'
                    : (this.state.error?.message || '页面渲染时出现错误，请尝试刷新。')
                  }
                </p>
                <div className="error-boundary-actions">
                  <button
                    className="error-boundary-btn error-boundary-btn-primary"
                    onClick={this.handleRefresh}
                  >
                    刷新页面
                  </button>
                  {chunkErr && (
                    <button
                      className="error-boundary-btn error-boundary-btn-secondary"
                      onClick={this.handleRetry}
                    >
                      重试加载
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
