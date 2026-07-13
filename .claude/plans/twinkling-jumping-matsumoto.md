# 工作台解题体验改造计划

## Context

用户反馈工作台解题部分存在 5 个核心问题：
1. **解析功能混乱** — 讲解面板信息层级不清晰，步奏隐藏太深
2. **图形辅助作用低** — 3D 场景切换步奏时没有过渡动画，视觉反馈差
3. **想要过渡动画** — 步奏切换时 3D 场景要有平滑动画（相机飞行、高亮渐变）
4. **不符合学生口味** — 画面和解题过程不够贴近学生
5. **按钮互动混乱** — 导航按钮不够直观

## 设计原则

- **StepList 是核心视图**，不是折叠隐藏的辅助信息
- **3D 动画**全部使用现有 Three.js + useFrame 实现，不引入新依赖
- **信息层级扁平化**：题目 → 核心思路 → 步奏时间线 → 答案
- **学生视角**：步奏标题更具体、步奏卡片有完成状态、按钮有图标

---

## Phase 1: 基础 Bug 修复（4 个文件）

### 1.1 修复 `apiKey` 闭包过期 [WorkspacePage.jsx]
- `handleParseProblem` 的依赖数组 `[loading, recordUsage]` 缺少 `apiKey`
- 导致 `generateAIExplanation` 永远不会被调用，始终回退到本地引擎
- **修复**: 将 `apiKey` 加入依赖数组

### 1.2 修复 CoreIdeaCard 永远不显示 [CoreIdeaCard.jsx, explanationEngine.js]
- CoreIdeaCard 读取 `step.why?.intuition`，但步奏对象没有 `why` 字段
- **修复**: 使用步奏第一条 observation 的内容作为回退
- 同时在 `generateLocalSteps` 中为第一个步奏注入 `intuition` 字段

### 1.3 移除永不显示的 ConceptCard/CommonMistakes [ExplanationPanel.jsx]
- 这两个组件依赖 `parsedData?.knowledgePoints?.length > 0`，但本地 parser 从未设置该字段
- **修复**: 移除导入和渲染分支，保留文件供后续使用

### 1.4 优化 `questionType` 传递 [explanationEngine.js]
- `generateLocalSteps` 原本会重新调用 `detectProblemType`，可能得到与 parser 不同的结果
- **修复**: 优先使用 `parsedData.subType` 映射到 `questionType`

---

## Phase 2: 讲解面板重构（6 个文件）

### 2.1 重排渲染顺序 + 合并答案区域 [ExplanationPanel.jsx, .css]
- **新顺序**: `ProgressHeader → 题目 → 核心思路 → 步奏时间线(默认展开) → 答案(合并) → 播放控件 → 追问 → AI推理`
- 步奏时间线默认展开，不再藏在 `<details>` 里
- 合并 AnswerBanner 和 AnswerPanel 为一个 AnswerSection，仅在 conclusion 步奏显示
- 移除重复的答案展示

### 2.2 三步奏状态卡片 [StepCard.jsx, .css]
- **completed**（已完成的步奏）: 绿色勾 + 绿色边框
- **current**（当前步奏）: 强调色背景 + 发光效果
- **pending**（未到步奏）: 灰色 + 低透明度
- 新增类型徽章: `观察`/`构造`/`计算`/`结论` 彩色标签
- 有公式时显示公式卡片

### 2.3 学生友好化步奏标题 [explanationEngine.js]
- `makeTeacherTitle` 现在接收 `problemText` 参数
- 根据题目关键词生成更具体的标题（如检测到"对角线" → "找到正方体中的体对角线"）
- 标题池扩充为更自然的老师口吻

### 2.4 清理死代码 [ExplanationPanel.jsx, .css]
- 移除 ConceptCard/CommonMistakes 导入
- 移除 AnswerBanner 导入（已被 AnswerSection 替代）
- 知识点标签改为 CSS 类，移除内联样式

---

## Phase 3: 3D 过渡动画（2 个核心文件）

**核心原则**: 不引入新依赖，全部使用 three.js + @react-three/fiber 的 `useFrame` 实现

### 3.1 步奏切换相机自动飞行 [Canvas3D.jsx, WorkspacePage.jsx]
- 每类步奏有对应的相机预设:
  - `observation` → `[4, 4, 6]` 全景
  - `construction` → `[2.5, 2, 3.5]` 近景
  - `calculation` → `[1, 3, 5]` 侧视
  - `conclusion` → `[5, 3, 5]` 宽视角
- 使用 `camera.position.lerp` 在 `useFrame` 中实现平滑飞行（阻尼系数 0.06）
- 从 WorkspacePage 传入 `cameraTarget` prop

### 3.2 高亮边淡入/淡出 [Canvas3D.jsx]
- 现有系统只支持淡入（400ms easeOutCubic）
- 新增 `fadeOutHighlights` ref Map 跟踪被移除的高亮边
- 淡出 300ms，然后从渲染中完全移除

### 3.3 面不透明度平滑过渡 [Canvas3D.jsx]
- 新增 `animatedFaceOpacity` state + `targetFaceOpacityRef`
- useFrame 中每帧向目标值插值（阻尼系数 0.06）
- transitionTick 触发 React 重渲染

### 3.4 辅助线淡入淡出 [Canvas3D.jsx]
- 新增 `auxAnimData` ref Map 跟踪每条辅助线的不透明度
- 新辅助线从 0 → 0.7（300ms）
- 被移除的辅助线从当前值 → 0（200ms）

---

## Phase 4: 导航与交互优化（4 个文件）

### 4.1 可视化步奏点指示器 [PlaybackControls.jsx, .css]
- 使用圆点替代纯文本 "1/5"
- completed = 实心绿点、current = 发光强调色点、pending = 空心圆
- 步奏 ≤ 10 时圆点可点击跳转
- 按钮改为图标+文字: `◀ 上一步` | `▶ 自动演示` | `下一步 ▶`

### 4.2 键盘快捷键 [WorkspacePage.jsx]
- `←` 上一步 / `→` 下一步
- `Space` 播放/暂停
- 输入框中不触发

### 4.3 自动滚动 [WorkspacePage.jsx, ExplanationPanel.jsx]
- 步奏切换时自动滚动讲解面板到当前步奏卡片
- 使用 `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
- 自动回放模式下 conlusion 步奏自动暂停（5s 延时）

---

## 修改文件清单

| # | 文件 | 修改类型 |
|---|------|---------|
| 1 | `src/pages/WorkspacePage.jsx` | Bug 修复 + 新 prop/camera/键盘快捷键 |
| 2 | `src/components/ExplanationPanel.jsx` | 结构重排 + 合并答案 + 移除死代码 |
| 3 | `src/components/ExplanationPanel.css` | 新布局样式 |
| 4 | `src/components/StepCard.jsx` | 三状态 + 类型徽章 + 公式显示 |
| 5 | `src/components/StepCard.css` | 新卡片样式 + 动画 |
| 6 | `src/components/PlaybackControls.jsx` | 圆点指示器 + 图标按钮 |
| 7 | `src/components/PlaybackControls.css` | 新按钮 + 指示器样式 |
| 8 | `src/features/solid-geometry/Canvas3D.jsx` | 相机飞行 + 淡入淡出 + 面不透明度插值 + 辅助线动画 |
| 9 | `src/engines/explanationEngine.js` | 学生化标题 + questionType 修复 + intuition 注入 |
| 10 | `src/components/explanation/CoreIdeaCard.jsx` | 数据源修复 |
| 11 | `src/components/StepList.jsx` | 可选微调（data-step-index 属性） |
| 12 | `src/pages/WorkspacePage.css` | 移动端优化 |

## 不修改但可删除的引用

| 文件 | 操作 |
|------|------|
| `src/components/explanation/AnswerBanner.jsx` | 不再导入（被 AnswerSection 替代），保留文件 |
| `src/components/explanation/ConceptCard.jsx` | 不再导入，保留文件 |
| `src/components/explanation/CommonMistakes.jsx` | 不再导入，保留文件 |

## 验证方式

1. **点击示例题目 "正方体对角线"** — 应看到步奏时间线展开显示 4 个步奏
2. **切换步奏** — 3D 场景应平滑过渡（相机飞行 600ms、高亮淡入 400ms、面不透明度 500ms）
3. **步奏状态** — 已看步奏变绿、当前步奏高亮、未到步奏灰色
4. **键盘快捷键** — ← → Space 可用
5. **自动回放** — 从第一步自动播到最后，conclusion 步奏暂停更久
6. **手机 390px** — 无横向滚动，按钮可点击，3D 不溢出
