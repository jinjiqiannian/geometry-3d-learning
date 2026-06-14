// ═══════════════════════════════════════════════════════
//  环境变量验证与导出
// ═══════════════════════════════════════════════════════
import 'dotenv/config'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`)
    process.exit(1)
  }
  return value
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEV: (process.env.NODE_ENV || 'development') === 'development',

  // Supabase
  SUPABASE_URL: optionalEnv('SUPABASE_URL', ''),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnv('SUPABASE_SERVICE_ROLE_KEY', ''),
  SUPABASE_ANON_KEY: optionalEnv('SUPABASE_ANON_KEY', ''),

  // JWT — 所有环境都必须设置 JWT_SECRET
  JWT_SECRET: (() => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('❌ Fatal: JWT_SECRET is required. Use: openssl rand -hex 64')
      process.exit(1)
    }
    return secret
  })(),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '7d'),

  // DeepSeek AI
  DEEPSEEK_API_KEY: optionalEnv('DEEPSEEK_API_KEY', ''),

  // AI Cost 控制
  DAILY_AI_COST_LIMIT: parseFloat(process.env.DAILY_AI_COST_LIMIT || '5'),    // 全局每日 AI 成本上限（USD）
  USER_DAILY_AI_COST_LIMIT: parseFloat(process.env.USER_DAILY_AI_COST_LIMIT || '0.5'), // 单用户每日上限（USD）

  // Stripe
  STRIPE_SECRET_KEY: optionalEnv('STRIPE_SECRET_KEY', ''),
  STRIPE_WEBHOOK_SECRET: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),

  // Frontend
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:5179'),
}

// Print startup info (hide secrets)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  MathViz Server Starting...')
console.log('  Port:', env.PORT)
console.log('  AI Engine:', env.DEEPSEEK_API_KEY ? 'DeepSeek ✓' : 'DeepSeek ✗ (not configured)')
console.log('  Stripe:', env.STRIPE_SECRET_KEY ? 'Configured ✓' : 'Not configured ✗')
console.log('  Supabase:', env.SUPABASE_URL ? new URL(env.SUPABASE_URL).hostname : 'not set')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
