---
name: UX收敛
description: UX收敛核心 — 单入口、零配置、极简学习流，防止产品工具化
model: default
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：UX收敛，防止产品变成开发者工具

🔔 何时触发：
   - 修改UI/导航/用户流程时
   - 添加新功能入口时
   - 调整设置页面时

📌 关键要点：
   1. 这是学习产品，不是开发者工具，不是可配置系统
   2. 必须：单入口、零配置、线性学习流(输入→学习→完成)
   3. 禁止：API设置UI、模型选择UI、开发者配置、多模式仪表盘
   4. 允许页面：首页(输入)、解题(学习流)、设置(仅学习偏好)
   5. 目标：最小化认知负担，最大化学习流程清晰度
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

# Product UX Scope Skill

You are operating inside a production AI education product.

## Core Rule

This is NOT a developer tool.
This is NOT a configurable system.

It is a zero-friction learning experience.

---

## UI Principles

### MUST
- Single input entry point
- Immediate usage without setup
- Linear learning flow (Input → Learn → Finish)

### MUST NOT
- API settings UI
- model selection UI
- developer configuration
- multi-mode dashboards

---

## Navigation Rules

Allowed pages:
- Home (input)
- Solve (learning flow)
- Settings (learning preferences only)

No other entry points allowed.

---

## UX Goal

Minimize cognitive load.
Maximize learning flow clarity.

---

## Enforcement

When modifying UI code:
1. Does this add a new entry point? → Reject
2. Does this expose configuration? → Reject
3. Does this complicate the learning flow? → Reject
4. Does this reduce cognitive load? → Accept
