import { createContext, useContext, useCallback } from 'react'

/**
 * SubscriptionContext — 全免费 stub
 * 旧付费体系已下线（定价方案待定）。当前所有功能无限制开放，
 * paywall 永不触发；hook 接口保持不变，未来新付费方案可直接在此实现。
 */

// 保留导出以兼容旧引用；无限额度
export const FREE_DAILY_LIMIT = Infinity

const SubscriptionContext = createContext(null)

const noop = () => {}
const noopAsync = async () => ({})

export function SubscriptionProvider({ children }) {
  const value = {
    plan: 'free',
    billingInterval: 'monthly',
    status: 'active',
    isPro: true,        // 全功能解锁
    isTeacher: false,   // 教师模式已下线
    dailyUsage: 0,
    dailyLimit: Infinity,
    remaining: Infinity,
    checkCanGenerate: useCallback(() => true, []),
    checkCanAiExplain: useCallback(() => true, []),
    checkCanExportPpt: useCallback(() => true, []),
    checkCanExportImage: useCallback(() => true, []),
    recordUsage: useCallback(noopAsync, []),
    initiateUpgrade: useCallback(noopAsync, []),
    manageSubscription: useCallback(noopAsync, []),
    cancelSubscription: useCallback(noopAsync, []),
    showPaywall: false,
    setShowPaywall: noop,
    paywallReason: '',
    triggerPaywall: noop,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}

export default SubscriptionContext
