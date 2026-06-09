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

        <h2 className="paywall-title">Upgrade to Pro</h2>

        {paywallReason && (
          <p className="paywall-reason">{paywallReason}</p>
        )}

        <ul className="paywall-benefits">
          <li>Unlimited generations</li>
          <li>Cloud sync & history</li>
          <li>Priority access</li>
        </ul>

        <div className="paywall-actions">
          <button className="paywall-btn primary" onClick={handleUpgrade}>
            Upgrade — ¥19/month
          </button>
          <button className="paywall-btn secondary" onClick={() => setShowPaywall(false)}>
            Continue with free
          </button>
        </div>
      </div>
    </div>
  )
}
