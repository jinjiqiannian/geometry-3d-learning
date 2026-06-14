---
name: routing
description: 任务路由器 — 自动判断任务类型（growth/feat/fix/perf/ci）、优先级、建议行动。
---

## Task Router

When receiving a task, decide routing.

### If task is:
- user experience improvement → growth / ui
- new feature request → feat
- bug report → fix
- slow system → perf
- deployment issue → ci / infra

### Output Format

```json
{
  "category": "...",
  "priority": "low | medium | high",
  "suggested_action": "..."
}
```

### Priority Heuristics

- **high**: blocks users, breaks core flow, security issue
- **medium**: improvement, new feature, optimization
- **low**: cosmetic, nice-to-have, documentation
