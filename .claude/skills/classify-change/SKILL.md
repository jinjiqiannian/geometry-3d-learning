---
name: classify-change
description: 自动分类每次代码变更 — growth/ui/feat/fix/perf/ci/refactor/infra。每次 commit 前自动调用。
---

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
