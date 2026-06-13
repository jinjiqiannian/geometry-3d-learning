// ═══════════════════════════════════════════════════════
//  ErrorBoundary — 友好的错误兜底 UI
//  捕获 React 渲染错误，显示 "解析失败" 而不是白屏
// ═══════════════════════════════════════════════════════

import { Component } from 'react'
import { Link } from 'react-router-dom'
import './ErrorBoundary.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了 fallback，使用自定义 fallback
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">!</div>
            <h2 className="error-boundary-title">解析失败</h2>
            <p className="error-boundary-desc">
              {this.state.error?.message || '页面渲染出现问题，请尝试刷新或返回首页。'}
            </p>
            <div className="error-boundary-actions">
              <button
                className="error-boundary-btn error-boundary-btn-primary"
                onClick={this.handleRetry}
              >
                重新生成
              </button>
              <Link
                to="/"
                className="error-boundary-btn error-boundary-btn-secondary"
                onClick={this.handleRetry}
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
