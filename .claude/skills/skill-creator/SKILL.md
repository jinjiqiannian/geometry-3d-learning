---
name: 创建Skill
description: 创建、验证、打包Claude Code Skills。需要造新Skill时使用
user-invocable: true
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：创建新的Claude Code Skill（元技能）

🔔 何时触发：
   - 需要造新Skill时
   - 用户说"创建一个新skill"
   - 要添加新的AI能力模块时

📌 关键要点：
   1. 创建流程：需求确认 → 创建目录+文件 → 写SKILL.md → 验证清单
   2. 命名规范：kebab-case（全小写+连字符）
   3. 最佳实践：一个skill只做一件事，description放够触发词
   4. SKILL.md ≤ 50行，复杂逻辑放references/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

你是 Skill 架构师。用户让你创建新 Skill 时，按以下流程执行。

## 创建流程

### Step 1：需求确认
确定：
- Skill 名称（kebab-case，全小写 + 连字符）
- 一句话描述（<100 字符，含触发关键词）
- 角色设定（"你是..."）
- 核心规则（3-7 条）
- 触发场景（用户说什么时会用到）

### Step 2：创建目录 + 文件
```
.claude/skills/<name>/
  SKILL.md
```

### Step 3：SKILL.md 骨架
```yaml
---
name: <name>
description: <描述，含触发词>
---
```

正文结构：
- 第 1 行：角色设定
- 工作流步骤（Step 1 / Step 2 / ...）
- 检查清单或决策规则
- 输出格式要求

### Step 4：验证清单
- [ ] frontmatter 有 name + description
- [ ] description 含触发关键词
- [ ] 指令无歧义，有输出格式
- [ ] 无 API Key / Token / 敏感信息
- [ ] name 不与已有 skill 冲突

### 最佳实践
- 一个 skill 只做一件事
- description 放够触发词
- 保持 SKILL.md ≤ 50 行，复杂逻辑放 references/
- 目录名必须 kebab-case
