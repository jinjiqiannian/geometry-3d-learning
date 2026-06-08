// ═══════════════════════════════════════════════════════
//  环境变量验证与导出
// ═══════════════════════════════════════════════════════
import 'dotenv/config'

function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`)
    process.exit(1)
  }
  return value
}

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEV: (process.env.NODE_ENV || 'development') === 'development',

  // Supabase
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // JWT
  JWT_SECRET: requireEnv('JWT_SECRET', 'dev-secret-change-in-production-' + Date.now()),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // DeepSeek AI
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5179',
}

// Print startup info (hide secrets)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  MathViz Server Starting...')
console.log('  Port:', env.PORT)
console.log('  AI Engine:', env.DEEPSEEK_API_KEY ? 'DeepSeek ✓' : 'DeepSeek ✗ (not configured)')
console.log('  Stripe:', env.STRIPE_SECRET_KEY ? 'Configured ✓' : 'Not configured ✗')
console.log('  Supabase:', env.SUPABASE_URL ? new URL(env.SUPABASE_URL).hostname : 'not set')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
