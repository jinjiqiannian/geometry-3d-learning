// ═══════════════════════════════════════════════════════
//  应用 EduMind 数据库迁移
//  运行: node scripts/apply-migration.mjs
// ═══════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read server .env
const envPath = resolve(__dirname, '../server/.env')
const envContent = readFileSync(envPath, 'utf8')
const envVars = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx > 0) {
    envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
  }
}

const SUPABASE_URL = envVars.SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 请在 server/.env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sql = readFileSync(resolve(__dirname, '../supabase/migrations/009_edumind.sql'), 'utf8')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function main() {
  console.log('⏳ 正在应用迁移 009_edumind.sql...')

  // Try REST API direct SQL endpoint
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query_text: sql }),
  })

  if (response.status === 404) {
    console.log('⚠️ exec_sql RPC 端点不存在。')
    console.log('')
    console.log('请手动应用迁移：')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('1. 打开 Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/bhoqcvrqnuujhbortmmn/sql/new')
    console.log('')
    console.log('2. 复制粘贴 SQL 文件内容:')
    console.log('   supabase/migrations/009_edumind.sql')
    console.log('')
    console.log('3. 点击 "Run" 执行')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return
  }

  if (!response.ok) {
    const text = await response.text()
    console.error('❌ 迁移失败:', text)
    process.exit(1)
  }

  console.log('✅ 迁移 009_edumind.sql 已成功应用!')
}

main().catch(console.error)
