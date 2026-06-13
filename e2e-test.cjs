// ═══════════════════════════════════════════════════════
//  E2E: 几何维度 — 核心用户流程自动化测试
//  Playwright 模拟用户在浏览器中的操作
// ═══════════════════════════════════════════════════════
const { chromium } = require('playwright')

const BASE = 'http://localhost:5173'
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
}

async function run() {
  console.log('')
  console.log('═'.repeat(56))
  console.log('  几何维度 E2E 测试')
  console.log('═'.repeat(56))

  const browser = await chromium.launch({ headless: true })
  const results = { passed: 0, failed: 0, total: 0 }

  function check(ok, label, detail = '') {
    results.total++
    if (ok) {
      results.passed++
      console.log(`  ✅  ${label}`)
    } else {
      results.failed++
      console.log(`  ❌  ${label}  ${detail}`)
    }
  }

  try {
    // ── Test 1: Landing page loads ──────────────────
    console.log('\n── Section 1: Landing Page Structure ──')
    const ctx1 = await browser.newContext({ viewport: VIEWPORTS.desktop })
    const p1 = await ctx1.newPage()
    await p1.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    // Hero section
    const heroTitle = await p1.textContent('.landing-hero-title')
    check(heroTitle?.includes('立体几何'), 'Hero title 显示', heroTitle)

    const brand = await p1.textContent('.landing-hero-brand')
    check(brand === '几何维度', 'Brand logo 显示', brand)

    const input = await p1.$('.landing-hero-input')
    check(!!input, '输入框存在')

    const submitBtn = await p1.$('.landing-hero-submit')
    check(!!submitBtn, '开始解析按钮存在')
    check(await submitBtn?.isDisabled(), '输入为空时按钮禁用')

    // Hot tags
    const tags = await p1.$$('.landing-hero-tag')
    check(tags.length >= 3, `热门题目标签 ≥3 个 (${tags.length})`)

    // Examples section
    const sectionTitle = await p1.textContent('.landing-examples .landing-section-title')
    check(sectionTitle?.includes('热门例题'), 'Section 2 标题: 热门例题')

    const cards = await p1.$$('.landing-example-card')
    check(cards.length > 0, `例题卡片 > 0 (${cards.length})`)

    // Features section
    const featTitle = await p1.textContent('.landing-features .landing-section-title')
    check(featTitle?.includes('核心功能'), 'Section 3 标题: 核心功能')

    const featCards = await p1.$$('.landing-feature-card')
    check(featCards.length === 6, `功能卡片 6 个 (${featCards.length})`)

    const featNames = await Promise.all(featCards.map(c => c.textContent()))
    const hasAI = featNames.some(n => n.includes('AI'))
    const has3D = featNames.some(n => n.includes('3D'))
    check(hasAI && has3D, '包含 AI 解析 + 3D 讲解')

    // Plans section
    const planTitle = await p1.textContent('.landing-plans .landing-section-title')
    check(planTitle?.includes('会员计划'), 'Section 4 标题: 会员计划')

    const planCards = await p1.$$('.landing-plan-card')
    check(planCards.length >= 2, '至少 2 个计划卡片 (免费 + Pro)')

    await ctx1.close()

    // ── Test 2: Input & navigation to workspace ──────
    console.log('\n── Section 2: Input & Workspace Navigation ──')
    const ctx2 = await browser.newContext({ viewport: VIEWPORTS.desktop })
    const p2 = await ctx2.newPage()
    await p2.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    // Click a hot tag to fill input
    const firstTag = await p2.$('.landing-hero-tag')
    if (firstTag) {
      await firstTag.click()
      await p2.waitForTimeout(300)
      const inputVal = await p2.$eval('.landing-hero-input', el => el.value)
      check(inputVal.length >= 3, '点击热门标签填充输入框', `已填充 ${inputVal.length} 字符`)
    }

    // Type a custom problem
    await p2.fill('.landing-hero-input', '正方体ABCD-A₁B₁C₁D₁棱长为2，求异面直线A₁B与B₁C所成角余弦值')
    await p2.waitForTimeout(200)

    // Submit button should be enabled
    const enabled = await p2.$eval('.landing-hero-submit', el => !el.disabled)
    check(enabled, '输入有效时按钮可用')

    // Click submit
    await p2.click('.landing-hero-submit')
    await p2.waitForTimeout(1000)

    // Should navigate to workspace
    const wsUrl = p2.url()
    check(wsUrl.includes('workspace'), '导航到 /workspace', wsUrl)

    await ctx2.close()

    // ── Test 3: Hot tag click fills input ────────────
    console.log('\n── Section 3: Hot Tags Interaction ──')
    const ctx3 = await browser.newContext({ viewport: VIEWPORTS.desktop })
    const p3 = await ctx3.newPage()
    await p3.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    const allTags = await p3.$$('.landing-hero-tag')
    check(allTags.length === 5, 'Hot tags 数量 = 5', String(allTags.length))

    const tagLabels = await Promise.all(allTags.map(t => t.textContent()))
    const expectedTags = ['正方体', '三棱锥', '球体', '二面角', '异面直线']
    const allMatch = expectedTags.every(t => tagLabels.includes(t))
    check(allMatch, '标签内容正确', tagLabels.join(', '))

    await ctx3.close()

    // ── Test 4: Mobile responsive ────────────────────
    console.log('\n── Section 4: Mobile Responsive ──')
    const ctx4 = await browser.newContext({ viewport: VIEWPORTS.mobile })
    const p4 = await ctx4.newPage()
    await p4.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    // Check no horizontal overflow
    const bodyW = await p4.$eval('body', el => el.scrollWidth)
    const vpW = VIEWPORTS.mobile.width
    check(bodyW <= vpW + 5, '无横向滚动', `body ${bodyW}px ≤ viewport ${vpW}px`)

    // Hero visible
    const mTitle = await p4.textContent('.landing-hero-title')
    check(!!mTitle, 'Mobile: Hero 标题可见')

    // Input should exist and be usable
    const mInput = await p4.$('.landing-hero-input')
    check(!!mInput, 'Mobile: 输入框存在')

    // Hot tags wrap
    const mTags = await p4.$$('.landing-hero-tag')
    check(mTags.length >= 3, `Mobile: 热门标签 ≥3 (${mTags.length})`)

    // Examples grid: mobile = 1 column
    const mCards = await p4.$$('.landing-example-card')
    check(mCards.length > 0, `Mobile: 例题卡片 > 0 (${mCards.length})`)

    // Features visible
    const mFeatCards = await p4.$$('.landing-feature-card')
    check(mFeatCards.length === 6, `Mobile: 功能卡片 6 个 (${mFeatCards.length})`)

    await ctx4.close()

    // ── Test 5: Tablet responsive ────────────────────
    console.log('\n── Section 5: Tablet Responsive ──')
    const ctx5 = await browser.newContext({ viewport: VIEWPORTS.tablet })
    const p5 = await ctx5.newPage()
    await p5.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })

    const tBodyW = await p5.$eval('body', el => el.scrollWidth)
    check(tBodyW <= VIEWPORTS.tablet.width + 5, 'Tablet: 无横向滚动')

    const tCards = await p5.$$('.landing-example-card')
    check(tCards.length > 0, 'Tablet: 例题卡片可见')

    await ctx5.close()

  } catch (err) {
    console.error(`\n  💥 测试异常: ${err.message}`)
    results.failed++
  } finally {
    await browser.close()
  }

  // ── Summary ──────────────────────────────────────
  console.log('\n' + '═'.repeat(56))
  console.log(`  结果: ${results.passed}/${results.total} 通过`)
  if (results.failed > 0) {
    console.log(`  ❌  ${results.failed} 个失败`)
  } else {
    console.log('  ✅  全部通过')
  }
  console.log('═'.repeat(56))
  console.log('')
  process.exit(results.failed > 0 ? 1 : 0)
}

run()
