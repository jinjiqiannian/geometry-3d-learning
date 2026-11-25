# 即懂 · 自用学习工具 — 任务卡

> 制定日期：2026-11-24 ｜ 目标版本：**v2.0.0** ｜ 状态：**待执行**
>
> 本文档是执行依据。每张卡写清「要做什么、动哪些文件、怎么算做完」。
> 执行时按编号顺序推进，**完成一张勾一张，不跳步、不顺手加需求**。

---

## 0. 项目定位与不变量

**定位**：个人自用的学习工具。数学物理搜题讲解 + 3D 可视化 + 语文作文素材 + 英语精讲。

**不变量**（任何任务不得违反）：

1. 无账号体系、无云端同步、无商业化、无外部用户
2. 数据纯本地（localStorage / Capacitor 本地存储），API Key 只存本机、**绝不进仓库**
3. 语文素材的人物实例与名言**必须联网找 A 级权威来源核实**；查不到出处的名言直接弃用；联网不可用时暂停事实性内容生产
4. 英语 AI 调用必须带缓存，同一篇材料不重复扣费
5. 安卓优先；iOS 需 macOS，本机做不了，不投入
6. 每完成一个阶段必须 `npm test` + `npm run build` 全绿才进下一张卡

---

## 1. 任务总览

| 编号 | 任务 | 阶段 | 状态 |
|---|---|---|---|
| T1 | 提交当前自用版改动 | 清理 | ☑ `6a4aba6` |
| T2 | 删除商业遗留目录与文档 | 清理 | ☑ 删 123 文件 |
| T3 | 移除 PPT 导出功能 | 清理 | ☑ 省 373 kB |
| T4 | 清理未使用依赖 | 清理 | ☑ 卸 5 个包 |
| T5 | 删除零引用散文件与工具目录 | 清理 | ☑ |
| T6 | 清理后验证 | 清理 | ☑ 48 文件 / 558 用例 |
| T7 | 本地分支清理 | 分支 | ☑ 只剩主线 |
| T8 | 远程分支清理与默认分支切换 | 分支 | ☑ 删 11 个 |
| T9 | 版本号 2.0.0 + README 重建 | 文档 | ☑ `346e02f` |
| T10 | docs 目录重构 | 文档 | ☑ |
| T11 | Capacitor 安卓壳与 APK | P0 | ☑ APK 4.7 MB |
| T12 | 自用首页与语文素材展示 | P1 | ☑ 含 5 个渲染测试 |
| T13 | 语文素材内容生产（联网核实） | P1 | ◐ 3 人物 + 1 金句（目标约 20） |
| T14 | 英语精讲 | P2 | ☐ |
| T15 | 生词本 | P2 | ☐ |
| T16 | 移动端适配 | P3 | ☐ |

---

## 第一阶段：清理

### T1 · 提交当前自用版改动

**目的**：把已完成的自用版改造和后续删除隔离，出问题可单独回滚。

**动作**：
- 提交以下 7 个已修改文件：
  `index.html`、`src/App.jsx`、`src/components/AppNavigation.jsx`、
  `src/components/MobileBottomNav.jsx`、`src/contexts/SupabaseContext.jsx`、
  `src/contexts/WorkspaceContext.jsx`、`src/layouts/PageLayout.jsx`
- 建议提交信息：`refactor: 转为个人自用工具，移除账号体系并精简路由`

**验收**：`git status` 除未跟踪文件外干净；`npm test` 579 用例通过。

---

### T2 · 删除商业遗留目录与文档

**动作**：
- 删目录：`api/`、`server/`、`supabase/`
- 删脚本：`scripts/apply-migration.mjs`
- 删文档：`docs/GROWTH-STRATEGY.md`、`docs/COMMERCIALIZATION-ROADMAP.md`、
  `docs/MEMBERSHIP-DESIGN.md`、`docs/USER-RESEARCH-PLAN.md`
- 删路由已摘除的页面：
  `LandingPage`、`HistoryPage`、`SettingsPage`、`ProfilePage`、`EduMindPage`、
  `ExamUploadPage`、`ExamReportPage`、`LearningPlanPage`、`FeedbackAdminPage`、
  `MathPage`、`PhysicsPage`、`SubjectPage.css`、`src/pages/edumind/`（含同名 `.css`）
- 删组件：`AuthModal`、`FeedbackModal`、`UserMenu`（含 `.css`）
- 删服务：`src/services/analytics.js`、`src/services/edumind.js`

**前置**：先跑一次引用检查，确认存活代码不再 import 这些文件。

**后果确认**：拍照 OCR 随之永久移除，只保留打字输入。

**验收**：无残留 import 报错；构建通过。

---

### T3 · 移除 PPT 导出功能

**动作**：
- 删 `src/engines/pptExporter.js` 及其测试
- 清理 `WorkspacePage.jsx`、`LogicPanel.jsx`、`TopicPanel.jsx` 中的导出按钮与相关逻辑
- 卸载 `pptxgenjs`、`html-to-image`

**收益**：减少约 373 kB 构建体积，对手机端有直接意义。

**验收**：界面无 PPT 按钮残留；构建产物中 `pptExporter` chunk 消失。

---

### T4 · 清理未使用依赖

**动作**：
- 卸载：`@stripe/stripe-js`（已验证零引用）、`@supabase/supabase-js`、`@types/multer`
- 核查 `@playwright/test`：`e2e-test.cjs` 实际用的是 `playwright`，确认后决定保留哪一个
- `package.json` 的 `description` 改为自用定位，`version` 在 T9 统一处理

**验收**：`npm install` 正常；`npm run build` 通过；无缺失模块报错。

---

### T5 · 删除零引用散文件与工具目录

**动作**：
- 删根目录散文件（已验证零引用）：
  `geometry-quiz.html`、`test-parse.js`、`appstore-readiness.html`、`setup-new-pc.ps1`
- 移出版本库：`.claude/plans/`、`.claude/archive/`，并加入 `.gitignore`
- 评估 `e2e-test.cjs`、`start.bat`、`WINDOWS_MIGRATION_GUIDE.md` 是否仍需要

**验收**：根目录只剩配置、源码、文档三类文件。

---

### T6 · 清理后验证

**动作**：`npm test` + `npm run build`，手动跑一遍三条核心链路。

**验收**：
- 测试全绿，构建通过
- `#/search` 能解题、`#/teach` 能浏览知识点、`#/explore` 能转 3D
- 控制台无 404、无 `/api/track`、无 Supabase 相关报错

**通过后才能进入分支清理。**

---

## 第二阶段：分支

### T7 · 本地分支清理

**动作**：删除除 `feat/scene-ir-gate` 外的全部本地分支：
`main`、`archive/main-2026-06-19`、`cursor/refine-learning-animations-2081`、
`cursor/vercel-ai-solve-2081`、`cursor/workout-logger-32e9`、
`cursor/workspace-subject-router`、`feature/geometry-engine`、`fix/vercel-explain-electro-local`

**依据**：已验证这些分支相对主线独有提交为 0，或内容已被明确放弃。

**可选**：将 `feat/scene-ir-gate` 重命名为 `main`，作为唯一主线。

**验收**：`git branch` 只剩一条。

---

### T8 · 远程分支清理与默认分支切换 ⚠️ 对外操作

**执行前必须把完整命令列给用户确认。**

**动作**：
- 删除 12 个远程分支：
  `main`、`archive/main-2026-06-19`、`gh-pages`、`feature/geometry-engine`、
  `cursor/refine-learning-animations-2081`、`cursor/smooth-landing-scroll-a4a0`、
  `cursor/vercel-ai-solve-2081`、`cursor/website-audit-fixes-31b1`、
  `cursor/workspace-fluid-steps-a4a0`、`fix/vercel-explain-electro-local`、`trae/agent-pRKjvL`
- 推送主线并在 GitHub 将默认分支指向它
- 关闭关联 PR #7

**注意**：`feature/geometry-engine` 是当前远程默认分支，**必须先在 GitHub 改默认分支，才能删除它**。

**验收**：GitHub 分支页只剩一条；本地与远程同步。

---

## 第三阶段：文档

### T9 · 版本号 2.0.0 + README 重建

**动作**：
- `package.json` version → `2.0.0`，description 改为自用学习工具
- 新建 `README.md`，结构如下（参照 Errata 项目的密度标准）：

```
# 即懂 · 自用学习工具
一句话定位 + 平台 / 数据存储 / 当前版本 / 仓库地址

## 当前状态        构建与测试命令 + 实测结果
## 已实现的功能    分模块，每条写"做了什么 + 怎么验证"
## AI 实测记录     DeepSeek 各项能力实测表格
## 仍需真机验证的  3D 触摸、小屏布局、APK 体积、AI 实际花费
## 更新日志        按版本号记，从 v2.0.0 起
## 环境（本机已装好）JDK / Android SDK 路径写死
## 怎么构建        网页命令 + APK 命令
## 目录结构
## 文档索引
```

**验收**：三个月后的自己照着 README 能把项目跑起来。

---

### T10 · docs 目录重构

**动作**：
- 新建 `docs/DECISIONS.md`：决策与踩坑记录（历史改写、filter-repo 不可用、
  分支去重方法、自用化转型的理由）
- 新建 `docs/HANDOFF.md`：哪些活能交给 AI、怎么验收
- `docs/CHANGELOG.md` 归档重写：旧的按日期流水账归档，新版按版本号记录
- 保留仍有效的技术文档：`ANIMATION-SYSTEM-DESIGN.md`、几何架构文档

**验收**：docs 里每份文档都对应现行项目状态，无过时战略文档。

---

## 第四阶段：P0 安卓

### T11 · Capacitor 安卓壳与 APK

**第一步先做环境检查**：确认 `D:\dev-tools\jdk\jdk-17.0.2` 与
`D:\dev-tools\android-sdk` 在本机是否可用（另一个项目的 README 显示已装）。
**可用则跳过环境下载**，只配 `ANDROID_HOME`；不可用再评估安装方案。

**动作**：
- 安装 `@capacitor/core`、`@capacitor/cli`、`@capacitor/android`
- `npx cap init`，`webDir` 指向 `dist`
- `npm run build` → `npx cap add android` → `npx cap sync`
- 配置 `versionName = 2.0.0`、`versionCode = 1`
- 编译 APK 并安装到手机

**验收**：手机装上 APK，打开能看到搜题页并解出一道题。

**风险**：网络不稳定时 Gradle 依赖下载可能失败，需备镜像。

---

## 第五阶段：P1 语文

### T12 · 自用首页与语文素材展示

**动作**：
- 新建 `src/pages/HomePage.jsx`，`/` 指向它（不再重定向搜题）
- 首页内容：今日素材卡（人物 + 金句，带适用方向标签与可化用句式）、
  「换一批」按钮、作文方向标签入口、四个功能入口
- 新建 `src/pages/MaterialsPage.jsx`：素材库，按方向筛选
- 导航更新：手机底部五项 —— 首页 / 搜题 / 英语 / 素材 / 探索
- **不做推送、不接通知插件**

**验收**：首页正常展示素材；点「坚持积累」能列出该方向全部素材。

---

### T13 · 语文素材内容生产

**动作**：
- 建立 `src/data/composition/characters.json`、`quotes.json`、`topics.js`
- 主题分 10 类：科技与人文、信息辨别与独立思考、青年担当、坚持与积累、
  挫折与成长、传承与创新、平凡与伟大、规则与变通、合作与竞争、审美与生活
- 每条打 2–3 个方向标签，带出处与可化用句式
- **每条必须附 `sources[]`（标题 + URL + 发布方 + 核实日期）与 `verified` 字段**
- `verified: false` 的不上首页

**核实标准**：A 级来源（新华社、人民日报、央视、政府网、教育部、两院官网、
正式出版传记年谱）方可作依据；百科、知乎、公众号只能当检索线索。
引语须为原文，查不到原始出处的名言弃用。

**首批规模**：约 20 条，覆盖最常用的四五个方向，逐条人工复核。

**验收**：随机抽 5 条，能根据 `sources` 链接回溯到权威原文。

---

## 第六阶段：P2 英语

### T14 · 英语精讲

**动作**：
- 新建 `src/services/llm.js`：统一 Key 读取与 DeepSeek 请求，Key 存本机
- 新建 `src/pages/EnglishPage.jsx`：粘贴题目 → 题型识别 → 精讲展示
- 覆盖题型：阅读 C/D 篇（逐句翻译、长难句拆解、选项定位、干扰项分析）、
  七选五（上下文逻辑链）、完形（语境线索与词义辨析）、语法填空（考点归类）
- **精讲结果写 localStorage 缓存，同一材料不重复调用**

**验收**：贴一篇 C 篇能出完整精讲；刷新页面不重复调 AI；无 Key 时有明确提示。

---

### T15 · 生词本

**动作**：
- 生词提取与精讲**合并为同一次 AI 请求**，不单独调用
- 生词标注是否考纲词，加入生词本，支持离线复习与掌握度标记

**验收**：精讲完成后生词自动入本；断网状态下可复习。

---

## 第七阶段：P3 适配

### T16 · 移动端适配

**动作**：3D 探索台触摸手势、解题页小屏布局、按钮触控区域检查。

**验收**：手机上三条核心链路均可单手操作，无横向溢出。

---

## 附：执行纪律

1. **一次只做一张卡**，做完验证再进下一张
2. 删除类操作前先备份到 `%TEMP%`，删除后立即跑测试
3. T8 涉及远程与默认分支，**命令必须先列出再执行**
4. 不做计划外的新功能；有新想法先补进本文档再排期
5. 每完成一个阶段，更新本文档状态栏与 README 更新日志
