---
name: 任务路由
description: 任务路由器 — 自动判断任务类型、优先级、建议行动
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：自动判断任务类型、优先级和建议行动

🔔 何时触发：
   - 收到新任务时
   - 需要分类任务时

📌 关键要点：
   1. 5种任务类型：growth(用户体验)/feat(新功能)/fix(Bug)/perf(性能)/ci(部署)
   2. 优先级：high(阻塞用户/安全)、medium(改进/新功能)、low(美化/文档)
   3. 输出JSON格式：category + priority + suggested_action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

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
