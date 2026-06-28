// ═══════════════════════════════════════════════════════
//  MathViz Server — Express 入口
// ═══════════════════════════════════════════════════════
import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.js'
import { workspaceRouter } from './routes/workspace.js'
import { aiRouter } from './routes/ai.js'
import { exportRouter } from './routes/export.js'
import { billingRouter } from './routes/billing.js'
import { edumindRouter } from './routes/edumind.js'

const app = express()

// ── 基础中间件 ────────────────────────────────────
const allowedOrigins = [
  env.FRONTEND_URL,
  // 开发环境所有端口
  ...Array.from({ length: 100 }, (_, i) => `http://localhost:${5173 + i}`),
]
app.use(cors({
  origin: (origin, cb) => {
    // 允许无 origin 的请求（如 curl）
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, true) // 开发阶段放行所有 origin
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

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
app.use('/api/auth', authRouter)
app.use('/api/workspace', workspaceRouter)
app.use('/api/ai', aiRouter)
app.use('/api/export', exportRouter)
app.use('/api/billing', billingRouter)
app.use('/api/edumind', edumindRouter)

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
