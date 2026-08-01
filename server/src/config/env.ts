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

  // Supabase (开发模式可选，生产模式必须)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // JWT
  JWT_SECRET: requireEnv('JWT_SECRET', 'dev-secret-change-in-production-' + Date.now()),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // DeepSeek AI
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',

  // 识图 OCR（任选其一即可）
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  // OpenAI 兼容视觉：通义 / 智谱 / OpenAI / 硅基流动 / Moonshot…
  VISION_API_KEY: process.env.VISION_API_KEY || '',
  VISION_API_BASE: process.env.VISION_API_BASE || '',
  VISION_API_MODEL: process.env.VISION_API_MODEL || '',
  VISION_PROVIDER: (process.env.VISION_PROVIDER || '').toLowerCase(),

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
console.log(
  '  Vision OCR:',
  env.VISION_API_KEY || env.GEMINI_API_KEY
    ? [
        env.VISION_PROVIDER || (env.VISION_API_KEY ? 'openai-compat' : ''),
        env.GEMINI_API_KEY ? 'gemini' : '',
      ]
        .filter(Boolean)
        .join('+') + ' ✓'
    : '未配置（将用本地 OCR）'
)
console.log('  Stripe:', env.STRIPE_SECRET_KEY ? 'Configured ✓' : 'Not configured ✗')
console.log('  Supabase:', env.SUPABASE_URL ? new URL(env.SUPABASE_URL).hostname : 'not set')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
