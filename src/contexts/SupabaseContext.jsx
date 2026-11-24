import { createContext, useContext, useMemo } from 'react'

/**
 * 本地会话 Context（原 SupabaseContext）—— 个人自用版
 *
 * 本项目已从「面向公众的商业产品」转为「个人自用的学习工具」：
 * 没有账号体系、没有云端同步、没有多用户、没有任何服务端依赖。
 *
 * 文件名与 hook 名保持原样，是为了让 WorkspacePage、WorkspaceContext
 * 等既有代码零改动继续工作 —— 改名的收益远低于它带来的 diff 噪音。
 *
 * 语义约定（下游代码依赖这三条走本地降级路径）：
 * - user = null / isGuest = true → 「登录后才能用」的分支永不触发
 * - connected = false            → 存储一律走 localStorage
 * - supabase = null              → 不存在任何网络请求
 */

const SupabaseContext = createContext(null)

/**
 * 旧引用兼容：手机号格式校验。自用版没有登录流程，
 * 仅保留导出，避免残留 import 在构建期报错。
 */
export function isPhoneLike(input) {
  return /^1[3-9]\d{9}$/.test(String(input || '').trim())
}

const noopAsync = async () => ({ error: null })

export function SupabaseProvider({ children }) {
  const value = useMemo(() => ({
    supabase: null,
    connected: false,
    session: null,
    user: null,
    profile: null,
    loading: false,
    guestId: 'local',
    isGuest: true,
    signUp: noopAsync,
    signIn: noopAsync,
    signUpWithPhone: noopAsync,
    signInWithPhone: noopAsync,
    signInWithGoogle: noopAsync,
    signOut: noopAsync,
    phoneNumber: null,
    displayPhone: null,
  }), [])

  return (
    <SupabaseContext.Provider value={value}>
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
