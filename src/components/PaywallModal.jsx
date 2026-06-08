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
        <button className="paywall-close" onClick={() => setShowPaywall(false)}>✕</button>

        <div className="paywall-icon">🔒</div>
        <h2 className="paywall-title">升级 Pro 解锁完整功能</h2>

        {paywallReason && (
          <p className="paywall-reason">{paywallReason}</p>
        )}

        <ul className="paywall-benefits">
          <li>✓ 无限次生成</li>
          <li>✓ 完整AI分步讲解</li>
          <li>✓ 高清图片导出</li>
          <li>✓ 历史记录保存</li>
        </ul>

        <div className="paywall-actions">
          <button className="paywall-btn primary" onClick={handleUpgrade}>
            ¥19/月 立即升级
          </button>
          <button className="paywall-btn secondary" onClick={() => setShowPaywall(false)}>
            继续使用免费版
          </button>
        </div>
      </div>
    </div>
  )
}
