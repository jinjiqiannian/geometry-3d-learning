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

  const proPrice = yearly ? 290 : (proPlan?.price || 29)
  const teacherPrice = yearly ? 180 : (teacherPlan?.price || 99)
  const proMonthly = yearly ? '¥24/月' : `¥${proPlan?.price || 29}/月`
  const teacherMonthly = yearly ? '¥15/月' : '¥99/学期'

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
          <h2 className="paywall-title">继续讲透 · 少卡额度</h2>
          <p className="paywall-subtitle">
            免费能学会；Pro 是多练、多导出、少打断
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
              {yearly && <span className="paywall-plan-save">年付更省</span>}
            </div>
            <div className="paywall-plan-price">
              <span className="paywall-plan-currency">¥</span>
              <span className="paywall-plan-amount">{proPrice}</span>
              <span className="paywall-plan-period">{yearly ? '/年' : '/月'}</span>
            </div>
            <p className="paywall-plan-equiv">{proMonthly}{yearly ? '（年付）' : ''}</p>
            <ul className="paywall-plan-features">
              <li>★ 讲题不限次 — 样例免费，自拟题不再掐在 8 次</li>
              <li>★ 方法演示看懂 — 排组 / 几何 / 物理跟着步骤动</li>
              <li>★ 一键导出 PPT — 复习、课堂直接播</li>
              <li>★ 错题自动归档 — 下次对着练</li>
              <li>学习记录可回看</li>
              <li>优先体验新专题</li>
            </ul>
            <button className="paywall-plan-btn" onClick={() => handleUpgrade('pro')}>
              升级 Pro
            </button>
          </div>

          {/* Teacher plan */}
          <div className="paywall-plan teacher">
            <div className="paywall-plan-header">
              <span className="paywall-plan-name">教师版</span>
              {yearly && <span className="paywall-plan-save">年付更省</span>}
            </div>
            <div className="paywall-plan-price">
              <span className="paywall-plan-currency">¥</span>
              <span className="paywall-plan-amount">{teacherPrice}</span>
              <span className="paywall-plan-period">{yearly ? '/年' : (teacherPlan?.period || '/学期')}</span>
            </div>
            <p className="paywall-plan-equiv">{teacherMonthly}{yearly ? '（年付）' : ''}</p>
            <ul className="paywall-plan-features">
              <li>含 Pro 全部能力</li>
              <li>★ 整章批量出 PPT — 备课少搬一次</li>
              <li>★ 班级一眼看进度</li>
              <li>★ 看清谁卡在哪一步</li>
              <li>布置跟练题更省事</li>
              <li>薄弱方法集中练</li>
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
            7 天无理由退款 · 随时取消 · 核心讲题可继续免费用
          </p>
        </div>
      </div>
    </div>
  )
}
