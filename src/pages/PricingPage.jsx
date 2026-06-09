import { useState } from 'react'
import { Link } from 'react-router-dom'
import PricingCard from '../components/PricingCard'
import { PRICING_PLANS } from '../constants'
import './PricingPage.css'

// Feature comparison data
const FEATURE_ROWS = [
  { feature: '3D 可视化', free: true, pro: true, teacher: true },
  { feature: 'AI 分步讲解', free: true, pro: true, teacher: true },
  { feature: '每日使用次数', free: '50 次', pro: '无限', teacher: '无限' },
  { feature: '深度 AI 推理', free: false, pro: true, teacher: true },
  { feature: '3D 场景逐步骤展示', free: false, pro: true, teacher: true },
  { feature: '高清图片导出', free: false, pro: true, teacher: true },
  { feature: '云端同步历史', free: false, pro: true, teacher: true },
  { feature: 'PPT 课件导出', free: false, pro: false, teacher: true },
  { feature: '课堂演示模式', free: false, pro: false, teacher: true },
  { feature: '批量生成题目', free: false, pro: false, teacher: true },
  { feature: '自动生成讲稿', free: false, pro: false, teacher: true },
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ft-check">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function DashIcon() {
  return <span className="ft-dash">—</span>
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="pricing-page">
      {/* ── Hero ── */}
      <section className="pp-hero">
        <Link to="/" className="pp-back-link">← 返回首页</Link>
        <div className="pp-hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          5000+ 学生和教师在使用
        </div>
        <h1 className="pp-hero-title">选择适合你的方案</h1>
        <p className="pp-hero-subtitle">
          从免费开始，随时升级解锁更多功能
        </p>

        {/* Toggle */}
        <div className="pp-toggle-wrap">
          <button className={`pp-toggle ${!yearly ? 'active' : ''}`} onClick={() => setYearly(false)}>
            月付
          </button>
          <button className={`pp-toggle ${yearly ? 'active' : ''}`} onClick={() => setYearly(true)}>
            年付 <span className="pp-save">省 17%</span>
          </button>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <div className="pp-grid">
        {PRICING_PLANS.map(plan => (
          <PricingCard key={plan.id} plan={plan} yearly={yearly} />
        ))}
      </div>

      {/* ── Feature Comparison Table ── */}
      <section className="pp-compare">
        <h2 className="pp-compare-title">功能对比</h2>
        <div className="pp-compare-table">
          <div className="pp-compare-header">
            <div className="pp-compare-cell pp-compare-feature-col" />
            <div className="pp-compare-cell pp-compare-plan-col">免费版</div>
            <div className="pp-compare-cell pp-compare-plan-col popular-col">专业版</div>
            <div className="pp-compare-cell pp-compare-plan-col">教师版</div>
          </div>
          {FEATURE_ROWS.map((row, i) => (
            <div key={i} className="pp-compare-row">
              <div className="pp-compare-cell pp-compare-feature-col">{row.feature}</div>
              <div className="pp-compare-cell pp-compare-plan-col">
                {row.free === true ? <CheckIcon /> : row.free === false ? <DashIcon /> : <span className="ft-text">{row.free}</span>}
              </div>
              <div className="pp-compare-cell pp-compare-plan-col popular-col">
                {row.pro === true ? <CheckIcon /> : row.pro === false ? <DashIcon /> : <span className="ft-text">{row.pro}</span>}
              </div>
              <div className="pp-compare-cell pp-compare-plan-col">
                {row.teacher === true ? <CheckIcon /> : row.teacher === false ? <DashIcon /> : <span className="ft-text">{row.teacher}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pp-faq">
        <h2 className="pp-faq-title">常见问题</h2>
        <div className="pp-faq-grid">
          <div className="pp-faq-item">
            <h3>免费版有哪些限制？</h3>
            <p>每天 50 次生成，包含完整 3D 可视化和基础分步解题讲解。深度 AI 推理、云端同步、导出功能需升级专业版。</p>
          </div>
          <div className="pp-faq-item">
            <h3>专业版和教师版有什么区别？</h3>
            <p>教师版在专业版基础上，额外提供 PPT 课件一键导出、课堂演示模式、批量生成题目和自动生成讲稿，适合课堂教学场景。</p>
          </div>
          <div className="pp-faq-item">
            <h3>可以随时取消订阅吗？</h3>
            <p>可以。通过 Stripe 客户门户随时取消，订阅有效期到当前周期结束。支持 7 天无理由退款。</p>
          </div>
          <div className="pp-faq-item">
            <h3>支持学生折扣吗？</h3>
            <p>支持。在校学生凭 .edu 邮箱注册可享专业版 5 折优惠。请联系 support@jiheweidu.cn 申请。</p>
          </div>
          <div className="pp-faq-item">
            <h3>学校批量采购有优惠吗？</h3>
            <p>有。学校或教育机构批量采购 20 个以上教师版账号，可享 7 折优惠。请联系我们获取报价。</p>
          </div>
          <div className="pp-faq-item">
            <h3>支付安全吗？</h3>
            <p>支付通过 Stripe 处理，我们不会存储你的信用卡信息。Stripe 已通过 PCI DSS Level 1 认证。</p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="pp-bottom-cta">
        <h2>还犹豫？从免费版开始体验</h2>
        <p>无需注册，即刻体验 3D 几何可视化</p>
        <Link to="/workspace" className="pp-bottom-btn">
          开始使用
        </Link>
      </section>

    </div>
  )
}
