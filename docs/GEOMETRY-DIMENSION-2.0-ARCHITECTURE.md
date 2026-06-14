# 几何维度 2.0 — 总架构任务书

> 生成日期: 2026-06-14
> 角色: 首席架构师 / AI 教育产品负责人 / CTO

---

## 第一部分：现状致命问题诊断

### ⚠️ 致命问题 1 — 当前架构是 "3D 查看器 + LLM 壳"，不是学习系统

```typescript
// 当前系统的本质：
User Input → LLM → JSON → 3D Render
```

没有知识库、没有模型匹配、没有学习路径、没有自适应、没有错题分析。

当前 `types/index.ts` 的 `ParsedProblem` 只支持几何体参数：

```typescript
export interface ParsedProblem {
  type: 'cube' | 'sphere' | 'cylinder' | /* 9种几何体 */ ...
  size: number
  labels: string[]
  // ...全是几何相关
}
```

**无法表达：**
- 函数极值问题
- 数列通项公式
- 导数单调区间
- 圆锥曲线离心率
- 概率分布

**要在当前架构上扩展到全高中数学，必须重构核心类型系统。**

---

### ⚠️ 致命问题 2 — 内容即代码，非技术人员无法参与

当前所有内容（题目模板、解题步骤、教学提示）都在 `.ts/.jsx` 文件中：

| 内容类型 | 位置 | 谁可编辑 |
|----------|------|----------|
| 几何体模板 | `ai.service.ts` 中的 `generateLocalTemplateSteps` | 仅开发者 |
| AI 提示词 | `ai.service.ts` 中的 `PARSE_SYSTEM_PROMPT` 等 | 仅开发者 |
| 题目示例 | `problemParser.js` 中硬编码 | 仅开发者 |
| 价格配置 | `billing.service.ts` 中硬编码 | 仅开发者 |

**要扩展到 150-200 个数学模型，在代码中维护是不可行的。**
需要 `/content/` 目录作为一等公民，或者使用数据库/JSON 文件管理内容。

---

### ⚠️ 致命问题 3 — LLM 裸答，无模型路由

当前 `POST /api/ai/solve` 的处理流：

```
POST /api/ai/solve
  → parseSchema (zod validate)
  → aiService.solveComplete(text, plan, userId)
    → parseProblem(text)  // 直接调用 DeepSeek Flash
    → generateReasoning(text, parsed, userId) // 按 plan 路由
  → return { parsed, steps }
```

**没有步骤：**
- ❌ 不匹配本地模型库
- ❌ 不查知识图谱
- ❌ 不识别题型
- ❌ 不检索相似例题
- ❌ 不判断难度级别

每次都是"从零开始调用 LLM"。这导致：
- **成本高**: 重复题目反复调用
- **质量不稳定**: LLM 每次输出不同
- **无法迭代改进**: 无法对特定模型的解法做优化
- **无教学策略**: 无法控制按哪种教学方法讲解

---

### ⚠️ 致命问题 4 — 知识图谱完全不存在

代码中没有任何知识图谱的实现。这意味着：

- 无法推荐学习路径
- 无法分析知识点薄弱项
- 无法做前后置知识衔接
- 无法生成个性化学习计划

**零用户粘性的根本原因 — 用户用完即走，没有"留下来"的理由。**

---

### ⚠️ 致命问题 5 — 单一 AI 供应商锁死

```typescript
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'
const FLASH_MODEL = 'deepseek-chat'
const PRO_MODEL = 'deepseek-reasoner'
```

**风险：**
- DeepSeek 宕机 → 全站 AI 功能不可用
- DeepSeek 涨价 → 被迫接受或停服
- DeepSeek API 限流 → 无法扩展用户
- 无法根据不同任务选择最优性价比模型

**建议：** 需要抽象 AI Provider 层，支持多供应商路由 + 故障转移。

---

### ⚠️ 致命问题 6 — 无成本的观测性

`trackCost` 函数存在且记录 token 用量，但：
- 无实时仪表盘
- 无按日/按周/按月成本报告
- 无按用户级别成本分析
- 无成本异常告警
- 无预算限制

**如果没有成本面板，你不知道谁在烧钱。**

---

### ⚠️ 致命问题 7 — 数据库模型不匹配 2.0 架构

当前 Supabase schema 只有 4 张业务表：

```
profiles      — 用户档案
subscriptions — 订阅
usage_records — 使用记录
workspaces    — 工作台
```

**缺失：**
- `math_models` — 数学模型库
- `knowledge_graph` — 知识图谱
- `student_mistakes` — 错题记录
- `learning_progress` — 学习进度
- `content_items` — 内容管理
- `ai_cost_logs` — AI 成本明细（已有 usage_records 但不够细）

---

### ⚠️ 致命问题 8 — 死代码危机（架构混乱的标志）

|||
|---|---|
| 未被使用的组件 | **17 个** |
| 死代码预估行数 | **~4000 行** |
| CSS 重复定义 | **3 组**（Canvas3D, ControlPanel, GeometrySelector） |

这些不是"可以优化的"问题。
它们是**架构治理缺失的症状**。

当团队无法删除旧代码时，新代码的质量会持续下降。

---

### ⚠️ 致命问题 9 — 部署和运维不成熟

| 项目 | 状态 | 影响 |
|------|------|------|
| CI/CD | ✅ Vercel + Railway | 基础可用 |
| 日志聚合 | ❌ 无 | 无法 debug 生产问题 |
| APM/监控 | ❌ 无 | 不知道性能瓶颈 |
| 错误追踪 | ❌ 无 | 不知道用户遇到了什么错误 |
| 数据库迁移 | ⚠️ 手动 | 容易出错 |
| 备份策略 | ❌ 未确认 | 数据丢失风险 |
| 多环境 | ❌ 只有 production | 无法安全测试 |
| Feature Flag | ❌ 无 | 无法灰度发布 |

---

### ⚠️ 致命问题 10 — 商业化壁垒

| 壁垒 | 原因 | 影响 |
|------|------|------|
| **无 PWA / 离线** | 学生在地铁/山区无法使用 | 日活天花板 |
| **无 SSR/SEO** | Google/Baidu 不索引 | 零自然流量 |
| **无分享传播机制** | 不能生成分享卡片/链接 | 零病毒传播 |
| **无教师管理后台** | 教师无法追踪学生 | 教师版无价值 |
| **错题本 = 无** | 学生无法复习薄弱点 | 低留存 |

---

## 第二部分：几何维度 2.0 架构

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend Layer                     │
│  Model Explorer │ AI Tutor │ Training │ Dashboard    │
├─────────────────────────────────────────────────────┤
│                    API Gateway                        │
├────────────────┬────────────────────────────────────┤
│  AI Service    │  Math Model Engine                   │
│  ┌──────────┐  │  ┌──────────┐ ┌──────────────────┐ │
│  │ Provider │  │  │ Model    │ │ Knowledge Graph  │ │
│  │ Router   │  │  │ Library  │ │ Engine           │ │
│  ├──────────┤  │  ├──────────┤ ├──────────────────┤ │
│  │ DeepSeek │  │  │ Pattern  │ │ Node Traversal   │ │
│  │ OpenAI   │  │  │ Matcher  │ │ Path Recommender │ │
│  │ Claude   │  │  ├──────────┤ ├──────────────────┤ │
│  │ Gemini   │  │  │ Solution │ │ Weakness         │ │
│  └──────────┘  │  │ Template │ │ Analyzer         │ │
│                 │  └──────────┘ └──────────────────┘ │
├────────────────┴────────────────────────────────────┤
│                    Content Layer                      │
│  /content/models │ /content/examples │ /content/training│
├─────────────────────────────────────────────────────┤
│                    Data Layer                         │
│  Supabase │ Redis │ File Storage (images/math)       │
└─────────────────────────────────────────────────────┘
```

### 2.2 数学模型库

这是 2.0 架构的核心。不是数据库表，而是**兼具 Schema 定义 + JSON 内容 + AI 提示词**的一等公民。

```typescript
// 新的核心类型 — 通用数学问题模型
interface MathModel {
  id: string                   // 'func-quadratic-extremum'
  title: string                // '二次函数极值问题'
  category: ModelCategory      // 'function' | 'derivative' | 'sequence' | 'geometry-3d' | 'conic' | ...
  difficulty: 1 | 2 | 3 | 4 | 5  // 对应 Level 1-5
  
  // 识别规则
  recognition: {
    keywords: string[]         // ['极值', '最大值', '最小值']
    patterns: string[]         // 正则模式匹配
    requiresLLM: boolean      // 是否需要 LLM 辅助确认
  }
  
  // 解题方法
  methods: SolutionMethod[]
  
  // 常见陷阱
  traps: string[]
  
  // 前置知识
  prerequisites: string[]     // 需要掌握的其他 model IDs
  
  // 后续知识
  nextModels: string[]        // 学完这个可以学的
  
  // 例题
  examples: Example[]
  
  // AI 教学提示词
  aiPrompts: {
    solve: string
    tutor: string
    socratic: string
    hint: string
    variant: string
  }
}

type ModelCategory =
  | 'function'        // 函数
  | 'derivative'      // 导数
  | 'sequence'        // 数列
  | 'geometry-3d'     // 立体几何
  | 'conic'           // 圆锥曲线
  | 'probability'     // 概率
  | 'statistics'      // 统计
  | 'vector'          // 向量
  | 'complex'         // 复数
  | 'inequality'      // 不等式
```

### 2.3 第一阶段模型库规划（150 个核心模型）

```
Category          Count     Priority   Cover
─────────────────────────────────────────────
函数              35        P0         函数性质、图像变换、复合函数、零点问题
导数              30        P0         单调性、极值、切线、不等式证明
数列              20        P0         通项、求和、递推、放缩
立体几何          25        ✅(现有)   角度、距离、体积、截面 (需重构匹配新架构)
圆锥曲线          25        P1         椭圆、双曲线、抛物线、综合
概率统计          10        P1         排列组合、概率分布、期望方差
向量/复数         5         P2         向量运算、复数几何意义
合计              150       -          覆盖高考 70%+ 压轴题
```

### 2.4 AI Provider 抽象层

```typescript
interface AIProvider {
  name: string
  model: string
  
  // 核心调用
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>
  
  // 流式
  stream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatResponse>
  
  // 成本
  cost(tokensIn: number, tokensOut: number): number
  
  // 健康检查
  health(): Promise<boolean>
}

// 路由策略
type RoutingStrategy = 
  | { type: 'cost-priority' }     // 最便宜的可用
  | { type: 'quality-priority' }   // 质量最高的可用
  | { type: 'fallback' }           // 主 → 备 → 备
  | { type: 'model-specific', model: string }  // 指定模型
```

**支持的供应商（按接入优先级）：**

| 供应商 | 模型 | 用途 | 成本 |
|--------|------|------|------|
| DeepSeek | chat (Flash) | 解析、分类、简单推理 | ~$0.14/M tokens |
| DeepSeek | reasoner (Pro) | 复杂推理、教学 | ~$0.55/M tokens |
| OpenAI | GPT-4o-mini | Flash 备选 | ~$0.15/M tokens |
| OpenAI | GPT-4o | Pro 备选 | ~$2.50/M tokens |
| Claude | Sonnet 4 | 教学场景优选 | ~$3.00/M tokens |
| Claude | Haiku 4.5 | 快速分类 | ~$0.80/M tokens |

### 2.5 解题引擎流（替换当前裸调用）

```
User Problem Input
  ↓
[Step 1] 问题分类器
  → 本地规则匹配（关键词 + 正则）
  → 置信度 > 0.9 → 直接确定 Model
  → 置信度 < 0.9 → 调用 Flash 模型辅助分类
  ↓
[Step 2] 模型匹配
  → 确定 MathModel.id
  → 加载模型配置（解法模板、提示词）
  ↓
[Step 3] 解法生成
  → 有标准解法 → 从模板库加载并参数化
  → 无标准解法 → 调用 Pro 模型生成 + 人工审核标记
  ↓
[Step 4] 教学策略选择
  → 用户请求模式（直接讲/苏格拉底/分步提示）
  → 加载对应 aiPrompt
  ↓
[Step 5] 输出
  → 解法 + 讲解 + 变式题 + 相关模型推荐
```

### 2.6 知识图谱

```
Model Node ──belongs_to──▶ Topic Node
     │                         │
     │                         │
     ▼                         ▼
Question Node ◀──tests──▶ Skill Node
     │                         │
     │                         │
     ▼                         ▼
Mistake Node ◀──caused_by──▶ Mistake Node

关系类型:
  prerequisites: A → B  (A 是 B 的前置知识)
  strengthens:   A → B  (学 A 可以加强 B)
  similar:       A ↔ B  (A 和 B 是同类问题)
  harder:        A → B  (B 比 A 更难)
  variant:       A → B  (B 是 A 的变式)
```

### 2.7 数据库设计

```sql
-- 新增表

-- 数学模型定义
CREATE TABLE math_models (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  difficulty  INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  metadata    JSONB DEFAULT '{}',     -- 识别规则、方法、陷阱等
  ai_prompts  JSONB DEFAULT '{}',     -- 各模式下的提示词
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 例题
CREATE TABLE examples (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    TEXT REFERENCES math_models(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,           -- 题目内容（支持 LaTeX）
  solution    JSONB NOT NULL,          -- 解题步骤
  difficulty  INT DEFAULT 3,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 知识图谱边
CREATE TABLE knowledge_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     TEXT NOT NULL,         -- model_id | topic_id | skill_id
  target_id     TEXT NOT NULL,
  relation_type TEXT NOT NULL,         -- 'prerequisites' | 'strengthens' | 'similar' | 'harder' | 'variant'
  weight        REAL DEFAULT 1.0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 错题记录
CREATE TABLE student_mistakes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id      TEXT REFERENCES math_models(id),
  problem_text  TEXT NOT NULL,
  user_answer   TEXT,
  correct_answer TEXT,
  mistake_type  TEXT NOT NULL,         -- 'concept' | 'calculation' | 'reading' | 'method'
  reason        TEXT,                   -- AI 分析原因
  difficulty    INT,
  reviewed      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 学习进度
CREATE TABLE learning_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id      TEXT REFERENCES math_models(id),
  status        TEXT DEFAULT 'not_started',  -- 'not_started' | 'learning' | 'mastered' | 'needs_review'
  attempts      INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, model_id)
);
```

### 2.8 内容目录结构

```
/content/
├── models/                    # 数学模型定义
│   ├── function/
│   │   ├── quadratic-extremum.json
│   │   ├── cubic-monotonicity.json
│   │   └── function-composition.json
│   ├── derivative/
│   ├── sequence/
│   ├── geometry-3d/
│   ├── conic/
│   └── ...
├── examples/                  # 例题库
│   ├── function-quadratic-extremum/
│   │   ├── basic-001.json
│   │   ├── medium-001.json
│   │   └── hard-001.json
│   └── ...
├── knowledge-graph/           # 知识图谱
│   ├── edges.json
│   └── categories.json
└── training/                  # 训练计划
    ├── paths/
    │   ├── gaokao-1.json      # 高考一轮复习
    │   └── gaokao-2.json      # 高考二轮复习
    └── levels/
        ├── level-1-basic.json
        ├── level-3-hard.json
        └── ...
```

### 2.9 API 设计（增量）

```
现有 API (保持兼容)
├── POST /api/ai/parse       ← 保留，内部改用 Model Router
├── POST /api/ai/reason      ← 保留，内部改用 Model Router
├── POST /api/ai/visualize   ← 保留
├── POST /api/ai/solve       ← 保留，内部改用 Model Router
├── POST /api/ai/narrate     ← 保留
├── POST /api/workspace/*    ← 保留
├── POST /api/auth/*         ← 保留
├── POST /api/billing/*      ← 保留

新增 API
├── GET  /api/models                    # 数学模型列表
│   └── ?category=function&difficulty=3
├── GET  /api/models/:id                # 模型详情
├── POST /api/models/match              # 问题→模型匹配
├── GET  /api/models/:id/examples       # 模型例题列表
├── GET  /api/knowledge-graph           # 知识图谱查询
│   └── ?modelId=xxx&depth=2
├── POST /api/training/plan             # 生成学习计划
│   └── { targetModel, currentLevel, weakModels }
├── POST /api/training/recommend        # 推荐下一题
├── POST /api/mistakes/analyze          # AI 错题分析
├── GET  /api/mistakes                  # 错题列表
├── GET  /api/progress                  # 学习进度
└── GET  /api/progress/weaknesses       # 薄弱项分析
```

### 2.10 前端新增页面

```
现有页面 (保留)
├── WorkspacePage      ← 核心工作台
├── LandingPage        ← 落地页
├── PricingPage        ← 定价
├── ProfilePage        ← 个人中心
├── SettingsPage       ← 设置
└── HistoryPage        ← 历史记录

新增页面
├── ModelExplorer      ← 数学模型浏览器（新增）
│   ├── 按类别筛选
│   ├── 按难度筛选
│   └── 模型详情 + 例题预览
├── AITutor            ← AI 教学对话界面（新增）
│   ├── 多模式切换（讲解/引导/提示）
│   ├── 语音输入
│   └── 3D 联动（几何题）
├── TrainingCenter     ← 智能训练中心（新增）
│   ├── 学习路径
│   ├── 每日推荐
│   └── 难度自适应
├── MistakeCenter      ← 错题中心（新增）
│   ├── AI 错因分析
│   ├── 同类题推荐
│   └── 薄弱项雷达图
├── TeacherDashboard   ← 教师仪表盘（新增，Teacher plan）
│   ├── 班级管理
│   ├── 学生进度
│   └── 课堂报告
└── ProgressDashboard  ← 学习数据仪表盘（新增）
    ├── 掌握度热力图
    ├── 学习时间分布
    └── 能力雷达图
```

### 2.11 商业化四层体系

| 层级 | 价格 | AI 模型 | 每日次数 | 核心功能 |
|------|------|---------|----------|----------|
| Free | ¥0 | Flash | 3 次/日 | 基础解析 + 3D 可视化 |
| Pro | ¥19/月 | Flash → Pro | 不限 | 完整 AI 教学 + 错题本 + 训练 |
| Teacher | ¥29/月 | Pro | 不限 | 班级管理 + 课堂模式 + PPT |
| School | 定制 | Pro 优先 | 不限 | 全校部署 + API + 数据看板 |

---

## 第三部分：增量开发路线图

### Phase 0 — 即时修复（1-3 天）

```
优先级：P0
目标：安全 + 可部署状态
```

- [ ] 提交 10 个未 commit 的安全修复
- [ ] 清理乱码文件
- [ ] 修复 .env.example 缺失 SUPABASE_ANON_KEY
- [ ] 配置 Railway 环境变量
- [ ] 添加 AI 成本每日上限（防止 runaway cost）

### Phase 1 — 核心架构升级（2-3 周）

```
优先级：P0
目标：建立数学模型引擎基础
```

- [ ] 核心类型系统重构（MathModel、泛化 ParsedProblem）
- [ ] `/content/` 目录建立 + JSON Schema 定义
- [ ] 数学模型加载器（从 JSON 文件 → 内存）
- [ ] 问题→模型匹配引擎（规则 + LLM 混合）
- [ ] 模型路由替代裸 LLM 调用
- [ ] AI Provider 抽象层（多供应商支持）
- [ ] 新增数据库表（math_models, knowledge_edges, student_mistakes）
- [ ] 迁移现有 9 种几何体为 MathModel 格式

### Phase 2 — 知识图谱（2-3 周）

```
优先级：P0
目标：学习路径推荐 + 薄弱项分析
```

- [ ] 知识图谱数据模型
- [ ] 图谱编辑工具（或 JSON 维护）
- [ ] Node 遍历 API
- [ ] 学习路径推荐算法
- [ ] 前置知识检查
- [ ] 薄弱项分析引擎

### Phase 3 — 模型库建设（3-4 周）

```
优先级：P0
目标：150 个核心模型
```

- [ ] 函数模型库（35 个，P0）
- [ ] 导数模型库（30 个，P0）
- [ ] 数列模型库（20 个，P0）
- [ ] 立体几何模型迁移（25 个，现有内容）
- [ ] 圆锥曲线模型库（25 个，P1）
- [ ] 模型测试验证（每个模型至少 3 道验证题）

### Phase 4 — AI Tutor（2-3 周）

```
优先级：P0
目标：多模式 AI 教学
```

- [ ] AI Tutor 对话界面
- [ ] 6 种教学模式
- [ ] 语音输入（Web Speech API）
- [ ] 流式输出（SSE）
- [ ] 上下文管理
- [ ] 教学策略选择

### Phase 5 — 训练系统（2-3 周）

```
优先级：P1
目标：自适应训练
```

- [ ] 训练计划引擎
- [ ] 难度自适应算法
- [ ] 每日推荐
- [ ] 错题 → 同类题生成
- [ ] Level 1-5 训练模式

### Phase 6 — 前端新页面（3-4 周）

```
优先级：P1
目标：用户可见的新功能
```

- [ ] Model Explorer
- [ ] Training Center
- [ ] Mistake Center
- [ ] Progress Dashboard
- [ ] Teacher Dashboard

### Phase 7 — 商业化增强（2 周）

```
优先级：P1
目标：增长 + 转化
```

- [ ] PWA 离线支持
- [ ] SEO（SSR 或 pre-render）
- [ ] 分享卡片/链接
- [ ] 教师班级管理
- [ ] 错题本导出

---

## 第四部分：架构决策记录

### ADR-1：增量开发，不重构现有代码

**决定：** 保留现有 WorkspacePage 和 3D 渲染管线。新功能作为独立模块开发。

**原因：**
- 现有 3D 几何功能已经工作且测试通过
- 新架构是"在现有系统旁边"建立新系统，不是替换
- 通过 `/api/models/match` 桥接新旧系统
- 新页面通过 React Router 新路由添加，不修改现有路由

### ADR-2：内容优先于数据库

**决定：** 数学模型库使用 `/content/models/*.json` 文件，而非数据库表为主存储。

**原因：**
- Git 管理内容变更 → 可审查、可回滚、可协作
- 无需数据库即可本地开发
- 支持非技术成员通过 PR 提交模型
- 数据库作为运行时缓存，源文件作为真相来源

### ADR-3：模型匹配使用"规则 + LLM"混合策略

**决定：** 先用本地规则匹配（关键词 + 正则），低置信度再调 LLM。

**原因：**
- 60% 以上的题目可以通过规则匹配
- LLM 调用有成本（$0.001-0.01/次）和延迟（1-3s）
- 规则匹配可以离线测试和迭代
- LLM 作为模糊匹配的兜底

### ADR-4：AI 供应商抽象层

**决定：** 所有 LLM 调用通过 AIProvider 接口，支持多供应商路由。

**原因：**
- 解绑单一供应商风险
- 不同任务使用最优性价比模型
- 故障转移能力
- 成本路由（便宜模型做简单任务）

### ADR-5：知识图谱用边列表，不用图数据库

**决定：** 初期使用 `knowledge_edges` 表 + 应用层遍历，不引入 Neo4j。

**原因：**
- 150 个模型的知识图谱规模很小（约 500-1000 条边）
- PostgreSQL + 应用层遍历足够
- 减少基础设施复杂度
- 后期可迁移到专用图数据库

---

## 第五部分：风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 模型库建设耗时超预期 | 高 | 中 | MVP 仅 30 个模型，迭代扩充 |
| LLM 分类准确率低 | 中 | 高 | 规则优先 + 人工反馈闭环 |
| 用户不愿付费 | 中 | 高 | Free 体验完整，付费为 AI 无限量 |
| 竞品抄袭 | 高 | 中 | 3D 技术壁垒 + 内容壁垒（150 模型） |
| AI 成本失控 | 中 | 高 | 预算上限 + 模型路由 + 缓存 |
| 团队无法同时维护新旧系统 | 中 | 中 | 明确"旧系统只修不增"政策 |
| 内容质量不稳定 | 高 | 中 | 每模型带测试题 + AI 验证 |
| 教师版用户获取难 | 高 | 低 | Phase 7 以后才发力教师市场 |

---

## 第六部分：关键指标

| 指标 | 当前 | 2.0 目标 |
|------|------|----------|
| 数学模型数 | 9 种几何体 | 150+ |
| 支持题型 | 立体几何 | 全高中数学 |
| 测试覆盖率 | 91 tests | 500+ tests |
| AI 成本/用户/月 | 不可知 | < ¥0.5/活跃用户 |
| 知识图谱 | ❌ 无 | 500+ 节点/边 |
| 错题本 | ❌ 无 | AI 智能分析 |
| 学习路径 | ❌ 无 | 自适应推荐 |
| SSR/SEO | ❌ 无 | 首页 SEO 友好 |
| PWA | ❌ 无 | 离线可用 |
| 月活跃用户目标 | - | 10,000 |

---

*本架构文档应随开发进展持续更新。每次增加新模型或新功能时，更新对应章节。*
