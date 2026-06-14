// ═══════════════════════════════════════════════════════
//  MathViz Server — Express 入口
// ═══════════════════════════════════════════════════════
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.js'
import { workspaceRouter } from './routes/workspace.js'
import { aiRouter } from './routes/ai.js'
import { exportRouter } from './routes/export.js'
import { billingRouter } from './routes/billing.js'
import { knowledgeRouter } from './routes/knowledge.js'
import { modelRouter as mathModelRouter } from './routes/models.js'
import { trainingRouter } from './routes/training.js'
import { mistakeRouter } from './routes/mistake.js'
import { loadModels } from './content/modelLoader.js'

const app = express()

// ── 启动时加载数学模型库 ──────────────────────────
loadModels()

// ── CORS — 生产环境仅允许白名单域名 ─────────────────
const allowedOrigins: string[] = [env.FRONTEND_URL]
if (env.IS_DEV) {
  for (let i = 0; i < 100; i++) {
    allowedOrigins.push(`http://localhost:${5173 + i}`)
  }
}
app.use(cors({
  origin: (origin, cb) => {
    // 允许无 origin 请求（curl / server-to-server）
    if (!origin) return cb(null, true)
    // 白名单内放行
    if (allowedOrigins.includes(origin)) return cb(null, true)
    // 开发环境放行所有
    if (env.IS_DEV) return cb(null, true)
    // 生产环境阻止 — 不设 ACAO header，浏览器拒绝
    console.warn(`CORS blocked origin: ${origin}`)
    cb(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── 登录频率限制 ─────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10,                   // 每个IP最多10次（含成功和失败）
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '尝试次数过多，请15分钟后再试' },
})

// Stripe webhook needs raw body — must be before JSON parser
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logger
app.use((req, _res, next) => {
  const start = Date.now()
  _res.on('finish', () => {
    const ms = Date.now() - start
    if (req.path !== '/health') {
      console.log(`${req.method} ${req.path} → ${_res.statusCode} (${ms}ms)`)
    }
  })
  next()
})

// ── Health Check ──────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'MathViz API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      ai: !!env.DEEPSEEK_API_KEY,
      stripe: !!env.STRIPE_SECRET_KEY,
      supabase: !!env.SUPABASE_URL,
    },
  })
})

// ── API Routes ────────────────────────────────────
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth', authRouter)
app.use('/api/workspace', workspaceRouter)
app.use('/api/ai', aiRouter)
app.use('/api/export', exportRouter)
app.use('/api/billing', billingRouter)
app.use('/api/knowledge', knowledgeRouter)
app.use('/api/models', mathModelRouter)
app.use('/api/training', trainingRouter)
app.use('/api/mistakes', mistakeRouter)

// ── 404 Handler ───────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' })
})

// ── Error Handler ─────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: env.IS_DEV ? err.message : 'Internal server error',
  })
})

// ── Start Server ──────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`\n  🚀 MathViz API running at http://localhost:${env.PORT}`)
  console.log(`  📋 Health check: http://localhost:${env.PORT}/health`)
  console.log(`  🌐 CORS origin: ${env.FRONTEND_URL}\n`)
})

export default app
