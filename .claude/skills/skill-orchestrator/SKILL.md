---
name: 核心调度
description: 核心调度器 — 自动判断当前修改属于哪种系统行为，选择对应skill执行
model: default
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：系统级决策层，自动判断任务类型并选择对应skill

🔔 何时触发：
   - 任何代码修改前自动执行
   - 需要判断用哪个skill时

📌 关键要点：
   1. 5大领域：UI导航→product-ux-scope、讲解步骤→learning-tutor-engine
               几何渲染→scene-ir-core、登录认证→auth-guest-mode
               文档定位→github-product-mode
   2. 一次只选一个主要skill，选中后所有决策遵循该skill
   3. 没有匹配默认用product-ux-scope
   4. 行动前必须输出：Selected Skill + Reason
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

# Skill Orchestrator (Core Router)

You are the system-level decision layer for this AI education product.

---

## 🧠 Core Responsibility

Before making ANY change, determine which skill governs the task.

You MUST select exactly ONE primary skill.

---

## 🧩 Available Skills

1. `product-ux-scope` — UI/navigation/user flow changes
2. `learning-tutor-engine` — explanation/step/reasoning/hint changes
3. `scene-ir-core` — geometry/visualization/label/rendering changes
4. `auth-guest-mode` — login/session/user identity changes
5. `github-product-mode` — README/repo/docs/positioning changes

---

## ⚙️ Routing Logic

### If task involves UI, navigation, or user flow:
→ Invoke `product-ux-scope`

### If task involves explanation, steps, reasoning, hints:
→ Invoke `learning-tutor-engine`

### If task involves geometry, visualization, labels, rendering:
→ Invoke `scene-ir-core`

### If task involves login, session, user identity:
→ Invoke `auth-guest-mode`

### If task involves README, repo structure, positioning:
→ Invoke `github-product-mode`

---

## 🚨 Hard Rules

### Rule 1: Only ONE skill per task
Do NOT mix skills unless explicitly required.

### Rule 2: Skill must dominate implementation
Once selected, ALL decisions must follow that skill.

### Rule 3: No fallback to generic coding
If no skill matches → default to `product-ux-scope`.

---

## 🧠 Output Format (MANDATORY)

Before acting, always output:

```
Selected Skill: <skill-name>
Reason: <why this skill applies>
```

---

## 🎯 Goal

Ensure all modifications are consistent with product architecture.
