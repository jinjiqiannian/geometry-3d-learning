---
name: auth-guest-mode
description: 访客优先系统 — 无需登录即可使用核心学习功能，登录是升级而非门禁
model: default
---

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
