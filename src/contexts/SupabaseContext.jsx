import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Singleton Supabase client
let supabaseInstance = null
function getSupabase() {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabaseInstance
}

// ── 手机号工具函数 ─────────────────────────────────

/** 规范化手机号：去除非数字，自动补 +86 */
function normalizePhone(input) {
  let digits = input.replace(/\D/g, '')
  // 11位国内手机号自动加 +86
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = '86' + digits
  }
  return digits
}

/** 手机号 → 内部邮箱 */
function phoneToEmail(phone) {
  const norm = normalizePhone(phone)
  return `phone_${norm}@phone.mathviz`
}

/** 检查输入是否像手机号（纯数字或带+号） */
export function isPhoneLike(input) {
  const cleaned = input.replace(/[\s\-()+]/g, '')
  return /^\+?\d{5,15}$/.test(cleaned)
}

const SupabaseContext = createContext(null)

export function SupabaseProvider({ children }) {
  const [supabase] = useState(() => getSupabase())
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  // Check if Supabase is configured
  useEffect(() => {
    setConnected(!!SUPABASE_URL && !!SUPABASE_ANON_KEY && !!supabase)
  }, [supabase])

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase])

  const fetchProfile = useCallback(async (userId, authUser) => {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // 合并 profile 数据和 auth user metadata
      const enriched = {
        ...(data || {}),
        phone: data?.phone || authUser?.user_metadata?.phone || null,
        displayName: data?.full_name || authUser?.user_metadata?.display_name || '',
      }
      setProfile(enriched)
    } catch (err) {
      console.warn('SupabaseContext: Profile fetch failed, attempting upsert', err.message)
      // Profile may not exist yet — trigger creation
      try {
        const userData = authUser || {}
        const phone = userData.user_metadata?.phone || null
        const { data } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: userData.email || '',
            phone,
            full_name: userData.user_metadata?.display_name || '',
          })
          .select('*')
          .single()
        setProfile({ ...(data || {}), phone, displayName: data?.full_name || '' })
      } catch {
        // ignore
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ── 邮箱注册/登录 ──────────────────────────────

  const signUp = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [supabase])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [supabase])

  // ── 手机号注册/登录 ────────────────────────────

  /**
   * 手机号注册
   * 底层用 phone_xxx@phone.mathviz 作邮箱，手机号存 user_metadata
   */
  const signUpWithPhone = useCallback(async (phone, password) => {
    if (!supabase) throw new Error('Supabase not configured')
    const norm = normalizePhone(phone)
    const email = phoneToEmail(phone)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: norm,
          phone_raw: phone,
          display_name: phone,
        },
      },
    })
    if (error) throw error

    // 立即更新 profiles 写入手机号
    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          phone: norm,
        })
      } catch { /* non-critical */ }
    }

    return data
  }, [supabase])

  /**
   * 手机号登录
   */
  const signInWithPhone = useCallback(async (phone, password) => {
    if (!supabase) throw new Error('Supabase not configured')
    const email = phoneToEmail(phone)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // 翻译常见错误
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('手机号或密码错误，请重试。')
      }
      throw error
    }
    return data
  }, [supabase])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
    return data
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [supabase])

  /**
   * 从 profile / user metadata 提取显示用的手机号
   */
  const phoneNumber = profile?.phone || user?.user_metadata?.phone || null

  /**
   * 格式化手机号显示（国内：138****0000）
   */
  const displayPhone = phoneNumber
    ? phoneNumber.replace(/^86/, '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
    : null

  return (
    <SupabaseContext.Provider value={{
      supabase,
      connected,
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signUpWithPhone,
      signInWithPhone,
      signInWithGoogle,
      signOut,
      phoneNumber,
      displayPhone,
    }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useSupabase must be used within SupabaseProvider')
  return ctx
}

export default SupabaseContext
