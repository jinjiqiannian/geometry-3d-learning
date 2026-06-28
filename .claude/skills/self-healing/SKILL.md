---
name: self-healing
description: 自愈系统 — OCR/AI/空数据降级
model: flash
---

# Self Healing System

检测系统异常并自动降级，保证永不崩溃。

## 检测点
| 组件 | 异常 | 降级动作 |
|------|------|----------|
| OCR | 识别失败 / 空结果 | fallbackParser：用户手动输入题目 |
| AI (DeepSeek) | 超时 / 报错 | fallbackMastery：按难度简单估算 |
| 数据库 | 空数据 | fallbackPlanner：基于常见薄弱点生成计划 |

## 保证
- 任何异常不导致 500
- 用户始终看到有意义的界面
- 降级时标注 "基于简化模型"
