---
name: self-healing-system
description: 自我修复系统 — 自动检测架构偏离并恢复一致性，防止产品漂移
model: default
---

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
