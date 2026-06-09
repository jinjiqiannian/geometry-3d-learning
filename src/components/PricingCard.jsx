import { useSubscription } from '../contexts/SubscriptionContext'
import { useSupabase } from '../contexts/SupabaseContext'
import './PricingCard.css'

export default function PricingCard({ plan, yearly = false }) {
  const { plan: currentPlan, initiateUpgrade } = useSubscription()
  const { user } = useSupabase()

  const isCurrent = currentPlan === plan.id
  const price = yearly && plan.stripeYearlyId
    ? (plan.id === 'pro' ? 190 : plan.id === 'teacher' ? 390 : 0)
    : plan.price
  const period = yearly ? '/年' : plan.period

  const handleUpgrade = () => {
    if (plan.id === 'free') return
    if (!user) {
      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
      return
    }
    initiateUpgrade(plan.id, yearly ? 'yearly' : 'monthly')
  }

  return (
    <div className={`pricing-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}>
      {plan.popular && <div className="pricing-badge">最受欢迎</div>}
      {isCurrent && <div className="pricing-badge current">当前方案</div>}

      <h3 className="pricing-name">{plan.name}</h3>
      <p className="pricing-desc">{plan.description}</p>

      <div className="pricing-price-wrap">
        <span className="pricing-currency">¥</span>
        <span className="pricing-amount">{price}</span>
        <span className="pricing-period">{period}</span>
      </div>

      <ul className="pricing-features">
        {plan.features.map((f, i) => (
          <li key={i} className="pricing-feature">
            {f}
          </li>
        ))}
      </ul>

      <button
        className={`pricing-cta ${plan.popular ? 'primary' : ''} ${isCurrent ? 'current' : ''}`}
        onClick={handleUpgrade}
        disabled={isCurrent}
      >
        {isCurrent ? '当前方案' : plan.cta}
      </button>
    </div>
  )
}
