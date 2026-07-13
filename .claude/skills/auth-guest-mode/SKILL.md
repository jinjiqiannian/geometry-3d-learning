---
name: 访客优先
description: 访客优先系统 — 无需登录即可使用核心学习功能，登录是升级而非门禁
model: default
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：访客优先模式，无需登录即可使用核心学习功能

🔔 何时触发：
   - 修改登录/会话代码时
   - 调整用户权限系统时
   - 涉及认证的任何变更

📌 关键要点：
   1. 访客优先：不登录也能用核心功能
   2. 登录是升级而非门禁
   3. 访客：自动会话、临时ID、完整核心学习权限
   4. 登录用户：保存历史、跨设备同步、可选Pro功能
   5. 禁止：不登录就屏蔽、强制注册、隐藏核心功能
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

# Auth & Guest Mode Skill

The product must be usable without login.

---

## Core Rule

Guest-first system.

No login required to use core features.

---

## User Types

### Guest User
- automatic session
- temporary ID
- full core learning access

### Auth User
- saved history
- sync across devices
- optional pro features

---

## Login Strategy

Login is NOT a gate.
Login is an upgrade.

---

## Forbidden

- blocking access without login
- forcing registration
- hiding core features behind auth

---

## Goal

Maximize zero-friction usage.

---

## Enforcement

When modifying auth/session code:
1. Is core learning blocked without login? → Forbidden
2. Is registration forced? → Forbidden
3. Are core features hidden behind auth? → Forbidden
4. Does guest get temporary session? → Must have
