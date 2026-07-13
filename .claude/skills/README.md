# Claude Skills 总览

> 本目录包含所有 Claude Code Skills，每个 skill 是一个独立的能力模块。
> 在 Claude 中可以直接通过名称或描述触发对应的 skill。

---

## 📋 目录

- [产品治理类](#产品治理类)
- [开发工作流类](#开发工作流类)
- [核心架构类](#核心架构类)
- [教学功能类](#教学功能类)
- [项目专项类](#项目专项类)

---

## 🏛️ 产品治理类

| Skill | 名称 | 触发场景 | 核心作用 |
|-------|------|---------|---------|
| [老板模式](./founder-os-cn/SKILL.md) | 老板模式 | 需求评审、架构评审、是否值得做 | 价值评估→规格书→架构评审→实施计划，禁止直接编码 |
| [创业过滤器](./startup-founder/SKILL.md) | 创业过滤器 | 新功能立项 | 五问：会用吗？付费？留存？转化？护城河？多数否就不做 |
| [CTO模式](./startup-cto/SKILL.md) | CTO模式 | 跨产品技术决策 | 4个产品共享基础设施，技术选型统一，架构评审 |
| [产品经理](./product-manager/SKILL.md) | 产品经理 | 功能规划、优先级排序 | RICE打分、用户故事、四产品线路线图 |
| [CEO模式](./mathviz-ceo/SKILL.md) | CEO模式 | 功能开发决策 | 五问过滤器，优先题目解析/Workspace/教师模式/PPT导出 |
| [总指挥](./conductor/SKILL.md) | 总指挥 | 多产品上下文切换 | 4个产品间切换、每日巡检、跨产品同步、统一发布 |

---

## ⚙️ 开发工作流类

| Skill | 名称 | 触发场景 | 核心作用 |
|-------|------|---------|---------|
| [自动部署](./auto-upload/SKILL.md) | 自动部署 | "上传"、"部署"、"commit"、"发布" | 检查变更→安全审查→提交→推送→构建部署 |
| [生成Commit](./commit-generator/SKILL.md) | 生成Commit | 提交代码时 | 根据diff生成规范的Conventional Commit消息 |
| [变更分类](./classify-change/SKILL.md) | 变更分类 | 每次commit前 | 自动分类：growth/ui/feat/fix/perf/ci/refactor/infra |
| [工作日志](./work-log/SKILL.md) | 工作日志 | "写日志"、"更新日志"、"日报" | 自动从git commits生成CHANGELOG.md |
| [成本控制](./ai-cost/SKILL.md) | 成本控制 | 每次AI调用 | Flash优先，仅推理/数学切换Pro，追踪每次调用成本 |
| [压缩上下文](./auto-compress/SKILL.md) | 压缩上下文 | 对话过长时 | 自动总结会话，保留关键信息，丢弃已完成内容 |
| [任务路由](./routing/SKILL.md) | 任务路由 | 收到任务时 | 自动判断任务类型、优先级、建议行动 |
| [创建Skill](./skill-creator/SKILL.md) | 创建Skill | 需要造新Skill时 | 需求确认→创建目录→写SKILL.md→验证清单 |
| [GitHub产品模式](./github-product-mode/SKILL.md) | GitHub产品模式 | 修改README/文档时 | GitHub是产品展示层，不是技术文档，面向用户而非开发者 |

---

## 🏗️ 核心架构类

| Skill | 名称 | 触发场景 | 核心作用 |
|-------|------|---------|---------|
| [项目记忆](./memory-system/SKILL.md) | 项目记忆 | 任何修改前 | 维护产品架构一致性，防止设计漂移，冲突则拒绝/调整 |
| [核心调度](./skill-orchestrator/SKILL.md) | 核心调度 | 任何修改前 | 自动判断任务类型，选择对应skill执行，一次只选一个 |
| [SceneIR核心](./scene-ir-core/SKILL.md) | SceneIR核心 | 修改几何/渲染代码时 | AI不得直接控制视觉，所有几何必须从SceneIR派生，确定性输出 |
| [自愈系统](./self-healing/SKILL.md) | 自愈系统 | OCR/AI/数据库异常 | 检测异常自动降级，保证永不崩溃，用户始终看到有意义界面 |
| [自我修复](./self-healing-system/SKILL.md) | 自我修复 | 每次代码变更后 | 检查架构偏离，自动修复UX/SceneIR/Tutor/Auth违规 |
| [访客优先](./auth-guest-mode/SKILL.md) | 访客优先 | 修改登录/会话代码时 | 无需登录即可用核心功能，登录是升级而非门禁，禁止强制注册 |
| [UX收敛](./product-ux-scope/SKILL.md) | UX收敛 | 修改UI/导航/用户流程时 | 单入口、零配置、极简学习流，禁止工具化、禁止暴露配置 |
| [Workspace架构](./workspace-architect/SKILL.md) | Workspace架构 | 开发Workspace功能时 | 状态持久化、操作可回放、步骤可导出，禁止直接生成UI不保存状态 |

---

## 📚 教学功能类

| Skill | 名称 | 触发场景 | 核心作用 |
|-------|------|---------|---------|
| [自适应老师](./learning-tutor-engine/SKILL.md) | 自适应老师 | 修改讲解/步骤/推理代码时 | 动态调整讲解粒度，跟踪学生理解状态，非静态模板 |
| [学习计划](./learning-planner/SKILL.md) | 学习计划 | 生成学习计划时 | 基于掌握度生成7/14/30天路线图，优先薄弱知识点 |
| [试卷分析](./exam-analyzer/SKILL.md) | 试卷分析 | 分析考试结果时 | OCR→错题识别→错误归因→知识点掌握度更新 |
| [学生画像](./student-model/SKILL.md) | 学生画像 | 考试分析后 | 掌握度地图、错误模式、优势劣势、学习趋势 |
| [教师模式](./teacher-mode/SKILL.md) | 教师模式 | 开发教学功能时 | 课堂演示、PPT导出、自动讲稿、动画播放优先 |
| [论文分析](./paper-analyst/SKILL.md) | 论文分析 | "分析论文"、"论文解读"、"组会汇报" | PDF→分类→全文分析→PPT大纲，防幻觉严格标注 |

---

## 🎯 项目专项类

| Skill | 名称 | 触发场景 | 核心作用 |
|-------|------|---------|---------|
| [极简工程](./karpathy-engineer/SKILL.md) | 极简工程 | 日常开发 | 少代码、少抽象、少依赖，最快交付用户价值，不为架构而架构 |
| [规划师](./mathviz-planner/SKILL.md) | 规划师 | 修改代码前 | 先分析当前结构/涉及文件/风险点/实施方案，小步迭代 |
| [UI设计师](./mathviz-ui-designer/SKILL.md) | UI设计师 | 修改界面时 | Linear/Perplexity级设计，极简、排版优先、深色模式优先、拒绝管理后台风格 |
| [移动端审查](./mathviz-mobile/SKILL.md) | 移动端审查 | 修改页面后 | Desktop/Tablet/Mobile三端检查，390px无横向滚动 |

---

## 💡 使用方式

### 在 Claude Code 中触发

1. **按名称触发**：直接说 "使用老板模式"、"启用教师模式"
2. **按描述触发**：描述需求，Claude 会自动匹配相关 skill
3. **自动触发**：部分 skill 在特定场景下会自动激活（如自我修复）

### 命令面板（Ctrl+Esc）

输入中文关键词即可找到对应 skill：
- "老板" → 老板模式
- "部署" → 自动部署
- "设计" → UI设计师
- "分析" → 试卷分析/论文分析

### Skill 命名规范

- 目录名：`kebab-case`（全小写 + 连字符）
- 文件名：`SKILL.md`
- 结构：frontmatter（name, description, model, tools）+ 正文

### 最佳实践

1. 一个 skill 只做一件事
2. description 包含足够的触发关键词
3. 保持 SKILL.md ≤ 50 行，复杂逻辑放 references/
4. 修改代码前先过一遍相关 skill
