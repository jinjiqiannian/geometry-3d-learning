---
name: workspace-architect
description: Workspace 架构守护 — 状态持久化、操作可回放、步骤可导出
---

MathViz 的核心资产是 Workspace。
所有功能开发必须围绕 Workspace。

Workspace结构：
{ problem, geometry, visualStates, reasoningSteps, teacherScript, exportData }

禁止：直接生成UI而不保存状态。
必须：所有操作可回放。所有步骤可导出。所有状态可持久化。
