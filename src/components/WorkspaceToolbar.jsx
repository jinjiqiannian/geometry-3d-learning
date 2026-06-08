import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import './WorkspaceToolbar.css'

export default function WorkspaceToolbar({ title, onExportImage, onExportPpt, onShare, onReplay }) {
  const navigate = useNavigate()
  const { plan, isPro, isTeacher, checkCanExportPpt, checkCanExportImage, triggerPaywall } = useSubscription()

  const handleExportPpt = () => {
    if (!checkCanExportPpt()) return
    onExportPpt?.()
  }

  const handleExportImage = () => {
    if (!checkCanExportImage()) return
    onExportImage?.()
  }

  return (
    <header className="workspace-toolbar">
      <div className="wt-left">
        <button className="wt-back" onClick={() => navigate('/')} title="返回首页">
          ← 返回
        </button>
        <span className="wt-title">{title || 'MathViz Workspace'}</span>
      </div>

      <div className="wt-right">
        {onReplay && (
          <button className="wt-btn" onClick={onReplay} title="自动回放">
            🔄 回放
          </button>
        )}
        {onShare && (
          <button className="wt-btn" onClick={onShare} title="分享">
            📤 分享
          </button>
        )}
        <button className="wt-btn" onClick={handleExportImage} title={isPro ? '导出图片' : '导出图片 (Pro)'}>
          🖼 导出
        </button>
        <button
          className={`wt-btn ${isTeacher ? 'premium' : ''}`}
          onClick={handleExportPpt}
          title={isTeacher ? '导出PPT' : '导出PPT (教师版)'}
        >
          📊 PPT {!isTeacher && '⭐'}
        </button>
        {!isPro && (
          <button className="wt-upgrade-btn" onClick={() => triggerPaywall('解锁Pro全部功能')}>
            ⭐ Pro
          </button>
        )}
        {isPro && (
          <span className="wt-plan-badge">{plan === 'teacher' ? '💼 教师版' : '⭐ Pro'}</span>
        )}
      </div>
    </header>
  )
}
