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
        <Link to="/" className="pp-back">← 返回首页</Link>
        <h1 className="pp-title">选择适合你的方案</h1>
        <p className="pp-subtitle">从免费开始，随时升级解锁更多功能</p>
      </div>

      <div className="pp-toggle-wrap">
        <button className={`pp-toggle ${!yearly ? 'active' : ''}`} onClick={() => setYearly(false)}>月付</button>
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
          <h3>免费版有什么限制？</h3>
          <p>免费版每日可生成 3 次 3D 可视化，查看前 2 步解题讲解。适合体验产品核心功能。</p>
        </div>
        <div className="pp-faq-item">
          <h3>Pro 和教师版有什么区别？</h3>
          <p>教师版在 Pro 全部功能基础上增加：PPT 一键导出、课堂演示模式、批量题目生成、投屏优化。专为课堂教学场景设计。</p>
        </div>
        <div className="pp-faq-item">
          <h3>可以随时取消吗？</h3>
          <p>可以。随时在 Stripe Customer Portal 取消订阅，取消后当前周期结束前仍可使用 Pro/教师版功能。</p>
        </div>
      </div>

      <AuthModal />
    </div>
  )
}
