import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import './WorkspaceToolbar.css'

export default function WorkspaceToolbar({ title, onExportImage, onExportPpt }) {
  const navigate = useNavigate()
  const { plan, isPro, isTeacher, triggerPaywall } = useSubscription()
  const { user, signOut } = useSupabase()
  const { saveWorkspace, workspace } = useWorkspace()

  const [saveState, setSaveState] = useState('idle') // idle | saving | saved

  const handleSave = useCallback(async () => {
    if (!workspace.problemText) return
    setSaveState('saving')
    try {
      await saveWorkspace()
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('idle')
    }
  }, [saveWorkspace, workspace.problemText])

  const handleShare = useCallback(async () => {
    if (!isPro && !isTeacher) {
      triggerPaywall?.('share')
      return
    }
    try {
      const { workspaceAPI } = await import('../services/api')
      const result = await workspaceAPI.publish(workspace.id)
      if (result.data?.shareUrl) {
        await navigator.clipboard.writeText(result.data.shareUrl)
        // Simple toast feedback
        const toast = document.createElement('div')
        toast.className = 'wt-toast'
        toast.textContent = '分享链接已复制'
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 2000)
      }
    } catch {
      // Silently fail — share is optional
    }
  }, [isPro, isTeacher, triggerPaywall, workspace.id])

  const handleExportPpt = () => {
    if (!isTeacher) {
      triggerPaywall?.('ppt')
      return
    }
    onExportPpt?.()
  }

  const handleExportImage = () => {
    if (!isPro && !isTeacher) {
      triggerPaywall?.('image')
      return
    }
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
        {/* Save */}
        <button
          className={`wt-btn ${saveState === 'saved' ? 'wt-btn-saved' : ''}`}
          onClick={handleSave}
          disabled={saveState === 'saving' || !workspace.problemText}
        >
          {saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已保存' : '保存'}
        </button>

        {/* Share */}
        <button className="wt-btn" onClick={handleShare} disabled={!workspace.id}>
          分享
        </button>

        {/* Export Image */}
        <button className="wt-btn" onClick={handleExportImage}>
          导出图片
        </button>

        {/* Export PPT */}
        <button className="wt-btn wt-btn-primary" onClick={handleExportPpt}>
          导出 PPT
        </button>

        {/* User */}
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
