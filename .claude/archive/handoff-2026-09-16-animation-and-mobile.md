# 交接：动画系统 + 移动端上架（2026-09-16）

> **⚠️ 已归档（2026-09-20）——本文档描述的状态已过时，请勿据此判断现状。**
>
> - 本文写作时称「设计未定稿，一行代码都没写」「唯一阻塞是 IR 方案 vs 沙箱待拍板」。
>   这两条**均已失效**：设计已定稿于 `docs/ANIMATION-SYSTEM-DESIGN.md`（2026-09-17），
>   决策记录 D1 明确选择「分层方案（知识点侧离线人审 + 拍题侧运行时 IR），不做沙箱」。
> - 实现也已落地，见 `src/engines/animationIR/`、`src/features/animation/`、
>   `src/pages/ExplorePage.jsx`、`api/ai/animate.js`。
> - **仍然有效的遗留项**：`docs/MOBILE-APP-设计.md` 至今未建（打包/账号/支付/备案/合规），
>   该文档在 `ANIMATION-SYSTEM-DESIGN.md` §7 中被显式拆分出去。
>
> 本文仅作历史留存，用于回溯当时的调研结论（三个时钟、静默兜底教训等原始证据）。

---

> 由一次 brainstorming 会话压缩而来。仓库外的分析上下文已丢失，关键结论全部落在这里。

## 当前任务

为 geometry-3d-learning 设计「动画化」能力。**处于 brainstorming 阶段，设计未定稿，一行代码都没写。**

## 需求

1. **拍题模式**：拍照 → 生成该题对应的动画；一道题有多个小题时，每个小题独立。
   - 已确认：小题用**横向滑动切换**——一题一张卡片，卡片内横滑切小题，每个小题各自带播放器。
2. **知识点动画**：从现有知识点界面点按钮 → 跳到动画页。
   - 已确认：知识点动画**必须详细**（这条是工作量的重心）。
   - 用户补充：可以用教材上的例题来补充知识点。
3. **移动端**：主要用户在手机端，要上架 App，适配要做扎实。

## 关键调研结论（现状）

**项目目前没有真正的动画系统**，三处各自为政：

| 位置 | 现状 |
|---|---|
| `src/engines/animationController.js` | `setTimeout` 2500ms 步进器，回调为空，**实际未接入** |
| `src/pages/WorkspacePage.jsx` | 自带 `setTimeout(tick, 2800)`，是当前「播放」的真正来源 |
| `src/features/solid-geometry/Canvas3D.jsx` | 唯一逐帧动画（`useFrame` + lerp 0.06/0.08/0.055），仅作用于透明度与相机 |

全仓库**无** gsap / framer-motion / tween / requestAnimationFrame / keyframe。三个时钟（2500 / lerp / 2800）需要合并成一个真正的 rAF 驱动 `currentTime`。

其他相关现状：

- 物理知识点是纯文本、无可视化字段：`src/data/physicsKnowledge.js`
- 知识点配图是 60+ 个静态手写 SVG 的 `case`：`src/components/KnowledgeModel.jsx`
- **已有可复用的校验闸门先例**：`src/engines/sceneIRValidator.js` + `buildSceneIRFromCandidate`（已测试，**未接入生产**）
- 已有 ExplainIR（步骤理解真相层，nodes + steps + `validateExplainIR`），无视觉字段，动画 IR 可以挂在这里：`src/engines/topics/explainIR.js`
- 小题拆分已存在：`src/components/subQuestions.js`
- 拍题 OCR 链路已存在：`src/services/photoOcr.js`、`api/ai/ocr.js`、`api/ai/solve-stream.js`
- 上架合规清单：`appstore-readiness.html`（ICP/App 备案、教育移动应用备案、等保、未成年人数据、账号注销）
- **仓库内已有 IR 治理技能**：`.claude/skills/scene-ir-core/SKILL.md`，其中 2026-09-15 的「校验闸门」修订就是本设计的项目级先例，必须遵守

## 已呈现的设计（第 1、2 节，待用户确认）

**三层架构：**

```text
① 动画原语库（手写，可信）
   极板 / 电场线 / 电路支路 / 受力矢量 / 坐标图 / 箭头 / 标签 / 公式面板 / 读数表 …
   每个原语 = 一个渲染组件 + 一份「可动画槽位」声明

② 动画 IR + 校验闸门
   AI 只输出 { scene, params, tracks, overlays }，不写一行代码
   validateAnimationIR()：原语在白名单？参数物理合法？槽位存在？
   物理复算作为第二道：d 加倍 → C 必须减半，否则 reject

③ 可信渲染器（写一次，所有动画共用）
   关键帧插值 + 缓动，播放 / 暂停 / 拖进度 / 变速
```

电容器 IR 示例已在会话中给出（`params { d, S, U }` + `tracks`（含 `expr: "eps0 * S / d"`）+ `overlays`），此处不重复。

## 待决策（唯一阻塞）

用户主张：本项目核心是**让难题可视化**，担心 IR 会限制表达力；提出「像 ChatGPT 那样加免责声明 + 用户反馈」即可。

已拆分为两类风险：

- **正确性风险**（动画画错、公式代错）→ 免责声明 + 用户反馈可以兜。**已接受。**
- **执行安全风险** → 拍题链路上 OCR 文本会进 AI，若图片里藏了对抗性文字（prompt injection），生成的代码会在自家域名下执行。**免责声明兜不住。**

**推荐方案**：知识点侧走「离线生成 + 人工审核」（可无限精细，不受 IR 限制）；拍题侧走「运行时 IR 编排」，自由度来自原子组合而非写代码。

**备选方案**：坚持运行时自由生成代码 → 必须配沙箱（无网络 Worker/iframe + 仅暴露绘图 API + CSP + 执行超时 + 输出审核），单独排期。

➡️ **新会话第一件事就是问用户在这两条之间拍板。**

## 未完成

- 设计第 3 节：拍题链路（OCR → 拆小题 → 每题独立生成 IR → 校验 → 一题一卡片）
- 设计第 4 节：移动端与上架（合规排期 + 移动端渲染性能预算）
- 写入设计文档（brainstorming 流程要求）
- 自检 → 用户评审 → 进入实现计划

## 下一步

1. 确认 IR 方案拍板（唯一阻塞）
2. 补齐第 3、4 节
3. 写设计文档到 `docs/`，自检，请用户评审
4. 评审通过后进入实现计划（writing-plans）

## 建议加载的技能

- `.claude/skills/scene-ir-core/SKILL.md` — IR 唯一真相层 + 校验闸门，本设计必须遵守
- `.claude/skills/mathviz-mobile/SKILL.md` — 移动端
- `.claude/skills/teacher-mode/SKILL.md`、`.claude/skills/student-model/SKILL.md` — 知识点 / 例题侧
- `.claude/skills/mathviz-planner/SKILL.md`、`.claude/skills/workspace-architect/SKILL.md` — 规划与结构

## 用户偏好

- 语言：中文
- 核心价值主张：让难题可视化
- 风格：极简、Dark mode、教育产品 UX
- 关注点：AI 成本控制、用户反馈闭环、回复要直接给结论
