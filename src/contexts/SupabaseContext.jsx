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
    supabase.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase])

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch {
      // Profile may not exist yet — trigger creation
      try {
        const { data } = await supabase
          .from('profiles')
          .upsert({ id: userId, email: supabase.auth.getUser()?.email })
          .select('*')
          .single()
        setProfile(data)
      } catch {
        // ignore
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

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
      signInWithGoogle,
      signOut,
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
