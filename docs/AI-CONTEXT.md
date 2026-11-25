# 项目上下文（给 AI 助手）

> 用途：任何 AI（Claude / 其他）接手这个仓库时，先读这一份，不要盲目遍历。
> 最后更新：2026-11-25

---

## 一句话

个人自用的高中学习工具：**数理搜题讲解 + 3D 可视化 + 语文作文素材**。
原名「几何维度」，2026-11 从商业产品转为自用。

- 仓库：`E:\geometry-3d-learning`
- 分支：`feat/scene-ir-gate`（唯一分支，也是远程默认分支）
- 版本：`2.0.0`
- 形态：Web（Vite）+ 安卓 APK（Capacitor 8 套壳）

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19 + Vite 8，hash 路由 |
| 3D | Three.js + @react-three/fiber + drei |
| 状态 | React Context（Workspace / Theme / Subscription stub / Session stub） |
| 样式 | 原生 CSS + CSS 变量（`src/index.css` 定义主题） |
| 测试 | Vitest + Testing Library，49 文件 / 563 用例 |
| 安卓 | Capacitor 8.6.2，JDK 21 + Android SDK 36 |
| 数据 | 纯 localStorage，无服务端、无账号 |

## 目录地图

```
src/
├── App.jsx                路由表：/ /materials /search /teach /explore
├── index.css              全局样式与主题变量（改配色先看这里）
├── pages/                 页面
├── layouts/               PageLayout：导航 + 内容区（滚动行为在这里）
├── components/            讲解面板、步骤卡、导航等
├── contexts/              全局状态
├── engines/               解题与渲染的核心逻辑（项目最值钱的部分）
│   ├── animationIR/       动画 IR：schema / validate / physicsGate / expr
│   ├── logicIR/           逻辑题 IR 与求解
│   ├── proofEngine/v2/    证明题引擎
│   └── topics/            分学科求解（physics.js 等）
├── features/
│   ├── animation/         动画渲染器与原语
│   └── solid-geometry/    3D 画布、控制面板、测量工具
├── data/
│   ├── curriculum.js      课程结构
│   ├── physicsKnowledge.js 物理知识点（含电学）
│   └── composition/       ★ 语文作文素材（topics / characters / quotes）
├── services/              可选服务（拍照 OCR 等）
└── renderers/             底层渲染封装
```

## 关键文件（按重要度）

| 文件 | 行数 | 作用 |
|---|---|---|
| `src/pages/WorkspacePage.jsx` | 1751 | **解题主界面**，串联解析、步骤、3D、分享 |
| `src/engines/explanationEngine.js` | 1666 | 生成分步讲解（AI + 本地降级） |
| `src/engines/problemParser.js` | 1420 | 自然语言题目 → 结构化数据 |
| `src/engines/calculationEngine.js` | 987 | 数学计算与答案 |
| `src/pages/ExplorePage.jsx` | 298 | 3D 探索台（实时模式，零 AI） |
| `src/pages/TeachPage.jsx` | 207 | 知识点讲解 |
| `src/pages/SearchPage.jsx` | 193 | 搜题入口 |
| `src/pages/MaterialsPage.jsx` | 159 | 作文素材库（按方向筛选） |
| `src/pages/HomePage.jsx` | 144 | 首页（今日素材 + 入口） |
| `src/App.jsx` | 127 | 路由 |
| `src/data/composition/characters.json` | — | 人物素材，带 sources / verified |

## 建议阅读顺序

1. `README.md` —— 怎么跑、当前状态
2. `docs/task-cards.md` —— 正在做什么、验收标准
3. `docs/DECISIONS.md` —— 为什么是现在这样（含踩过的坑）
4. 本文件 —— 代码地图
5. 按任务读具体文件，**不要一次性读全部源码**

## 硬约束（改代码前必须知道）

1. **无账号、无云端、无服务端**。`SupabaseContext` 是本地 stub，`connected` 恒为 false。
2. **数据只存 localStorage**，键名 `jidong_workspaces` / `jidong_history`。
3. **语文素材必须联网核实**：人物事迹与名言须有 A 级来源（新华社、人民日报、
   央视、政府网、教育部、两院官网），带 `sources[]` 与 `verified`；
   查不到原文出处的名言直接弃用，**不得凭记忆生成**。
4. **英语 AI 调用必须带缓存**，同一篇材料不重复计费；Key 只存本机，不进仓库。
5. **安卓打包必须 JDK 21**（Capacitor 8 要求），JDK 17 会报「无效的源发行版: 21」。
6. 每完成一个改动：`npm test` + `npm run build` 全绿才算完成。

## 常见任务 → 该改哪里

| 想做的事 | 改这里 |
|---|---|
| 加作文素材 | `src/data/composition/*.json`（必须带 sources） |
| 调首页布局 | `src/pages/HomePage.jsx` + `.css` |
| 加/改页面路由 | `src/App.jsx` |
| 改导航项 | `src/components/AppNavigation.jsx`、`MobileBottomNav.jsx` |
| 修手机滚动问题 | `src/layouts/PageLayout.css`（注意 CSS 顺序覆盖） |
| 改 3D 渲染 | `src/features/solid-geometry/`、`src/engines/animationIR/` |
| 改解题逻辑 | `src/engines/` 对应引擎 + 同名 `__tests__` |

## 不要碰 / 不要读

- `node_modules/`、`dist/`、`android/build/`、`android/app/build/`、`apk/` —— 产物
- `archive/` —— 旧项目留档，与当前无关
- `.env.local` —— 含本机配置，**不要读取或复制内容**
- `android/app/src/main/assets/public/` —— 由 `cap sync` 生成

## 常用命令

```bash
npm run dev      # http://localhost:5173/
npm run build
npm test

# 打 APK
npm run build && npx cap sync android
cd android
export JAVA_HOME="D:/dev-tools/jdk/jdk-21.0.2"
export ANDROID_HOME="D:/dev-tools/android-sdk"
./gradlew.bat assembleDebug
```

## 已知坑

- 本机 `git` 启动本身约 2 秒，别误判成仓库过大。
- `npx cap sync android` 在清理旧资源时可能报 safe-delete 错误，但**资源仍会复制**；
  打完包务必核对 `assets/public/index.html` 的时间戳。
- CSS 同特异性规则后者覆盖前者——`PageLayout.css` 的移动端滚动问题就是这么来的。
