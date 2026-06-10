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
          <h2 className="paywall-title">升级解锁更多功能</h2>
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
              <li>不限次数 AI 深度讲解</li>
              <li>3D 场景逐步骤展示</li>
              <li>云端同步解题记录</li>
              <li>高清图片导出</li>
            </ul>
            <button className="paywall-plan-btn" onClick={() => handleUpgrade('pro')}>
              升级专业版
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
              <li>专业版全部功能</li>
              <li>PPT 课件一键导出</li>
              <li>课堂演示模式</li>
              <li>批量生成题目 + 讲稿</li>
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
            7 天无理由退款 · 随时取消
          </p>
        </div>
      </div>
    </div>
  )
}
