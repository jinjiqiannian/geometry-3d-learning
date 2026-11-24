# 即懂 · 自用学习工具

个人自用的学习工具：**数理搜题讲解 + 3D 可视化**，正在扩展语文作文素材与英语精讲。
无账号体系、无云端同步、无商业化，数据全部留在本机。

| 项 | 值 |
|---|---|
| 形态 | Web（Vite 构建）→ 规划中：安卓 APK |
| 数据 | 纯本地 localStorage，不上传 |
| 当前版本 | **v2.0.0**（自用版起点） |
| 仓库 | https://github.com/jinjiqiannian/geometry-3d-learning |
| 主分支 | `feat/scene-ir-gate` |

> v1.x 是面向公众的商业产品阶段，已终止。v2.0.0 起转为个人自用，
> 移除了账号、订阅、支付、反馈后台与服务端，只保留真正会用的功能。

---

## 当前状态

```
npm run build   -> ✓ built in 1.91s，dist 约 2.0 MB
npm test        -> 48 files / 558 tests passed
```

**已完成**：搜题解题、知识讲解、3D 探索台
**规划中**：自用首页与语文作文素材（P1）、英语精讲与生词本（P2）、安卓 APK（P0）

执行计划与验收标准见 [`docs/task-cards.md`](docs/task-cards.md)。

---

## 已实现的功能

### 搜题解题（`#/search`，默认首页）

- 粘贴题目 → 解析 → 分步讲解 + 3D 图示
- 覆盖立体几何、导数、圆锥曲线、排列组合与部分物理题
- 解析优先走本地引擎，AI 为可选增强；认不出的形状明确提示，不静默画错
- **怎么验证**：输入「正方体棱长为 2，求体对角线长度」，应得到 `2√3` 与分步推导

### 知识讲解（`#/teach`）

- 按教材章节浏览知识点与例题
- 物理部分含必修第三册电学内容（欧姆定律、闭合电路、多用电表）
- **怎么验证**：进入物理 → 必修第三册 → 欧姆定律，能看到例题与讲解

### 3D 探索台（`#/explore`）

- 手动旋转、缩放几何体，观察棱、面、对角线与夹角
- 动画系统基于自研 IR：AI 只产出结构化描述，渲染前过校验闸门
- **怎么验证**：打开探索台，拖动应能旋转模型且无控制台报错

---

## 规划中的功能

| 功能 | 说明 | 阶段 |
|---|---|---|
| 语文作文素材 | 首页展示人物实例与金句，按新高考方向分类；**每条须联网核实权威来源** | P1 |
| 英语精讲 | 阅读 C/D 篇、七选五、完形、语法填空；带结果缓存与生词本 | P2 |
| 安卓 APK | Capacitor 套壳，本地打包侧载 | P0 |

**暂不做**：iOS（需 macOS）、账号体系、推送通知、会员与支付。

---

## 环境

| 项 | 值 |
|---|---|
| Node | v22.22.2 |
| npm | 10.9.7 |
| 开发地址 | http://localhost:5173/ |

安卓打包环境待确认（另一个项目曾使用 `D:\dev-tools` 下的 JDK 17 与 Android SDK）。

---

## 怎么构建

```bash
npm install
npm run dev        # 开发，http://localhost:5173/
npm run build      # 生产构建到 dist/
npm test           # 单元测试
```

路由使用 hash 模式，地址形如 `/#/search`。

---

## 目录结构

```
src/
├── pages/            SearchPage / TeachPage / ExplorePage / WorkspacePage
├── engines/          解题引擎（本地计算、物理、证明、逻辑 IR）
│   └── animationIR/  动画 IR：schema / validate / physicsGate / expr / clock
├── features/         3D 画布、控制面板、测量工具、动画渲染器
├── components/       讲解面板、步骤卡、导航
├── contexts/         本地会话 stub、工作区、主题
├── data/             课程与物理知识内容
└── services/         拍照 OCR 等可选服务
docs/
├── task-cards.md     自用化改造任务卡（执行依据）
├── ANIMATION-SYSTEM-DESIGN.md
└── CHANGELOG.md
```

---

## 数据与隐私

- 历史与设置存浏览器 localStorage，清缓存会丢失
- AI 功能（规划中）使用自己的 API Key，**只存本机，绝不提交进仓库**
- 仓库内 `.env.local` 含本机配置，不读取、不复制、不写入文档

---

## 文档索引

| 文件 | 作用 |
|---|---|
| `docs/task-cards.md` | 16 张任务卡与验收标准，改造按它推进 |
| `docs/ANIMATION-SYSTEM-DESIGN.md` | 动画 IR 分层设计 |
| `docs/CHANGELOG.md` | 开发记录 |
| `AGENTS.md` | 给 AI 助手的工程约定 |
