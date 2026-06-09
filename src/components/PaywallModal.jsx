import { useSubscription } from '../contexts/SubscriptionContext'
import { useSupabase } from '../contexts/SupabaseContext'
import './PaywallModal.css'

export default function PaywallModal() {
  const { showPaywall, setShowPaywall, paywallReason, initiateUpgrade } = useSubscription()
  const { user } = useSupabase()

  if (!showPaywall) return null

  const handleUpgrade = () => {
    setShowPaywall(false)
    if (!user) {
      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
      return
    }
    initiateUpgrade('pro', 'monthly')
  }

  return (
    <div className="paywall-overlay" onClick={() => setShowPaywall(false)}>
      <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={() => setShowPaywall(false)}>×</button>

        <h2 className="paywall-title">升级专业版</h2>

        {paywallReason && (
          <p className="paywall-reason">{paywallReason}</p>
        )}

        <ul className="paywall-benefits">
          <li>无限次生成</li>
          <li>云端同步与历史</li>
          <li>优先 AI 访问</li>
        </ul>

        <div className="paywall-actions">
          <button className="paywall-btn primary" onClick={handleUpgrade}>
            升级 — ¥19/月
          </button>
          <button className="paywall-btn secondary" onClick={() => setShowPaywall(false)}>
            继续免费使用
          </button>
        </div>
      </div>
    </div>
  )
}
