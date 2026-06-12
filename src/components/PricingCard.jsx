import { useSubscription } from '../contexts/SubscriptionContext'
import { useSupabase } from '../contexts/SupabaseContext'
import './PricingCard.css'

export default function PricingCard({ plan, yearly = false }) {
  const { plan: currentPlan, initiateUpgrade, dailyUsage, dailyLimit, remaining } = useSubscription()
  const { user } = useSupabase()

  const isCurrent = currentPlan === plan.id
  const isFree = plan.id === 'free'
  const price = yearly && plan.stripeYearlyId
    ? (plan.id === 'pro' ? 190 : plan.id === 'teacher' ? 290 : 0)
    : plan.price
  const period = isFree ? '' : (yearly ? '/年' : plan.period)
  const monthlyEquivalent = yearly && price > 0
    ? Math.round(price / 12)
    : null
  const monthlyPrice = plan.price || 0
  const yearlySavings = yearly && monthlyPrice > 0
    ? (monthlyPrice * 12) - price
    : 0

  const handleUpgrade = () => {
    if (plan.id === 'free') {
      window.location.href = '/#/workspace'
      return
    }
    if (!user) {
      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
      return
    }
    initiateUpgrade(plan.id, yearly ? 'yearly' : 'monthly')
  }

  const ctaLabel = () => {
    if (isCurrent) return '当前方案'
    if (isFree) return '免费开始'
    return plan.cta
  }

  const usagePercent = dailyLimit > 0 ? Math.round((dailyUsage / dailyLimit) * 100) : 0

  return (
    <div className={`pricing-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''} ${isFree ? 'free-tier' : ''}`}>
      {plan.popular && <div className="pricing-badge popular-badge">最受欢迎</div>}
      {isCurrent && <div className="pricing-badge current-badge">当前方案</div>}
      {!isFree && !isCurrent && (
        <div className="pricing-badge trial-badge">7 天免费试用</div>
      )}

      {/* Plan identity */}
      <div className="pricing-icon">{plan.icon}</div>
      <h3 className="pricing-name">{plan.name}</h3>
      {plan.subtitle && <span className="pricing-subtitle">{plan.subtitle}</span>}
      <p className="pricing-desc">{plan.description}</p>

      {/* Highlight message */}
      {plan.highlight && (
        <p className="pricing-highlight">{plan.highlight}</p>
      )}

      {/* Price */}
      <div className="pricing-price-wrap">
        <span className="pricing-currency">¥</span>
        <span className="pricing-amount">{price}</span>
        <span className="pricing-period">{period}</span>
      </div>

      {monthlyEquivalent && (
        <p className="pricing-monthly-equiv">
          相当于 ¥{monthlyEquivalent}/月
        </p>
      )}

      {yearlySavings > 0 && (
        <div className="pricing-savings">
          年付省 ¥{yearlySavings}
        </div>
      )}

      {/* Features */}
      <ul className="pricing-features">
        {plan.features.map((f, i) => {
          const text = typeof f === 'string' ? f : f.text
          const detail = typeof f === 'string' ? null : f.detail
          const star = typeof f === 'string' ? false : f.star
          return (
            <li key={i} className={`pricing-feature ${star ? 'star-feature' : ''}`}>
              <svg className="pricing-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div className="pricing-feature-text">
                <span className="pricing-feature-name">
                  {star && <span className="pricing-feature-star">★ </span>}
                  {text}
                </span>
                {detail && <span className="pricing-feature-detail">{detail}</span>}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Free tier usage bar */}
      {isFree && (
        <div className="pricing-usage">
          <div className="pricing-usage-header">
            <span className="pricing-usage-label">今日用量</span>
            <span className="pricing-usage-count">
              {dailyUsage}/{dailyLimit} 次
            </span>
          </div>
          <div className="pricing-usage-bar">
            <div
              className="pricing-usage-fill"
              style={{ width: `${Math.min(100, usagePercent)}%` }}
            />
          </div>
          {remaining <= 10 && remaining > 0 && (
            <p className="pricing-usage-warning">
              还剩 {remaining} 次，升级无限使用
            </p>
          )}
          {remaining === 0 && (
            <p className="pricing-usage-warning danger">
              今日已用完，升级继续使用
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <button
        className={`pricing-cta ${plan.popular ? 'primary' : ''} ${isCurrent ? 'current' : ''} ${isFree ? 'free-cta' : ''}`}
        onClick={handleUpgrade}
        disabled={isCurrent}
      >
        {ctaLabel()}
      </button>

      {!isFree && (
        <p className="pricing-guarantee">
          随时取消 · 7 天无理由退款
        </p>
      )}
    </div>
  )
}
