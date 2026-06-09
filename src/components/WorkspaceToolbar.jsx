import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useSupabase } from '../contexts/SupabaseContext'
import './WorkspaceToolbar.css'

export default function WorkspaceToolbar({ title, onExportImage, onExportPpt }) {
  const navigate = useNavigate()
  const { plan, isPro, isTeacher, triggerPaywall } = useSubscription()
  const { user, signOut } = useSupabase()

  const handleExportPpt = () => {
    onExportPpt?.()
  }

  const handleExportImage = () => {
    onExportImage?.()
  }

  return (
    <header className="wt-bar">
      <div className="wt-left">
        <button className="wt-logo" onClick={() => navigate('/')}>
          MathViz
        </button>
        {title && (
          <span className="wt-title">{title}</span>
        )}
      </div>

      <div className="wt-right">
        <button className="wt-btn" onClick={handleExportImage}>
          导出图片
        </button>
        <button className="wt-btn wt-btn-primary" onClick={handleExportPpt}>
          导出 PPT
        </button>

        {user ? (
          <button className="wt-btn wt-btn-ghost" onClick={signOut}>
            {user.email?.split('@')[0]}
          </button>
        ) : (
          <button
            className="wt-btn wt-btn-ghost"
            onClick={() => document.dispatchEvent(new CustomEvent('mathviz:show-auth'))}
          >
            登录
          </button>
        )}
      </div>
    </header>
  )
}
