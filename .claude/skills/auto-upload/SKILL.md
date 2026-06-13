---
name: auto-upload
description: 自动部署 — 检测 git 状态，提交并部署到 GitHub Pages
model: default
---

# Auto Upload — 自动部署

当用户要求「上传」「部署」「上网站」「发布」「commit」「push」时执行。

## Step 1: 检查变更

```bash
git status --short
```

- 若无变更 → 告知用户"没有需要提交的变更"
- 若有变更 → 列出变更文件摘要，确认无敏感文件（credentials、token、密钥等）

## Step 2: 审查变更内容

确认以下安全规则：
- 不修改登录 / API Key / 模型配置
- 不修改 settings.json 中的收费 / 计费配置
- 不包含 `.env`、`*.key`、`*secret*` 等敏感文件
- 不提交大型二进制文件（>10MB）

若发现敏感文件被暂存，立即阻止并告知用户。

## Step 3: 提交

```bash
git add -A
git commit -m "<type>: <description>"
```

Commit message 格式遵循 Conventional Commits：
- `feat:` 新功能
- `fix:` 修复
- `perf:` 性能优化
- `refactor:` 重构
- `docs:` 文档
- `chore:` 杂项
- `style:` 样式/排版

正文中应列出关键变更点（每行一个 bullet）。

## Step 4: 推送

```bash
git push
```

如果推送失败（分支保护 / 冲突）：
1. 检查是否在受保护分支上 → 建议创建新分支
2. 若有冲突 → 建议 `git pull --rebase` 再推

## Step 5: 构建并部署

```bash
npm run deploy
```

这会执行 `predeploy → vite build` 然后 `gh-pages -d dist` 发布到 GitHub Pages。

## Step 6: 结果通知

- 部署成功 → 告知用户访问地址（GitHub Pages URL 或 Vercel URL）
- 部署失败 → 输出错误信息并给出修复建议

## 异常处理

| 场景 | 处理 |
|------|------|
| git status 显示未跟踪文件过多 | 检查是否有 node_modules / dist 被误跟踪 |
| 构建失败 | 输出错误日志，给出修复建议 |
| 无变更但用户要求上传 | 告知用户无变更可提交 |
| gh-pages 分支冲突 | 建议 `git push origin --delete gh-pages` 后重试 |
