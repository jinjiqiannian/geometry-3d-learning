// ═══════════════════════════════════════════════════════
//  付费等级门控中间件
// ═══════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

type PlanLevel = 'free' | 'pro' | 'teacher'

const PLAN_HIERARCHY: Record<PlanLevel, number> = {
  free: 0,
  pro: 1,
  teacher: 2,
}

/**
 * 要求至少达到某付费等级
 * 每次请求从数据库实时检查 plan，不信任 JWT payload 中的 plan
 * @param minimumPlan - 最低需要的plan
 */
export function requirePlan(minimumPlan: PlanLevel) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId || !req.userPlan) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    // 从数据库实时查询当前用户的实际 plan
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', req.userId)
        .single()

      const effectivePlan: PlanLevel = (sub?.status === 'active' ? sub.plan : 'free') as PlanLevel
      const currentLevel = PLAN_HIERARCHY[effectivePlan] || 0
      const requiredLevel = PLAN_HIERARCHY[minimumPlan]

      if (currentLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: `此功能需要 ${minimumPlan} 及以上套餐。当前套餐：${effectivePlan}`,
          code: 'PLAN_UPGRADE_REQUIRED',
          currentPlan: effectivePlan,
          requiredPlan: minimumPlan,
          upgradeUrl: '/pricing',
        })
      }

      // 同步更新 req.userPlan 供后续使用
      req.userPlan = effectivePlan
      next()
    } catch (err) {
      console.error('Plan check failed, denying by default:', err)
      return res.status(403).json({
        success: false,
        error: '无法验证订阅状态，请稍后再试',
        code: 'PLAN_CHECK_FAILED',
      })
    }
  }
}
