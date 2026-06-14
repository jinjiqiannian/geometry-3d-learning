---
name: work-log
description: 自动生成工作日志，追加到 docs/CHANGELOG.md
model: default
---

# Work Log — 自动工作日志

当用户要求「写日志」「工作日志」「更新日志」「CHANGELOG」「写工作记录」「记录今天的工作」「写日报」时执行。

## Step 1: 获取变更范围

```bash
# 读取现有日志末尾，找到上次记录的日期
tail -20 docs/CHANGELOG.md

# 获取从上次记录至今的提交
git log --oneline --since="<上次记录日期>" --until="today"
```

如果 CHANGELOG.md 不存在或内容为空，从第一个 commit 开始。

## Step 2: 获取每个 commit 的详细信息

```bash
# 对每个未记录的 commit 获取详情
git show --stat <commit-hash> | head -30
git log <commit-hash> -1 --format="%B"
```

重点提取：
- 修改了哪些文件（按模块分组）
- commit message 中的关键描述
- 测试结果（如果有）

## Step 3: 分类整理

将变更按以下类别分组：

| 标签 | 含义 | 示例 |
|------|------|------|
| `feat` | 新功能 | 模型库、错题本、匹配引擎 |
| `fix` | 修复 | 安全补丁、bug修复 |
| `refactor` | 重构 | 死代码清理、类型系统 |
| `perf` | 性能 | AI成本上限 |
| `infra` | 基础设施 | 模型加载器、content目录 |
| `ui` | 前端UI | 导航、进度页面、MistakeCenter |

## Step 4: 写入 CHANGELOG.md

格式严格参照已有日志：

```markdown

---

## 2026-06-14（周日）

### 安全修复 & 基础设施

**commit:** `a9524a0`

- 修复内容...
- 涉及文件: `server/src/config/env.ts` 等

### 新功能

**commit:** `60c8534`

- 功能描述...

### 测试

`91 tests passed`

### 模型库状态

| 类别 | 数量 |
|------|------|
| 几何 | 5 |
| 函数 | 8 |
| 导数 | 7 |
| **合计** | **20** |
```

### 日志原则

1. **每天一个条目**，多条 commit 合并到同一天
2. **按模块分组**（安全/架构/AI/前端/内容），不按 commit 顺序
3. **突出量化结果**（删了多少行、加了多少个模型、测试通过数）
4. **模型库状态表**放在每天末尾（如果有变化）
5. **只记录已提交的工作**，不记录计划或未提交的修改

## Step 5: 确认

显示最终追加的内容摘要，让用户确认是否提交：

```bash
git diff docs/CHANGELOG.md
```
