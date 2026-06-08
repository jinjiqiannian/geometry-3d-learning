import { useSubscription } from '../contexts/SubscriptionContext'
import './WorkspaceStatusBar.css'

export default function WorkspaceStatusBar() {
  const { plan, dailyUsage, dailyLimit, remaining, isPro, triggerPaywall } = useSubscription()

  const planLabel = plan === 'teacher' ? '💼 教师版' : plan === 'pro' ? '⭐ Pro' : '🎓 免费版'

  return (
    <footer className="workspace-status-bar">
      <div className="wsb-left">
        <span className="wsb-plan">{planLabel}</span>
        {!isPro && (
          <span className="wsb-usage">
            今日 {dailyUsage}/{dailyLimit} 次
            {remaining <= 1 && <span className="wsb-warning"> · 即将用完</span>}
          </span>
        )}
      </div>

      {!isPro && (
        <button className="wsb-upgrade" onClick={() => triggerPaywall('升级Pro无限使用')}>
          升级 Pro 无限使用 →
        </button>
      )}
    </footer>
  )
}
