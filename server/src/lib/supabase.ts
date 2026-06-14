// ═══════════════════════════════════════════════════════
//  Supabase 统一入口
//    supabase       — anon key（用户数据，受 RLS 保护）
//    supabaseAdmin  — service_role（管理操作，绕过 RLS）
// ═══════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

export const supabase = createClient(env.SUPABASE_URL || '', env.SUPABASE_ANON_KEY || '', {
  auth: { autoRefreshToken: false, persistSession: false },
})

export const supabaseAdmin = createClient(env.SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { autoRefreshToken: false, persistSession: false },
})
