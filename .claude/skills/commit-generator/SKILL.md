---
name: 生成Commit
description: 自动生成规范的Commit消息。根据diff或描述输出提交信息
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：根据代码变更自动生成规范的Commit消息

🔔 何时触发：
   - 提交代码前生成commit message
   - 根据diff描述生成提交信息

📌 关键要点：
   1. 格式：<type>(<scope>): <意图驱动的摘要>
   2. 优先写WHY而非WHAT
   3. 不超过90字符
   4. 可用类型：growth/ui/feat/fix/perf/ci/infra/refactor
   5. 聚焦用户/产品影响，避免不必要的实现细节
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

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
