import { useState } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import HeroInput from '../components/HeroInput'
import ExampleCards from '../components/ExampleCards'
import PricingCard from '../components/PricingCard'
import AuthModal from '../components/AuthModal'
import { PRICING_PLANS } from '../constants'
import './LandingPage.css'

export default function LandingPage() {
  const { user, signOut } = useSupabase()
  const [yearly, setYearly] = useState(false)

  const handleShowAuth = () => {
    document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
  }

  return (
    <div className="landing-page">
      {/* Top auth bar */}
      <div className="lp-auth-bar">
        <span className="lp-logo">📐 MathViz</span>
        <div className="lp-auth-actions">
          {user ? (
            <>
              <span className="lp-user-email">{user.email}</span>
              <button className="lp-auth-btn" onClick={signOut}>退出</button>
            </>
          ) : (
            <button className="lp-auth-btn primary" onClick={handleShowAuth}>登录</button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <h1 className="lp-hero-title">
            <span className="lp-hero-icon">📐</span>
            MathViz
          </h1>
          <p className="lp-hero-subtitle">
            AI 驱动的数学可视化与讲解生成系统
          </p>
          <p className="lp-hero-desc">
            输入任意数学题，立即生成交互式 3D 模型 + 分步解题讲解
          </p>
        </div>

        <div className="lp-hero-input-area">
          <HeroInput />
        </div>

        <div className="lp-hero-shapes">
          <div className="lp-shape s1" />
          <div className="lp-shape s2" />
          <div className="lp-shape s3" />
        </div>
      </section>

      {/* Examples Section */}
      <ExampleCards />

      {/* Teacher CTA */}
      <section className="lp-teacher-cta">
        <div className="lp-teacher-content">
          <h2>💼 数学教师专属</h2>
          <p>备课时间从 <strong>1小时 → 5分钟</strong></p>
          <p className="lp-teacher-desc">
            输入题目 → 自动生成课堂演示动画<br />
            支持导出 PPT · 投屏讲解 · 课程保存
          </p>
          <button className="lp-teacher-btn" onClick={handleShowAuth}>
            了解教师模式 →
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="lp-pricing">
        <h2 className="lp-pricing-heading">💰 选择适合你的方案</h2>
        <div className="lp-pricing-toggle">
          <button
            className={`lp-toggle-btn ${!yearly ? 'active' : ''}`}
            onClick={() => setYearly(false)}
          >月付</button>
          <button
            className={`lp-toggle-btn ${yearly ? 'active' : ''}`}
            onClick={() => setYearly(true)}
          >年付 <span className="lp-save-badge">省17%</span></button>
        </div>
        <div className="lp-pricing-grid">
          {PRICING_PLANS.map(plan => (
            <PricingCard key={plan.id} plan={plan} yearly={yearly} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <p>MathViz © 2026 · AI 数学可视化学习平台</p>
        <p className="lp-footer-links">
          <span>隐私政策</span> · <span>服务条款</span> · <span>联系我们</span>
        </p>
      </footer>

      <AuthModal />
    </div>
  )
}
