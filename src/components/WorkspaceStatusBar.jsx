import { useSubscription } from '../contexts/SubscriptionContext'
import './WorkspaceStatusBar.css'

export default function WorkspaceStatusBar() {
  const { dailyUsage, dailyLimit, remaining } = useSubscription()

  return (
    <footer className="workspace-status-bar">
      <span className="wsb-usage">
        今日 {dailyUsage} / {dailyLimit} 次
        {remaining <= 2 && remaining > 0 && (
          <span className="wsb-warning"> · 剩余 {remaining} 次</span>
        )}
      </span>

      <span className="wsb-brand">几何维度</span>
    </footer>
  )
}
