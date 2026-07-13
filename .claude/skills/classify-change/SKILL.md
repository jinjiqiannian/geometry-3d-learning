---
name: 变更分类
description: 自动分类每次代码变更 — growth/ui/feat/fix/perf/ci/refactor/infra。每次commit前自动调用
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：自动分类每次代码变更的类型

🔔 何时触发：
   - 每次commit前自动调用
   - 需要判断变更类型时

📌 关键要点：
   1. 8种分类：growth(用户影响)/ui(视觉)/feat(新功能)/fix(Bug修复)
              perf(性能)/ci(CI/CD)/refactor(重构)/infra(基础设施)
   2. 每次变更必须精确分类为一种
   3. 只输出分类名称，不输出解释
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

## Change Classifier

You must classify every code change into exactly one category.

### Categories

- **growth**: user impact / conversion / UX clarity
- **ui**: visual / layout / presentation changes
- **feat**: new functionality
- **fix**: bug fixes
- **perf**: performance optimization
- **ci**: CI/CD changes
- **refactor**: internal restructuring with no behavior change
- **infra**: system / architecture / deployment changes

### Decision Rules

If change affects:
- user decision-making → growth
- UI appearance → ui
- new capability → feat
- broken behavior → fix
- speed / latency → perf
- pipeline / deployment → ci or infra

### Output

Return ONLY the category name.
