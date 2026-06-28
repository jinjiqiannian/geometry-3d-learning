// ═══════════════════════════════════════════════════════
//  频率限制中间件 — 基于用户plan的差异化限制
// ═══════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'
import { getSupabase } from '../db/client.js'

const DAILY_LIMITS: Record<string, number> = {
  free: 3,
  pro: Infinity,
  teacher: Infinity,
}

/**
 * 每日使用量检查（middleware factory）
 * @param action - 动作类型: 'generate' | 'export_ppt' | 'export_image' | 'ai_explain'
 */
export function dailyLimit(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId || !req.userPlan) {
      // No auth — skip rate limiting (auth middleware will handle)
      return next()
    }

    const plan = req.userPlan
    const limit = DAILY_LIMITS[plan] || 3

    if (limit === Infinity) {
      return next() // Pro/Teacher — unlimited
    }

    try {
      const supabase = getSupabase()
      const today = new Date().toISOString().slice(0, 10)

      const { count, error } = await supabase
        .from('usage_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('action', action)
        .gte('created_at', today)

      if (error) {
        console.warn('Rate limit check failed:', error.message)
        return next() // Fail open
      }

      const usage = count || 0

      if (usage >= limit) {
        return res.status(429).json({
          success: false,
          error: `Daily limit reached (${usage}/${limit}). Upgrade to Pro for unlimited access.`,
          code: 'DAILY_LIMIT_REACHED',
          usage,
          limit,
          upgradeUrl: '/pricing',
        })
      }

      // Attach usage info to request for logging
      ;(req as any)._usageCount = usage
      next()
    } catch (err) {
      console.error('Rate limit error:', err)
      next() // Fail open
    }
  }
}

/**
 * 记录使用量（在成功响应后调用）
 */
export async function recordUsage(
  userId: string,
  action: string,
  problemText?: string,
  workspaceId?: string
): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase.from('usage_records').insert({
      user_id: userId,
      action,
      problem_text: problemText || null,
      workspace_id: workspaceId || null,
    })
  } catch (err) {
    console.warn('Failed to record usage:', err)
  }
}
