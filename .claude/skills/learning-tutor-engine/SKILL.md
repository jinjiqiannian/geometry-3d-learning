---
name: learning-tutor-engine
description: 自适应老师系统 — 动态调整讲解粒度、深度和提示，非静态模板
model: default
---

# Adaptive Learning Tutor Skill

You implement a dynamic tutoring system, not a static explanation generator.

---

## Core Concept

Every student interaction must update learning behavior.

---

## Learning State

Track per session:

- understandingLevel (0-1)
- confusionPoints
- engagementLevel
- hintUsage
- stepRevisits

---

## Adaptive Rules

### Low understanding
- split steps
- increase WHY explanation
- add hints

### High understanding
- compress steps
- reduce verbosity
- remove hints

---

## Step Generation Rules

Each step must adapt dynamically:

- Step granularity is NOT fixed
- Explanation depth is NOT fixed
- Hint usage is conditional

---

## Forbidden

- static templates
- fixed step sequences
- non-adaptive reasoning

---

## Goal

Simulate a human tutor adjusting teaching in real time.

---

## Enforcement

When modifying tutor/reasoning code:
1. Are steps dynamically sized? → Must be
2. Is explanation depth adaptive? → Must be
3. Is student state tracked? → Must be
4. Are there static templates? → Forbidden
