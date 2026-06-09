import { useState } from 'react'
import { Link } from 'react-router-dom'
import PricingCard from '../components/PricingCard'
import AuthModal from '../components/AuthModal'
import { PRICING_PLANS } from '../constants'
import './PricingPage.css'

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="pricing-page">
      <div className="pp-header">
        <h1 className="pp-title">Simple pricing</h1>
        <p className="pp-subtitle">Start free. Upgrade when you need more.</p>
      </div>

      <div className="pp-toggle-wrap">
        <button className={`pp-toggle ${!yearly ? 'active' : ''}`} onClick={() => setYearly(false)}>
          Monthly
        </button>
        <button className={`pp-toggle ${yearly ? 'active' : ''}`} onClick={() => setYearly(true)}>
          Yearly <span className="pp-save">Save 17%</span>
        </button>
      </div>

      <div className="pp-grid">
        {PRICING_PLANS.map(plan => (
          <PricingCard key={plan.id} plan={plan} yearly={yearly} />
        ))}
      </div>

      <div className="pp-faq">
        <h2>FAQ</h2>
        <div className="pp-faq-item">
          <h3>What are the free tier limits?</h3>
          <p>50 generations per day with full 3D visualization and step-by-step solutions.</p>
        </div>
        <div className="pp-faq-item">
          <h3>What's the difference between Pro and Teacher?</h3>
          <p>Teacher includes classroom presentation mode, PPT export, batch processing, and screen-optimized dark mode.</p>
        </div>
        <div className="pp-faq-item">
          <h3>Can I cancel anytime?</h3>
          <p>Yes. Cancel through Stripe Customer Portal anytime. You retain access until the end of the billing period.</p>
        </div>
      </div>

      <AuthModal />
    </div>
  )
}
