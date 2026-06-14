# System Guidelines for Claude Code

This repository is a SaaS + AI-powered product.

You are assisting in building a production-grade system used by real users.

---

## 1. Core Principles

Always optimize for:

### 1.1 User Value First
Every change must improve at least one of:
- clarity
- usability
- conversion
- learning effectiveness
- performance

If a change does not improve user value, it should be questioned.

### 1.2 Simplicity over Complexity
- Prefer simple solutions over clever abstractions
- Avoid premature optimization
- Avoid unnecessary architecture unless justified by scale

### 1.3 Product Thinking > Pure Engineering
When making changes, always consider:
- Why does this matter to users?
- Does it improve conversion or engagement?
- Does it reduce confusion?

---

## 2. Code Change Philosophy

### Separate concerns strictly:
- UI / UX changes → `ui:` or `growth:`
- Feature changes → `feat:`
- Bug fixes → `fix:`
- Performance improvements → `perf:`
- Infrastructure / CI → `ci:` or `infra:`
- Refactors → `refactor:`

---

## 3. Commit Message Rules

### Format:

```
<type>(<optional scope>): <concise summary>
```

### Rules:
- Focus on WHY, not just WHAT
- Keep under ~80 characters for summary
- Do not mix unrelated changes in one commit
- If multiple concerns exist, split commits

### Examples:

```
growth: improve pricing clarity to increase conversion
ui: simplify landing page pricing presentation
feat: add pricing plan toggle for pro/free users
fix: correct badge visibility logic for free users
perf: optimize parsing pipeline with 3-stage architecture
ci: add GitHub Pages auto deployment workflow
```

---

## 4. Code Quality Standards

### Required:
- Code must be readable without explanation
- Prefer explicit logic over magic abstractions
- Avoid duplicated business logic
- Ensure separation between UI, logic, and data layers

### Avoid:
- Over-engineering
- Deep inheritance trees
- Hidden side effects
- Unclear naming

---

## 5. Architecture Principles

System is composed of:
- **Input Layer** (user interaction / UI)
- **Processing Layer** (parsing / AI / logic engine)
- **Output Layer** (visualization / explanation / results)

### Rules:
- Keep layers independent
- Avoid UI depending directly on business logic internals
- Keep AI reasoning isolated from rendering logic

---

## 6. AI / LLM Integration Rules

When working with AI components:
- Treat LLM as a probabilistic engine, not a deterministic system
- Always validate outputs before rendering
- Separate:
  - reasoning
  - formatting
  - presentation

Never mix prompt logic with UI rendering logic.

---

## 7. Testing Philosophy

- Critical paths must be covered by tests
- Prefer integration tests over excessive unit tests
- Ensure UI-critical logic is covered (pricing, visibility, permissions)

---

## 8. Repository Discipline

- Keep repo consistent in naming conventions
- Avoid mixing experimental and production code in same branch
- Maintain clean commit history
- Use meaningful branch names:

Examples:
- `feat/pricing-system`
- `fix/badge-visibility`
- `perf/parser-optimization`

---

## 9. Definition of Done

A change is only complete when:
- It works locally
- It does not break existing behavior
- It is understandable by another engineer
- It improves or does not degrade user experience
- It has a clear commit message explaining intent

---

## 10. Mental Model

Think like a:

> YC-stage SaaS engineer building a global AI product used daily by real users.

Prioritize:
- clarity
- user impact
- long-term maintainability
- product growth

---

## 11. Context Rules

修改代码前：
1. 只读取完成任务所需文件
2. 禁止扫描整个 src 目录
3. 禁止读取无关页面
4. 单次分析文件不超过 5 个
5. 修改超过 10 个文件必须先询问用户
6. 上下文超过 70% 时主动建议开启新会话

---

## 12. Direct Execution vs Ask Permission

### ✅ Direct Execution
- CSS / UI / 样式调整
- React 组件开发
- 页面开发
- Bug 修复
- Three.js 调参
- 文件重命名 / 目录结构调整
- 性能优化（不改变架构）

### ❌ Must Ask Permission
- 超过 10 个文件修改
- AI 解析逻辑重构
- 数据库 / Supabase 修改
- 用户认证系统修改
- 支付 / 订阅系统修改
- 自动化系统修改
- 引入新的主要依赖

### Ask Format:
```
预计修改文件：
预计耗时：
建议模型：
风险：
```

---

End of guidelines.
