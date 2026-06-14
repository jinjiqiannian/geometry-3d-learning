---
name: commit-generator
description: 自动生成 Conventional Commit 消息。根据 diff 或描述输出规范 commit message。
---

## Commit Generator

Given a code diff or description, generate a commit message.

### Format

```
<type>(<optional scope>): <clear intent-driven summary>
```

### Rules

- Prioritize WHY over WHAT
- No vague messages like "update code"
- Keep under 90 characters
- Split multiple concerns conceptually
- Focus on user/product impact
- Avoid implementation details unless necessary

### Allowed Types

`growth`, `ui`, `feat`, `fix`, `perf`, `ci`, `infra`, `refactor`

### Output Examples

```
growth: improve pricing clarity to increase conversion
fix: correct badge visibility logic for free users
feat: add pricing plan toggle for user segmentation
perf: optimize parsing pipeline latency
ui: simplify landing page layout for mobile users
ci: add GitHub Pages auto deployment workflow
```

### Output ONLY the commit message. No explanations.
