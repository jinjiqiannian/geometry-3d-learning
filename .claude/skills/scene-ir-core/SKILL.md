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

- AI-generated coordinates
- UI-generated labels
- direct visual manipulation
- randomness in layout

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
