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
        <h1 className="pp-title">简洁定价</h1>
        <p className="pp-subtitle">免费开始，按需升级</p>
      </div>

      <div className="pp-toggle-wrap">
        <button className={`pp-toggle ${!yearly ? 'active' : ''}`} onClick={() => setYearly(false)}>
          月付
        </button>
        <button className={`pp-toggle ${yearly ? 'active' : ''}`} onClick={() => setYearly(true)}>
          年付 <span className="pp-save">省 17%</span>
        </button>
      </div>

      <div className="pp-grid">
        {PRICING_PLANS.map(plan => (
          <PricingCard key={plan.id} plan={plan} yearly={yearly} />
        ))}
      </div>

      <div className="pp-faq">
        <h2>常见问题</h2>
        <div className="pp-faq-item">
          <h3>免费版有哪些限制？</h3>
          <p>每天 50 次生成，包含完整 3D 可视化和分步解题讲解。</p>
        </div>
        <div className="pp-faq-item">
          <h3>专业版和教师版有什么区别？</h3>
          <p>教师版包含课堂演示模式、一键导出 PPT、批量生成题目和投影优化的展示效果。</p>
        </div>
        <div className="pp-faq-item">
          <h3>可以随时取消订阅吗？</h3>
          <p>可以。通过 Stripe 客户门户随时取消，订阅有效期到当前周期结束。</p>
        </div>
      </div>

      <AuthModal />
    </div>
  )
}
