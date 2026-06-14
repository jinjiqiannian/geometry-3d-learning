# 几何维度 — 产品重构优先级（纠正版）

> 2026-06-14
> 状态：AI 几何演示工具 → 高中数学 AI 老师
> 当前价值：35/100   目标：80/100

---

## 核心认识

我们不是要建"平台"。
我们是先让一个高中生死活愿意用第二次。

日活 ≈ 0 的时候，所有 Teacher Dashboard / School / 班级管理 / 150模型 / 语音输入 都是幻觉。
那些是**你有了用户之后**才需要的东西，不是**你获取用户**需要的东西。

### 当前真实状况

```
3D 几何可视化    ✅  够用
AI 解题          ✅  能用但贵
工作台           ✅  完成
认证/支付        ✅  完成
安全             ⚠️  修复了但没提交

错题本           ❌  不存在 → 这是留存核心
学习进度         ❌  不存在
题型识别         ❌  不存在 → LLM 裸答
模型路由         ❌  不存在 → 每次从零调用
Learning Engine  ❌  不存在
知识图谱         ❌  不存在 → (但 P0 不需要)
```

---

## 重新排优先级

### P0 — 保命（1-2天）

```
安全修复未提交 × 10 个文件
  └─ 优先于一切
DeepSeek 成本监控
  └─ 加每日硬上限
  └─ 加 Grafana / 简单面板
CI/CD 入库
  └─ 提交 = 自动部署
```

### P1 — 架构地基（1周）

```
核心类型系统重构
  └─ MathModel 接口
  └─ 泛化 ParsedProblem（不再只有几何类型）
  └─ 保持向后兼容

/content/ 目录建立
  └─ JSON Schema
  └─ 模型加载器

AI Provider 抽象
  └─ 不再硬编码 DeepSeek
  └─ 先支持 Flash/Pro 分离

死代码清理
  └─ 17 个未使用组件
  └─ 3 组重复 CSS
  └─ 清理完就提交
```

### P2 — 题型匹配引擎（1周）⭐核心

```
Problem → 分析
  ├─ 本地规则匹配（关键词 + regex）
  │   └─ 7 种题型
  │       ├─ 异面直线夹角
  │       ├─ 线面角
  │       ├─ 二面角
  │       ├─ 截面问题
  │       ├─ 最值问题
  │       ├─ 体积计算
  │       └─ 距离计算
  └─ 置信度 < 0.7 → 调 LLM 辅助
     └─ 便宜模型（Flash）
```

### P3 — 几何模型库（30个）（1-2周）

```
围绕 7 种题型，建立 30 个模型：

异面直线：5 模型
  ├─ 正方体异面直线
  ├─ 长方体异面直线
  ├─ 三棱锥异面直线
  ├─ 平移法构造
  └─ 向量法

线面角：5 模型
二面角：5 模型
截面：  4 模型
最值：  4 模型
体积：  4 模型
距离：  3 模型

每个模型包含：
  ├─ 识别规则
  ├─ 标准解法（本地模板）
  ├─ 3 道例题
  ├─ AI 提示词（用于 LLM 辅助）
  └─ 常见错误
```

### P4 — 错题本（1周）← 留存核心

```
学生做错 → 自动收录
  └─ AI 自动分析：
      ├─ 知识点缺失（匹配到 MathModel）
      ├─ 计算失误
      └─ 审题错误

错题本功能：
  ├─ 按模型分类
  ├─ 按错误原因分类
  ├─ "再做一次"
  ├─ "生成同类题"（调 LLM）
  └─ 掌握后标记

不用做复杂 UI。
三列就够了：题目 | 错误原因 | 操作
```

### P5 — 学习进度（3天）

```
极简版本：

MathModel × Student

状态只有三种：
  ├─ 未学（灰色）
  ├─ 学习中（黄色）
  └─ 已掌握（绿色）

自动推进：
  ├─ 首次遇到 → 学习中
  ├─ 连续 3 次做对 → 已掌握
  └─ 做错 → 标记薄弱
```

### P6 — Learning Engine（2周）⭐核心资产

```
这不是"训练系统"。
这是"自动诊断 + 自动开药方"。

输入：学生行为序列
  └─ 异面直线 做错
  └─ 异面直线 做错  
  └─ 异面直线 做错

输出：
  诊断：空间想象能力不足，异面直线平移法未掌握
  处方：
    1. 回退到「正方体异面直线-基础」模型
    2. 做 Level 1 题 × 3
    3. 做 Level 2 题 × 3
    4. 原题重做

规则系统（第一版）：
  ├─ 同一模型错 3 次 → 降级 + 基础题
  ├─ 连续 5 题正确 → 升级
  ├─ 错题类型集中 → 专项训练
  └─ 全部用本地规则，不调 LLM
```

### P7 — 扩展到函数/导数/数列（3-4周）

```
等 P2-P6 验证了留存和转化，再扩。

扩的方法：
  ├─ 同样的 MathModel 架构
  ├─ 同样的题型匹配引擎
  ├─ 同样的错题本
  └─ 同样的 Learning Engine

新的 content/models/ 目录：
  ├─ function/
  ├─ derivative/
  └─ sequence/

第一版各 10 个模型即可。
```

### P8 — 知识图谱（如果还活着）

```
等到有 1000+ 活跃用户再做。

只做最简单的：
  ├─ 前置关系（"学这个之前需要会什么"）
  └─ 推荐关系（"学完这个可以学什么"）

不做图谱可视化。
不做复杂的图遍历。
一条 SQL 搞定。
```

### P9 — 教师功能（如果有付费）

```
班级管理
学生进度查看
批量导出
```

### P10 — School 版（如果有学校）

```
定制报价
API
私有化部署
```

---

## 模块架构（简化版）

```
┌────────────────────────────────────────────┐
│                  Frontend                   │
│  Workspace │ 错题本 │ 进度 │ 训练          │
├────────────────────────────────────────────┤
│              API Gateway                    │
├──────────┬─────────────────────────────────┤
│ AI       │ Learning Engine                  │
│ Provider │ ├─ Pattern Detector              │
│ Router   │ ├─ Diagnosis Engine              │
│          │ └─ Remediation Planner           │
├──────────┴─────────────────────────────────┤
│              Math Model Engine              │
│  ├─ Model Loader (/content/models/*.json)   │
│  ├─ Type Matcher (规则 + LLM)              │
│  └─ Solution Generator (模板 + AI)         │
├────────────────────────────────────────────┤
│              Content Layer                  │
│  /content/models/geometry/*.json            │
│  /content/examples/geometry/*.json          │
│  /content/training/paths/*.json             │
├────────────────────────────────────────────┤
│              Data Layer                     │
│  Supabase │ (未来 Redis)                   │
└────────────────────────────────────────────┘
```

## 学习引擎 vs 训练系统

```
学习引擎 (Learning Engine)    训练系统 (Training System)
────────────                  ────────────
诊断为主                      执行为主
被动触发（错题驱动）          主动推进（计划驱动）
模式识别                      题海战术
输出：处方                    输出：题目列表

关系：
  学习引擎发现薄弱 → 制定计划 → 训练系统执行
```

---

## 当前代码操作

### 立刻删

```
src/components/AnswerPanel.jsx       # 未使用
src/components/Canvas3D.jsx          # 重复（features/solid-geometry/Canvas3D 在用）
src/components/ControlPanel.jsx      # 重复
src/components/GeometrySelector.jsx  # 重复
src/components/PlaybackControls.jsx  # 未使用
src/components/ProgressHeader.jsx    # 未使用
src/components/StepCard.jsx          # 未使用
src/components/StepList.jsx          # 未使用
src/components/ThemeToggle.jsx       # 未使用
src/components/UserMenu.jsx          # 未使用
src/components/WorkspaceStatusBar.jsx# 未使用
src/components/WorkspaceToolbar.jsx  # 未使用
src/features/solid-geometry/AutoConnect.jsx     # 未使用
src/features/solid-geometry/EdgePropertyPanel.jsx # 未使用
src/features/solid-geometry/LineControlPanel.jsx  # 未使用
src/features/solid-geometry/ParamEditor.jsx      # 未使用
src/features/solid-geometry/ProblemInput.jsx      # 未使用
src/features/solid-geometry/ApiKeySettings.jsx    # 未使用
```

### 立刻提交

```
server/src/config/env.ts
server/src/index.ts
server/src/middleware/rateLimit.ts
server/src/middleware/requirePlan.ts
server/src/routes/ai.ts
server/src/routes/workspace.ts
server/src/services/ai.service.ts
server/src/services/auth.service.ts
server/package.json
server/package-lock.json
```

### 下一步（P1 第一件事）

```
server/src/types/index.ts
  └─ 加 MathModel 接口

/content/
  └─ 创建目录结构

server/src/content/
  └─ modelLoader.ts（读 JSON → 内存）
```

---

## 验证指标

只有 3 个北极星指标：

1. **次日留存 > 20%** → 错题本 + 学习进度 有效
2. **周留存 > 10%** → Learning Engine 有效
3. **付费转化 > 2%** → 证明 Pro 有价值

在这三个指标达标之前，Teacher/School/班级管理/语音/150模型 一概不碰。

---

> 之前的架构文档写得太重。不是功能多就好，是用户离不开才好。
> 这个版本按 P0→P10 逐级交付，每完成一级确认是否继续。
> 
> 现在最该做的事按优先级排列：
> 1. 提交安全修复
> 2. 清理死代码 
> 3. 建 /content/ 目录
> 4. 做题型匹配
