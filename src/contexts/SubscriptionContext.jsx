import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSupabase } from './SupabaseContext'

const FREE_DAILY_LIMIT = 50

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getLocalTier() {
  try { return localStorage.getItem('mathviz_tier') || 'free' }
  catch { return 'free' }
}

function setLocalTier(tier) {
  try { localStorage.setItem('mathviz_tier', tier) } catch { /* */ }
}

function getLocalDailyUsage() {
  try {
    const date = localStorage.getItem('mathviz_usage_date')
    if (date !== getToday()) return 0
    return parseInt(localStorage.getItem('mathviz_daily_usage') || '0', 10)
  } catch { return 0 }
}

function incrementLocalDailyUsage() {
  try {
    const count = getLocalDailyUsage() + 1
    localStorage.setItem('mathviz_daily_usage', String(count))
    localStorage.setItem('mathviz_usage_date', getToday())
    return count
  } catch { return 1 }
}

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { supabase, user, connected } = useSupabase()

  const [plan, setPlan] = useState(() => getLocalTier())
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [subStatus, setSubStatus] = useState('active')
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [dailyUsage, setDailyUsage] = useState(() => getLocalDailyUsage())
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallReason, setPaywallReason] = useState('')

  const isPro = plan === 'pro' || plan === 'teacher'
  const isTeacher = plan === 'teacher'
  const dailyLimit = FREE_DAILY_LIMIT
  const remaining = Math.max(0, dailyLimit - dailyUsage)

  // Load subscription from Supabase when user logs in
  useEffect(() => {
    if (!connected || !user || !supabase) return

    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        setPlan(data.plan || 'free')
        setBillingInterval(data.billing_interval || 'monthly')
        setSubStatus(data.status || 'active')
        setStripeCustomerId(data.stripe_customer_id || null)
        setLocalTier(data.plan || 'free')
      })

    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newData = payload.new
          setPlan(newData.plan || 'free')
          setBillingInterval(newData.billing_interval || 'monthly')
          setSubStatus(newData.status || 'active')
          setStripeCustomerId(newData.stripe_customer_id || null)
          setLocalTier(newData.plan || 'free')
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [connected, user, supabase])

  // Reset daily usage on new day
  useEffect(() => {
    const today = getToday()
    const stored = (() => {
      try { return localStorage.getItem('mathviz_usage_date') }
      catch { return null }
    })()
    if (stored !== today) {
      setDailyUsage(0)
      localStorage.setItem('mathviz_daily_usage', '0')
      localStorage.setItem('mathviz_usage_date', today)
    }
  }, [])

  // Feature gates — guests can use everything, just rate-limited
  const checkCanGenerate = useCallback(() => {
    if (dailyUsage >= dailyLimit) {
      setPaywallReason('已达每日使用上限，登录后可继续使用')
      setShowPaywall(true)
      return false
    }
    return true
  }, [dailyUsage])

  const checkCanAiExplain = useCallback(() => {
    return true // Guest-friendly: always allow
  }, [])

  const checkCanExportPpt = useCallback(() => {
    return true // Guest-friendly: always allow
  }, [])

  const checkCanExportImage = useCallback(() => {
    return true // Guest-friendly: always allow
  }, [])

  // Record usage
  const recordUsage = useCallback(async (action, problemText, workspaceId) => {
    const newCount = incrementLocalDailyUsage()
    setDailyUsage(newCount)

    if (connected && user && supabase) {
      try {
        await supabase.from('usage_records').insert({
          user_id: user.id,
          action,
          problem_text: problemText || null,
          workspace_id: workspaceId || null,
        })
      } catch { /* non-critical */ }
    }
  }, [connected, user, supabase])

  // Upgrade flow (requires login)
  const initiateUpgrade = useCallback(async (targetPlan, interval = 'monthly') => {
    if (!user) {
      document.dispatchEvent(new CustomEvent('mathviz:show-auth'))
      return { needsAuth: true }
    }

    if (!connected || !supabase) {
      setPlan(targetPlan)
      setLocalTier(targetPlan)
      return { offline: true }
    }

    const priceMap = {
      'pro_monthly': import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'pro_monthly',
      'pro_yearly': import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || 'pro_yearly',
      'teacher_monthly': import.meta.env.VITE_STRIPE_PRICE_TEACHER_MONTHLY || 'teacher_monthly',
      'teacher_yearly': import.meta.env.VITE_STRIPE_PRICE_TEACHER_YEARLY || 'teacher_yearly',
    }
    const priceId = priceMap[`${targetPlan}_${interval}`]

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        priceId,
        successUrl: `${window.location.origin}/workspace?upgrade=success`,
        cancelUrl: `${window.location.origin}/pricing`,
      },
    })

    if (error) throw new Error(error.message || 'Failed to create checkout session')
    if (data?.url) window.location.href = data.url
    return data
  }, [connected, supabase, user])

  const manageSubscription = useCallback(async () => {
    if (!connected || !supabase || !stripeCustomerId) {
      window.location.href = '/pricing'
      return
    }

    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: {
        customerId: stripeCustomerId,
        returnUrl: window.location.origin + '/pricing',
      },
    })

    if (error) throw new Error(error.message || 'Failed to open customer portal')
    if (data?.url) window.location.href = data.url
  }, [connected, supabase, stripeCustomerId])

  const cancelSubscription = useCallback(async () => {
    await manageSubscription()
  }, [manageSubscription])

  return (
    <SubscriptionContext.Provider value={{
      plan,
      billingInterval,
      status: subStatus,
      isPro,
      isTeacher,
      dailyUsage,
      dailyLimit,
      remaining,
      checkCanGenerate,
      checkCanAiExplain,
      checkCanExportPpt,
      checkCanExportImage,
      recordUsage,
      initiateUpgrade,
      manageSubscription,
      cancelSubscription,
      showPaywall,
      setShowPaywall,
      paywallReason,
      triggerPaywall: (reason) => { setPaywallReason(reason); setShowPaywall(true) },
    }}>
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
