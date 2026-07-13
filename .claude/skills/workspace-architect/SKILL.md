---
name: Workspace架构
description: Workspace架构守护 — 状态持久化、操作可回放、步骤可导出
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：守护Workspace架构，确保所有操作可回放、可导出、可持久化

🔔 何时触发：
   - 开发Workspace功能时
   - 修改3D视图状态时
   - 涉及步骤回放/PPT导出时

📌 关键要点：
   1. Workspace是MathViz的核心资产，所有功能围绕它开发
   2. Workspace结构：problem + geometry + visualStates + reasoningSteps + teacherScript + exportData
   3. 禁止：直接生成UI而不保存状态
   4. 必须：所有操作可回放、所有步骤可导出、所有状态可持久化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

MathViz 的核心资产是 Workspace。
所有功能开发必须围绕 Workspace。

Workspace结构：
{ problem, geometry, visualStates, reasoningSteps, teacherScript, exportData }

禁止：直接生成UI而不保存状态。
必须：所有操作可回放。所有步骤可导出。所有状态可持久化。
