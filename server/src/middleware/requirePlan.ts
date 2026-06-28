// ═══════════════════════════════════════════════════════
//  付费等级门控中间件
// ═══════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'

type PlanLevel = 'free' | 'pro' | 'teacher'

const PLAN_HIERARCHY: Record<PlanLevel, number> = {
  free: 0,
  pro: 1,
  teacher: 2,
}

/**
 * 要求至少达到某付费等级
 * @param minimumPlan - 最低需要的plan
 */
export function requirePlan(minimumPlan: PlanLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userPlan) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    const currentLevel = PLAN_HIERARCHY[req.userPlan as PlanLevel] || 0
    const requiredLevel = PLAN_HIERARCHY[minimumPlan]

    if (currentLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `This feature requires ${minimumPlan} plan or higher. Your current plan: ${req.userPlan}`,
        code: 'PLAN_UPGRADE_REQUIRED',
        currentPlan: req.userPlan,
        requiredPlan: minimumPlan,
        upgradeUrl: '/pricing',
      })
    }

    next()
  }
}
