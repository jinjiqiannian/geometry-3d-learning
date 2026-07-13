# Claude Code 自定义命令

> 在命令面板（Ctrl+Esc）中输入中文关键词即可触发对应命令

---

## 📋 常用命令

| 中文关键词 | 命令 | 说明 |
|-----------|------|------|
| 压缩上下文 | /auto-compress | 自动压缩对话上下文，节省Token |
| 批量操作 | /batch | 批量执行多个操作 |
| 极简模式 | /caveman | 开启极简模式，减少Token消耗 |
| 代码审查 | /code-review | 审查代码变更 |
| 提交代码 | /commit | 提交代码到Git |
| 配置 | /config | 查看/修改配置 |
| 上下文 | /context | 查看当前上下文 |
| 调试 | /debug | 开启调试模式 |
| 深度研究 | /deep-research | 深度研究模式 |
| 文档 | /docs | 查看项目文档 |
| 编辑 | /edit | 编辑文件 |
| 评估 | /eval | 评估代码 |
| 快速修复 | /fix | 快速修复问题 |
| 查找 | /find | 查找文件 |
| 功能 | /function | 执行函数 |
| 生成 | /generate | AI生成内容 |
| 获取 | /get | 获取信息 |
| 历史 | /history | 查看历史记录 |
| 帮助 | /help | 查看帮助 |
| 安装 | /install | 安装依赖 |
| 日志 | /log | 查看日志 |
| 记忆 | /memory | 查看记忆 |
| 规划 | /plan | 创建开发计划 |
| 预览 | /preview | 预览文件 |
| 读取 | /read | 读取文件内容 |
| 运行 | /run | 运行命令 |
| 搜索 | /search | 搜索代码 |
| 技能 | /skill | 查看/使用技能 |
| 状态 | /status | 查看项目状态 |
| 测试 | /test | 运行测试 |
| 上传 | /upload | 上传文件 |
| 写入 | /write | 写入文件 |

---

## 🎯 项目专属命令

| 中文关键词 | 命令 | 说明 |
|-----------|------|------|
| 启动开发 | /run npm run dev | 启动开发服务器 |
| 运行测试 | /run npm run test | 运行单元测试 |
| 构建项目 | /run npm run build | 构建生产版本 |
| 部署 | /auto-upload | 自动提交并部署 |
| 写日志 | /work-log | 生成工作日志 |
| 生成Commit | /commit-generator | 生成规范的Commit消息 |

---

## 💡 使用技巧

1. **快捷键**：`Ctrl+Esc` 打开命令面板
2. **输入中文**：直接输入中文关键词，如"压缩"、"提交"、"调试"
3. **模糊匹配**：输入部分关键词即可，如"审"匹配"/code-review"
4. **搜索文件**：输入文件名即可快速定位
5. **执行命令**：输入 `>` 开头的命令，如 `> npm run dev`

---

## 🚀 快速操作

```
> npm run dev          # 启动开发服务器
> git status           # 查看Git状态
> npm install          # 安装依赖
> npm run test         # 运行测试
> npm run build        # 构建项目
```

---

## ⚙️ 常用配置

| 配置项 | 说明 |
|--------|------|
| theme | 主题：dark / light |
| model | AI模型：deepseek-v4-flash |
| effort | 努力程度：xhigh |
| apiBase | API地址 |
| apiKey | API密钥 |
