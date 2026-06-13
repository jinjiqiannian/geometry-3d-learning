# 3D 立体几何学习平台 — 开发日志

> 项目：基于 React + Three.js 的中学立体几何交互式学习工具
> 仓库：feature/geometry-engine
> 作者：Yu Guan

---

## 2026-06-06（周六）— 项目初始化

### Commit: `476476a` `fc6f4e2` — init project

**技术选型：**
- React 19.2.7 + Vite 8.0
- Three.js 0.184 + @react-three/fiber 9.6.1 + @react-three/drei 10.7.7
- 纯客户端渲染，无后端

**项目搭建：**
- `npm create vite@latest` 创建 React 模板
- 安装 three、@react-three/fiber、@react-three/drei
- 配置 vite.config.js（端口 5173，自动打开浏览器）

**初始文件结构：**
```
src/
├── main.jsx          # ReactDOM 入口
├── App.jsx           # 根组件
├── App.css           # 布局样式
├── index.css         # 全局样式
```

---

## 2026-06-07（周日）19:26 — 项目配置完善

### Commit: `f2802b0` — add package.json

**改动：**
- 完善 package.json（名称、描述、关键词、author）
- 添加 start.bat 启动脚本（Windows 一键启动）
- 确认依赖版本锁定

---

## 2026-06-07（周日）22:00 — 基础功能

### Commit: `7b895bb` — 基础功能

**这是项目的核心搭建阶段，完成了以下内容：**

#### 1. 几何引擎 (`src/engines/geometryEngine.js`)
- `createGeometry(type, params)` — 根据类型和参数创建 Three.js BufferGeometry
  - 正方体：BoxGeometry
  - 球体：SphereGeometry
  - 圆柱：CylinderGeometry
  - 圆锥：ConeGeometry
  - 棱锥：自定义 TetrahedronGeometry
  - 棱柱：自定义 ExtrudeGeometry
- `getVertexAndEdgeInfo(type, params)` — 计算每种几何体的顶点坐标、棱边索引、顶点标签
- `calculateVolume(type, params)` — 体积计算
- `calculateSurfaceArea(type, params)` — 表面积计算

#### 2. 3D 画布 (`src/components/Canvas3D.jsx`)
- PerspectiveCamera（fov=50，位置 [4,4,6]）
- OrbitControls（旋转、缩放、平移）
- 半透明白色面渲染（opacity 0.38）
- 顶点标签（drei Text + Billboard）
- 棱边线段渲染（lineBasicMaterial）
- Hover 高亮：鼠标悬停时线段变蓝色
- 网格辅助线（GridHelper，后来被移除）

#### 3. 控制面板 (`src/components/ControlPanel.jsx`)
- 几何体选择（6种：正方体、球体、圆柱、圆锥、棱锥、棱柱）
- 大小滑块（0.5 ~ 5.0）
- 显示选项：实体面/纯线框切换、标签显示开关
- 体积/表面积计算与展示

#### 4. 数学工具 (`src/engines/mathUtils.js`)
- `formatNumber(n)` — 数值格式化

#### 5. 题目生成器 (`src/engines/problemGenerator.js`)
- 随机生成题目（后来被移除/重构）

**已解决的问题：**
- Three.js 与 React 生命周期协调
- 顶点标签 Billboard 始终面向相机
- Canvas 填满父容器的 CSS 布局

---

## 2026-06-07（周日）22:17 — 线条控制系统

### Commit: `80c947d` — 线条控制

**新增了完整的线段分类显示控制系统：**

#### 新增文件

**`src/engines/lineDefinitions.js`**（332行）
- 定义每种几何体的所有重要线段（棱边、对角线、高线等）
- 线段分类体系：
  - `棱` — 所有棱边
  - `底面边` / `顶面边` / `侧棱` — 细分棱边
  - `空间对角线` — 体对角线
  - `面对角线` — 面上的对角线
  - `高线` — 几何体的高
  - `辅助构造线` — 辅助线
- `getLineDefinitions(type, params)` — 返回所有线段定义
- `resolvePoint(label, points)` — 标签→坐标解析
- `textbookDefaults(type)` — 教材模式默认可见线段
- 预设操作：显示全部、隐藏全部、教材模式、仅显示棱、含对角线

**`src/components/LineControlPanel.jsx`**（157行）
- 按分类分组的线段 checkbox 列表
- 分类全选/取消
- 单条线段切换
- Hover 联动：鼠标悬停列表项 → 3D 视图高亮对应线段

**`src/components/LineControlPanel.css`**（137行）
- 分类标题样式
- 线段列表项样式
- Hover 高亮样式

#### 修改文件

**`src/App.jsx`**
- 新增 `visibleLines` 状态（Set 类型）
- 新增 `hoveredLine` 状态
- 切换几何体时重置可见线段为"棱"分类
- 传递新状态给 Canvas3D 和 ControlPanel

**`src/components/Canvas3D.jsx`**
- 线段可见性控制：visibleLines.has(key) 决定是否渲染
- Hover 双向联动：3D 视图 ↔ 控制面板列表
- 非可见线段以极淡色渲染（ghost 模式，opacity 0.18）

**`src/constants.js`**
- 添加 GEOMETRY_NAMES、GEOMETRIES、FORMULAS 常量
- 中文名称映射

---

## 2026-06-07（周日）22:58 — 棱长颜色 + 自动连线

### Commit: `8f806ba` — 改棱长颜色+自动连线

**这是功能最丰富的一次提交：**

#### 新增文件

**`src/engines/lineConnector.js`**（319行）— 自动连线引擎
- `parseVertexPair(input, vertexLabels)` — 解析用户输入的顶点对（支持 A' 撇号标签）
- `parseVertexChain(input, vertexLabels)` — 解析顶点序列，支持顺序连线（如 "ACBD" → A→C→C→B→B→D）
- `detectLineType(fromIdx, toIdx, type, params)` — 自动检测线段类型（棱/面对角线/空间对角线/辅助线）
- `getAutocompleteSuggestions(prefix, vertexLabels, existingKeys)` — 自动补全建议
- `getFaces(type)` — 每种几何体的面定义
- `searchLines(query, allLines)` — 线段搜索过滤
- `generateOperationLines(type, operation, params)` — 一键生成辅助线（对角线、高线、中线）

**`src/components/AutoConnect.jsx`**（170行）
- 文本输入框，输入顶点标签
- 自动补全下拉列表
- 键盘导航（↑↓ Enter Escape）
- 顺序连线支持（输入 "ACBD" 一次性连接多段）
- 消息提示（成功/错误）

**`src/components/AutoConnect.css`**（115行）
- 输入框、按钮、下拉列表、消息提示样式

#### 修改文件

**`src/engines/lineDefinitions.js`** — 样式系统
- 新增 `CATEGORY_STYLES`：每种线段分类的颜色、虚线、透明度
  - 棱/底面边/顶面边/侧棱 → 黑色实线 `#1a1a1a`
  - 空间对角线/面对角线 → 灰色虚线 `#888888`
  - 高线 → 深灰虚线 `#666666`
  - 辅助构造线 → 浅灰虚线 `#aaaaaa`
- 新增 `getLineStyle(category)` — 获取样式
- 新增 `getAllVertexPairs(type)` — 所有可能顶点对

**`src/App.jsx`**
- 新增 `customLines` 状态（用户自定义线段）
- 新增 `shownLengthLabels` 状态（长度标签开关）
- 新增 `searchedLine` 状态（搜索文本）
- `mergedLines` = 预定义 + 自定义（useMemo 合并）
- 切换几何体时重置所有新增状态

**`src/components/Canvas3D.jsx`**
- 按线段分类渲染不同颜色/虚线/透明度
- 自定义线段与预定义线段统一渲染
- 持久长度标签（Billboard Text，中点显示 "AB = 4.00"）
- 搜索高亮（蓝色 `#2979ff`）
- 颜色优先级：Hover > 搜索 > 可见 > 隐藏

**`src/components/LineControlPanel.jsx`**（扩充到 239行）
- 集成 AutoConnect 组件
- 快速工具按钮（连接对角线、作高、作中线）
- 搜索输入框（支持线段 ID、分类中文、关键词）
- 长度标签切换（📏 按钮，每条线独立）
- 自定义线段删除按钮（✕）
- 清除自定义按钮
- 搜索匹配计数

**`src/components/LineControlPanel.css`**（扩充到 148行）
- 子区域标题、工具按钮、搜索框、长度标签、删除按钮样式

---

## 2026-06-08（周一）10:23 — 几何体图标优化

### Commit: `87dccef` — 修改几何体图标

**SVG 图标替换 Emoji：**

#### 图标设计 (`src/components/GeometrySelector.jsx`)
- 新增 `GeoIcon` 组件，28×28 viewBox SVG 图标
- 6种几何体各有独立 SVG 设计（全实线 + 透明度区分前后）：
  - **正方体**：等距透视，后面 0.35 透明度，前面实线 1.2px
  - **球体**：圆 + 赤道椭圆 + 经线椭圆
  - **圆柱**：顶底椭圆 + 两条侧边
  - **圆锥**：底椭圆 + 顶点 + 两条母线 + 中心虚线
  - **棱锥**：平行四边形底面 + 4条侧棱 + 顶点圆点
  - **棱柱**：立式三角形，底面实线 + 顶面透明 + 3条垂直侧棱

#### 图标迭代过程（在本次提交中多次调整）
1. **初版**：Emoji 图标 🟦🔵🔷🔺🔻📐
2. **第二版**：SVG 虚线图标（虚线表示被遮挡边）
3. **第三版**：全实线 SVG（用户反馈"虚线位置不对"）
4. **第四版**：调整正方体视角 → 减小偏移量 (5,5)→(3,3)，更朝中间
5. **第五版**：调整棱锥顶点 x 坐标 14→15，避免边线重叠
6. **第六版**：棱柱侧棱严格垂直，不加宽

#### 其他修复
- **棱柱高线修正**：从"顶点到中心"改为"底面中心到顶面中心"（真正的几何高）
- **正方体顶点重排**：从"前后"排列改为"底面→顶面"排列（ABCD 底面，EFGH 顶面）
- **正方体面中心修正**：front:[0,0,s], back:[0,0,-s], left:[-s,0,0], right:[s,0,0], top:[0,s,0], bottom:[0,-s,0], body:[0,0,0]
- **移除直角标记**：用户要求去掉
- **移除 Hover 提示框**：用户要求去掉光标悬停显示棱长的 Billboard
- **移除网格辅助线**：去掉 GridHelper

#### 样式优化 (`src/components/GeometrySelector.css`)
- 2列网格布局
- 蓝色主题色 `#4A90E2`
- Active 状态蓝色背景
- 图标 28×28 + 标签居中

**当前项目结构：**
```
src/
├── main.jsx
├── App.jsx / App.css
├── index.css
├── constants.js
├── engines/
│   ├── geometryEngine.js      # 3D 几何体创建 + 顶点/边计算
│   ├── lineDefinitions.js     # 线段定义 + 分类 + 样式
│   ├── lineConnector.js       # 自动连线引擎
│   └── mathUtils.js           # 数值格式化
└── components/
    ├── Canvas3D.jsx / .css    # Three.js 3D 渲染
    ├── ControlPanel.jsx / .css # 主控制面板
    ├── GeometrySelector.jsx/.css # 几何体选择器 + SVG 图标
    ├── LineControlPanel.jsx/.css # 线条控制面板
    └── AutoConnect.jsx / .css  # 自动连线输入
```

---

## 2026-06-08（周一）11:00 — 手机端适配 + AI 题目生成 + 拍照功能

### Commit: 手机端适配与 AI 功能

**三项重大功能一次性交付：**

---

### 📱 一、手机端响应式布局

**修改文件：**

**`src/App.css`** — 新增 `@media (max-width: 767px)` 媒体查询
- 手机端纵向堆叠：Canvas 50vh + 控制面板 50vh
- 使用 `dvh` 动态视口单位（适配移动浏览器地址栏）
- Canvas 触摸手势支持 `touch-action: pan-x pan-y pinch-zoom`

**`src/index.css`** — 移动端 body 允许滚动
- 桌面端保持 `overflow: hidden`
- 手机端 `overflow: auto` + `-webkit-overflow-scrolling: touch`
- 添加 `touch-action: manipulation` 禁止双击缩放

**`src/components/ControlPanel.css`** — 移动端控制面板样式
- 宽度 100%，去掉左侧边框
- 所有按钮最小 44px（iOS 触摸标准）
- 滑块加粗到 8px，thumb 加大到 24px
- Checkbox 加大到 20×20

**`src/components/GeometrySelector.css`** — 3列网格
- 手机端 `grid-template-columns: repeat(3, 1fr)`
- 按钮最小高度 64px，图标 32×32

**`src/components/LineControlPanel.css`** — 紧凑线条列表
- 线条列表不限高（跟随页面滚动）
- 分类标题 min-height 44px
- 每条线段 min-height 36px
- 搜索框 min-height 44px

**手机端 Tab 导航**（`ControlPanel.jsx` + `ControlPanel.css`）
- 三个 Tab：📐 图形 | 📏 线段 | 🤖 AI
- 仅在 <768px 显示，sticky 吸顶
- 桌面端全部平铺展开

---

### 🧠 二、AI 题目解析引擎

**新增文件：`src/engines/problemParser.js`**（280行）

**核心函数：**
- `parseProblem(text, apiKey)` — 解析文字题目 → 结构化几何数据
- `parseImage(base64Data, mediaType, apiKey)` — 识别图片中的题目文字
- `parseImageToGeometry(base64Data, mediaType, apiKey)` — 组合调用（图片→文字→几何）
- `validateApiKey(apiKey)` — 测试 API Key 有效性

**工作流程：**
1. 先尝试本地快速匹配（正则关键词，零 API 消耗）
2. 匹配置信度 ≥0.9 直接返回，＜0.9 调用 Claude API
3. Claude API 使用精心设计的 System Prompt 提取结构化数据
4. 返回 `{ type, size, labels, highlightLines, annotations, explanation }`

**本地快速匹配支持：**
- 正方体、球体、圆柱、圆锥、棱锥、棱柱 — 6种几何体关键词
- 自动提取数字参数（棱长、半径、高等）
- 提取顶点标注（如 ABCD-EFGH）

**预设示例题目**（6道）：
- 正方体对角线、球体体积、三棱柱高、棱锥侧棱、圆柱截面、圆锥母线

---

### 📷 三、拍照识别功能

**新增文件：`src/components/CameraCapture.jsx`**（100行）

- 使用 `<input type="file" accept="image/*" capture="environment">` 调用系统相机
- 拍照后显示缩略图预览
- 「识别题目」按钮 → 转 base64 → Claude Vision API 识别文字 → 自动生成 3D 图形
- 支持重拍、文件大小限制（10MB）
- 加载/错误/成功状态提示

**新增文件：`src/components/CameraCapture.css`**（125行）
- 虚线边框拍照按钮区域
- 图片预览 + 操作按钮栏
- 消息提示（错误/状态）

---

### 📝 四、题目输入组件

**新增文件：`src/components/ProblemInput.jsx`**（90行）

- 多行文本输入框（自适应高度）
- Ctrl+Enter 快捷提交
- 「生成图形」按钮 + 加载状态
- 预设示例快捷按钮（点击自动填入）
- 错误/成功消息提示

**新增文件：`src/components/ProblemInput.css`**（135行）
- 聚焦蓝色光晕效果
- 圆角药丸式示例按钮
- 移动端 16px 字体（防止 iOS 自动缩放）

---

### 🔑 五、API Key 管理

**新增文件：`src/components/ApiKeySettings.jsx`**（110行）

- 触发按钮：三态显示（未配置🟠 / 已配置🟢 / 点击设置🔑）
- 弹窗 Modal：输入框 + 显示/隐藏切换
- 「测试连接」按钮：调用 validateApiKey 验证
- 保存/清除/取消操作
- 动画入场效果

---

### 🔧 六、App.jsx 与 ControlPanel.jsx 改造

**`src/App.jsx`** 新增：
- `apiKey` 状态 + localStorage 持久化
- `handleApiKeyChange` — 安全的 localStorage 写入
- `handleGeometryGenerated` — AI 解析结果驱动图形生成
  - 自动切换几何体类型和大小
  - AI 高亮线段 → customLines → 自动可见

**`src/components/ControlPanel.jsx`** 新增：
- 集成 ApiKeySettings、ProblemInput、CameraCapture
- `isMobile` 状态 + resize 监听
- `activeTab` 状态控制手机端 Tab 切换
- 三个面板按 Tab 条件渲染

**当前完整项目结构：**
```
src/
├── main.jsx
├── App.jsx / App.css
├── index.css
├── constants.js
├── engines/
│   ├── geometryEngine.js      # 3D 几何体创建 + 顶点/边计算
│   ├── lineDefinitions.js     # 线段定义 + 分类 + 样式
│   ├── lineConnector.js       # 自动连线引擎
│   ├── problemParser.js       # AI 题目解析引擎 ★新增
│   └── mathUtils.js           # 数值格式化
└── components/
    ├── Canvas3D.jsx / .css    # Three.js 3D 渲染
    ├── ControlPanel.jsx / .css # 主控制面板（含 Tab 导航）
    ├── GeometrySelector.jsx/.css # 几何体选择器 + SVG 图标
    ├── LineControlPanel.jsx/.css # 线条控制面板
    ├── AutoConnect.jsx / .css  # 自动连线输入
    ├── ProblemInput.jsx / .css # AI 题目输入 ★新增
    ├── CameraCapture.jsx / .css # 拍照识别 ★新增
    └── ApiKeySettings.jsx      # API Key 管理 ★新增
```

**新增 6 个文件，修改 6 个文件，构建通过（589 modules, 433ms）**

---

## 技术债务 & 已知问题

| 问题 | 优先级 | 说明 |
|------|--------|------|
| 无测试覆盖 | 中 | 纯手动测试，无单元测试/E2E |
| API Key 纯前端存储 | 中 | 生产环境建议用后端代理 |
| 球体/圆柱/圆锥线段定义较少 | 低 | 曲线体主要靠曲面线框 |
| WebGL lineWidth 限制 | 低 | Windows 上限 1px，通过颜色+透明度模拟 |
| 无错误边界 | 低 | 几何体计算异常时无优雅降级 |
| 移动端拍照需 HTTPS | 注意 | localhost 开发可用，生产部署需 HTTPS |

---

## 环境信息

- **开发环境**：Windows 11 Home China 10.0.22631
- **运行时**：Vite 8.0 + React 19.2.7 + Three.js 0.184
- **AI 服务**：Anthropic Claude API (claude-sonnet-4-6)
- **包管理器**：npm
- **Dev Server**：http://localhost:5175/

---

*最后更新：2026-06-08*
