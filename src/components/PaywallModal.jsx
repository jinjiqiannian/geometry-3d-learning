import { useState, useEffect } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { PRICING_PLANS } from '../constants'
import './PaywallModal.css'

const proPlan = PRICING_PLANS.find(p => p.id === 'pro')
const teacherPlan = PRICING_PLANS.find(p => p.id === 'teacher')

export default function PaywallModal() {
  const { showPaywall, setShowPaywall, paywallReason, initiateUpgrade, remaining } = useSubscription()
  const { user } = useSupabase()
  const [yearly, setYearly] = useState(false)

  // Escape key to close
  useEffect(() => {
    if (!showPaywall) return
    const onKey = (e) => { if (e.key === 'Escape') setShowPaywall(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showPaywall, setShowPaywall])

  if (!showPaywall) return null

  const handleUpgrade = (planId) => {
    setShowPaywall(false)
    if (!user) {
      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
      return
    }
    initiateUpgrade(planId, yearly ? 'yearly' : 'monthly')
  }

  const handleClose = () => {
    setShowPaywall(false)
  }

  const proPrice = yearly ? 190 : (proPlan?.price || 19)
  const teacherPrice = yearly ? 290 : (teacherPlan?.price || 29)
  const proMonthly = yearly ? '¥16/月' : '¥19/月'
  const teacherMonthly = yearly ? '¥24/月' : '¥29/月'

  return (
    <div className="paywall-overlay" onClick={handleClose}>
      <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={handleClose}>×</button>

        {/* Header */}
        <div className="paywall-header">
          <div className="paywall-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h2 className="paywall-title">支持开发者 · 解锁高级功能</h2>
          <p className="paywall-subtitle">
            Pro 会员不是买答案，是对产品持续开发的支持
          </p>
          {paywallReason && (
            <p className="paywall-reason">{paywallReason}</p>
          )}
          {remaining > 0 && (
            <p className="paywall-remaining">
              今日还剩 <strong>{remaining}</strong> 次免费使用
            </p>
          )}
        </div>

        {/* Yearly toggle */}
        <div className="paywall-toggle-wrap">
          <button className={`paywall-toggle ${!yearly ? 'active' : ''}`} onClick={() => setYearly(false)}>
            月付
          </button>
          <button className={`paywall-toggle ${yearly ? 'active' : ''}`} onClick={() => setYearly(true)}>
            年付 · 省 17%
          </button>
        </div>

        {/* Plan comparison */}
        <div className="paywall-plans">
          {/* Pro plan */}
          <div className="paywall-plan pro">
            <div className="paywall-plan-header">
              <span className="paywall-plan-name">专业版</span>
              {yearly && <span className="paywall-plan-save">省 ¥{19 * 12 - 190}</span>}
            </div>
            <div className="paywall-plan-price">
              <span className="paywall-plan-currency">¥</span>
              <span className="paywall-plan-amount">{proPrice}</span>
              <span className="paywall-plan-period">{yearly ? '/年' : '/月'}</span>
            </div>
            <p className="paywall-plan-equiv">{proMonthly}{yearly ? '（年付）' : ''}</p>
            <ul className="paywall-plan-features">
              <li>★ 无限额度 — 取消每日限制</li>
              <li>★ 高级教师模式 — 自动讲课</li>
              <li>★ 错题本 — 自动收集管理</li>
              <li>★ 学习分析 — 掌握度统计</li>
              <li>PPT/PDF/图片导出</li>
              <li>云端同步 · 高级分享</li>
            </ul>
            <button className="paywall-plan-btn" onClick={() => handleUpgrade('pro')}>
              升级 Pro
            </button>
          </div>

          {/* Teacher plan */}
          <div className="paywall-plan teacher">
            <div className="paywall-plan-header">
              <span className="paywall-plan-name">教师版</span>
              {yearly && <span className="paywall-plan-save">省 ¥{29 * 12 - 290}</span>}
            </div>
            <div className="paywall-plan-price">
              <span className="paywall-plan-currency">¥</span>
              <span className="paywall-plan-amount">{teacherPrice}</span>
              <span className="paywall-plan-period">{yearly ? '/年' : '/月'}</span>
            </div>
            <p className="paywall-plan-equiv">{teacherMonthly}{yearly ? '（年付）' : ''}</p>
            <ul className="paywall-plan-features">
              <li>Pro 全部功能</li>
              <li>★ 班级管理 — 创建班级</li>
              <li>★ 批量生成课件</li>
              <li>★ 学生学习统计</li>
              <li>作业布置与自动批改</li>
              <li>全班学习数据仪表盘</li>
            </ul>
            <button className="paywall-plan-btn teacher-btn" onClick={() => handleUpgrade('teacher')}>
              升级教师版
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="paywall-footer">
          <button className="paywall-footer-btn" onClick={handleClose}>
            {remaining > 0 ? '继续免费使用' : '关闭'}
          </button>
          <p className="paywall-footer-note">
            7 天无理由退款 · 随时取消 · 不是买答案，是支持开发者
          </p>
        </div>
      </div>
    </div>
  )
}
