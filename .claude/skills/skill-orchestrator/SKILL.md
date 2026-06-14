---
name: skill-orchestrator
description: 核心调度器 — 自动判断当前修改属于哪种系统行为，选择对应 skill 执行
model: default
---

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
