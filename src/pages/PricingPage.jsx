import { useState } from 'react'
import { Link } from 'react-router-dom'
import PricingCard from '../components/PricingCard'
import { PRICING_PLANS } from '../constants'
import './PricingPage.css'

// Feature comparison for the comparison table
const FEATURE_ROWS = [
  { feature: 'AI 解析题目', free: true, pro: true, teacher: true },
  { feature: '3D 图形生成', free: true, pro: true, teacher: true },
  { feature: '分步讲解', free: true, pro: true, teacher: true },
  { feature: '历史记录', free: '本地 50 条', pro: '云端无限', teacher: '云端无限' },
  { feature: '题目分享', free: '链接分享', pro: '完整工作台分享', teacher: '完整工作台分享' },
  { feature: '基础模型切换', free: true, pro: true, teacher: true },
  { feature: '每日额度', free: '50 题', pro: '无限', teacher: '无限' },
  { feature: '自动讲课模式', free: false, pro: true, teacher: true },
  { feature: '自动生成讲稿', free: false, pro: true, teacher: true },
  { feature: 'PPT 课件导出', free: false, pro: true, teacher: true },
  { feature: 'PDF 讲义导出', free: false, pro: true, teacher: true },
  { feature: '高清图片导出', free: false, pro: true, teacher: true },
  { feature: '错题本', free: false, pro: true, teacher: true },
  { feature: '学习分析', free: false, pro: true, teacher: true },
  { feature: '班级管理', free: false, pro: false, teacher: true },
  { feature: '批量生成课件', free: false, pro: false, teacher: true },
  { feature: '学生统计', free: false, pro: false, teacher: true },
  { feature: '作业布置', free: false, pro: false, teacher: true },
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
      <div className="app-container">
      {/* Hero */}
      <section className="pp-hero">
        <Link to="/" className="pp-back-link">← 返回首页</Link>
        <div className="pp-hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          5000+ 学生和教师在使用
        </div>
        <h1 className="pp-hero-title">免费学习 · 支持开发者</h1>
        <p className="pp-hero-subtitle">
          几何维度是一个AI立体几何学习工作台。<br />
          核心功能<strong>永久免费</strong>，Pro会员是对产品持续开发的支持。
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

      {/* Pricing Cards */}
      <div className="pp-grid">
        {PRICING_PLANS.map(plan => (
          <PricingCard key={plan.id} plan={plan} yearly={yearly} />
        ))}
      </div>

      {/* Philosophy */}
      <section className="pp-philosophy">
        <div className="pp-philosophy-card">
          <h3>我们的产品原则</h3>
          <div className="pp-philosophy-grid">
            <div className="pp-philosophy-item">
              <span className="pp-philosophy-num">1</span>
              <div>
                <strong>学生优先</strong>
                <p>第一次进入网站必须能完整解决问题。不截断讲解，不隐藏图形，不强制付费看答案。</p>
              </div>
            </div>
            <div className="pp-philosophy-item">
              <span className="pp-philosophy-num">2</span>
              <div>
                <strong>不是卖答案</strong>
                <p>Pro会员是对产品持续开发的支持。解锁高级学习工具，而非购买解题结果。</p>
              </div>
            </div>
            <div className="pp-philosophy-item">
              <span className="pp-philosophy-num">3</span>
              <div>
                <strong>长期主义</strong>
                <p>用户增长 &gt; 用户留存 &gt; 付费转化。先积累口碑，让产品自然生长。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="pp-compare">
        <h2 className="pp-compare-title">功能对比</h2>
        <div className="pp-compare-table">
          <div className="pp-compare-header">
            <div className="pp-compare-cell pp-compare-feature-col" />
            <div className="pp-compare-cell pp-compare-plan-col">免费版</div>
            <div className="pp-compare-cell pp-compare-plan-col popular-col">Pro 会员</div>
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

      {/* FAQ */}
      <section className="pp-faq">
        <h2 className="pp-faq-title">常见问题</h2>
        <div className="pp-faq-grid">
          <div className="pp-faq-item">
            <h3>免费版够用吗？</h3>
            <p>对于大多数学生，每天 50 题额度完全够用。免费版包含完整 3D 可视化和 AI 分步讲解，学习体验不打折。</p>
          </div>
          <div className="pp-faq-item">
            <h3>Pro 会员是「买答案」吗？</h3>
            <p>不是。Pro 会员是对产品持续开发的支持。解锁的是无限额度、错题本、学习分析等高级学习工具，而非购买解题结果。核心讲题功能永久免费。</p>
          </div>
          <div className="pp-faq-item">
            <h3>Pro 和教师版有什么区别？</h3>
            <p>教师版在 Pro 全部功能基础上，增加班级管理、批量课件生成、学生学习统计和作业布置功能，适合课堂教学场景。</p>
          </div>
          <div className="pp-faq-item">
            <h3>可以随时取消吗？</h3>
            <p>可以。通过 Stripe 客户门户随时取消，订阅有效期到当前周期结束。支持 7 天无理由退款。</p>
          </div>
          <div className="pp-faq-item">
            <h3>有学生折扣吗？</h3>
            <p>有。在校学生凭 .edu 邮箱注册可享 Pro 会员 5 折优惠。联系 support@jiheweidu.cn 申请。</p>
          </div>
          <div className="pp-faq-item">
            <h3>学校批量采购？</h3>
            <p>学校或教育机构批量采购 20 个以上教师版账号可享 7 折优惠。请联系我们获取报价。</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pp-bottom-cta">
        <h2>不用选择，从免费版开始</h2>
        <p>无需注册，即刻体验 3D 几何可视化</p>
        <Link to="/workspace" className="pp-bottom-btn">
          开始学习
        </Link>
      </section>
      </div>
    </div>
  )
}
