---
name: scene-ir-core
description: SceneIR 唯一真相层 — 所有几何渲染必须经由 SceneIR，AI 不得直接控制视觉
model: default
---

# SceneIR Core Skill

SceneIR is the SINGLE SOURCE OF TRUTH for all geometry rendering.

---

## Core Rule

ALL geometry must be derived from SceneIR.

NO exceptions.

---

## Architecture Rule

AI → Step Logic → SceneIR → Renderer

AI must NEVER directly control visuals.

---

## SceneIR Constraints

- stable object IDs required
- labels derived from ID map only
- deterministic output required

---

## Forbidden

- AI-generated coordinates
- UI-generated labels
- direct visual manipulation
- randomness in layout

---

## Allowed Operations

- translate
- rotate
- intersect
- project

---

## Goal

Ensure deterministic, reproducible geometry rendering.

---

## Enforcement

When modifying geometry/rendering code:
1. Does AI directly control visuals? → Forbidden
2. Are labels derived from SceneIR ID map? → Must be
3. Is output deterministic? → Must be
4. Are coordinates AI-generated? → Forbidden
