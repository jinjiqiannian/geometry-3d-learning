// ═══════════════════════════════════════════════════════
//  Supabase Client (service_role — 后端最高权限)
// ═══════════════════════════════════════════════════════
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseInstance
}

// ── 便捷查询方法 ──────────────────────────────────

export async function query<T = unknown>(
  table: string,
  builder: (q: ReturnType<ReturnType<SupabaseClient['from']>['select']>) => any
): Promise<{ data: T | null; error: Error | null }> {
  const supabase = getSupabase()
  try {
    const result = await builder(supabase.from(table).select('*'))
    return { data: result.data as T, error: result.error as Error | null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * 安全执行SQL（仅用于migrations）
 * 注意：这在 production 中应通过 Supabase migrations 执行
 */
export async function executeSQL(sql: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql }).single()
  if (error) {
    console.warn('SQL execution warning (may need to run in Supabase SQL Editor):', error.message)
  }
}
