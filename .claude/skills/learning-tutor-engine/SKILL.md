---
name: 自适应老师
description: 自适应老师系统 — 动态调整讲解粒度、深度和提示，非静态模板
model: default
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：动态自适应教学系统，不是静态模板生成器

🔔 何时触发：
   - 修改讲解/步骤/推理代码时
   - 调整提示系统时
   - 涉及学生理解状态时

📌 关键要点：
   1. 每次交互都要更新学习行为状态
   2. 跟踪：理解程度、困惑点、参与度、提示使用、步骤重访
   3. 低理解度：拆细步骤、增加为什么解释、添加提示
   4. 高理解度：压缩步骤、减少冗余、移除提示
   5. 禁止：静态模板、固定步骤序列、非自适应推理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

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
