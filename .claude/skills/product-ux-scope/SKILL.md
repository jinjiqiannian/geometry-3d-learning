---
name: product-ux-scope
description: UX收敛核心 — 单入口、零配置、极简学习流，防止产品工具化
model: default
---

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
