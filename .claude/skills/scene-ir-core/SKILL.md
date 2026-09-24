---
name: SceneIR核心
description: SceneIR唯一真相层 — 所有几何渲染必须经由SceneIR，AI不得直接控制视觉
model: default
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：SceneIR是几何渲染的唯一真相源，AI不得直接控制视觉

🔔 何时触发：
   - 修改几何/渲染代码时
   - 修改标签/标注系统时
   - 涉及3D可视化的任何变更

📌 关键要点：
   1. 架构：AI → Step Logic → SceneIR → Renderer
   2. AI绝对不能直接控制视觉渲染
   3. 禁止：AI生成坐标、UI生成标签、直接视觉操作、布局随机性
   4. 允许操作：平移、旋转、相交、投影
   5. 目标：确保几何渲染是确定性、可复现的
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

# SceneIR Core Skill

SceneIR is the SINGLE SOURCE OF TRUTH for all geometry rendering.

---

## Core Rule

ALL geometry must be derived from SceneIR.

NO exceptions.

---

## Architecture Rule

AI → Step Logic → SceneIR → Renderer

AI must NEVER directly control visuals.

---

## SceneIR Constraints

- stable object IDs required
- labels derived from ID map only
- deterministic output required

---

## Forbidden

- AI-generated coordinates **reaching the renderer unchecked**
- UI-generated labels
- direct visual manipulation
- randomness in layout

## The validation gate (2026-09-15 amendment)

「AI 不得生成坐标」这条曾经是绝对的，代价是覆盖范围有天花板：只有
模板表里有的形状才有图，其余一律不画。要"每道题都有图"就必须放开这一条 ——
但**只能放开到校验闸门为止**。

规则：

- AI 可以提出**候选场景描述**（顶点坐标 + 棱 + 面索引），这是它擅长的事
- 候选**必须**先过校验才允许变成 SceneIR；渲染层永远只认 SceneIR
- 校验不通过 → **不画**，并说明原因。绝不退回"随便画一个"
- 渲染层保持确定、可复现：同样的 SceneIR 永远画出同样的图

校验至少要覆盖：

1. 结构 —— 面闭合、每条棱两端存在、没有零长度棱
2. 数值 —— 题目里出现的数（如 AB=4）要和算出来的边长一致
3. 退化 —— 不共面、不自交
4. 声明 —— 模型声称的性质（"PA⊥底面"）用点积验

为什么不是"直接禁止"：这里的边界不是「AI 能不能碰坐标」，而是
「概率性输出与确定性渲染之间有没有一道闸门」。闸门在，确定性就在。
仓库 CLAUDE.md §6 说的是同一件事 —— 把 LLM 当概率引擎，输出先验证再渲染。

反过来说：**没有校验就放行 AI 坐标，是本项目最严重的一类 bug。**
平行六面体被静默画成正方体那次已经证明了 —— 错的图比没有图更糟，
因为学生不知道自己在看一张错的图。

---

## Allowed Operations

- translate
- rotate
- intersect
- project

---

## Goal

Ensure deterministic, reproducible geometry rendering.

---

## Enforcement

When modifying geometry/rendering code:
1. Does AI directly control visuals? → Forbidden
2. Are labels derived from SceneIR ID map? → Must be
3. Is output deterministic? → Must be
4. Are coordinates AI-generated? → Forbidden
