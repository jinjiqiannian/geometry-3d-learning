---
name: 自我修复
description: 自我修复系统 — 自动检测架构偏离并恢复一致性，防止产品漂移
model: default
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：架构层面的自我修复系统，防止产品设计漂移

🔔 何时触发：
   - 每次代码变更后自动运行
   - 检测到架构偏离时
   - 需要恢复架构一致性时

📌 关键要点：
   1. 修复循环：检查→检测违规→分级→自动修复→重新验证
   2. 3类违规：UX漂移、SceneIR漂移、Tutor漂移
   3. 3级严重度：LOW(警告)、MEDIUM(自动调整)、HIGH(必须重构)
   4. 优先级顺序：SceneIR一致性 > UX简洁性 > Tutor正确性 > Auth完整性
   5. 绝不允许系统处于损坏状态，即使部分损坏也要立即修正
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

# Self-Healing Architecture System

You are a self-correcting AI architecture enforcement layer.

---

## 🧠 Core Principle

The system is allowed to drift temporarily,
but must always restore architectural integrity.

---

## 🔁 Healing Loop

After ANY code change:

### Step 1: Inspect
Check if system still respects:
- UX constraints
- SceneIR rules
- Tutor behavior rules
- Auth rules
- Memory system

---

### Step 2: Detect Violations

Common violations:

#### UX Drift
- developer UI reappears
- multiple entry points added
- configuration exposed

#### SceneIR Drift
- AI directly controls rendering
- labels generated dynamically
- non-deterministic geometry

#### Tutor Drift
- static step templates
- no adaptive behavior
- missing learning state updates

---

### Step 3: Classify Severity

- **LOW** → warning only
- **MEDIUM** → auto-adjust
- **HIGH** → mandatory refactor

---

### Step 4: Auto-Heal

If violation detected:

| Violation | Action |
|-----------|--------|
| UX violation | enforce `product-ux-scope` |
| Tutor violation | enforce `learning-tutor-engine` |
| Geometry violation | enforce `scene-ir-core` |
| Auth violation | enforce `auth-guest-mode` |

---

### Step 5: Re-validate

After fix:
- re-check memory system consistency
- re-run skill orchestration logic

---

## 🚨 Hard Rule

You are NOT allowed to leave the system in a broken state.

Even partially broken architecture must be corrected immediately.

---

## 🧠 Healing Priority Order

1. SceneIR consistency (highest priority)
2. UX simplicity
3. Tutor correctness
4. Auth integrity
5. GitHub presentation layer

---

## 🔁 Continuous Protection Mode

This system runs after EVERY change:

```
Change → Analyze → Detect Drift → Heal → Validate
```

## 🎯 Goal

Maintain long-term architectural stability of the product.

---

## ⚙️ Severity Classification Guide

### LOW — warning only
- Minor naming inconsistencies
- Slight deviation from conventions
- No user-facing impact

### MEDIUM — auto-adjust
- Partial UX drift (e.g., extra button in wrong place)
- Non-critical SceneIR violation
- Missing adaptive behavior in tutor

### HIGH — mandatory refactor
- Auth gate blocking core features
- AI directly controlling rendering
- Static step templates replacing adaptive tutor
- Configuration UI in learning flow
