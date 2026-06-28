---
name: learning-planner
description: 学习计划生成 — 7/14/30 天路线图
model: flash
---

# Learning Planner

基于 KnowledgeMastery 生成学习计划。优先训练最薄弱 3 个知识点。

## 输入
```
examId: string
durationDays: 7 | 14 | 30
```

## 输出
```
{
  title: "7天提升计划",
  duration_days: 7,
  plan_content: [{
    day: 1,
    focus: "二次函数复习",
    knowledge_points: ["二次函数"],
    tasks: [
      { type: "review", description: "概念复习", duration_min: 15 },
      { type: "practice", description: "专项练习", duration_min: 20 },
      { type: "review_mistake", description: "错题回顾", duration_min: 10 }
    ],
    total_duration_min: 45
  }]
}
```

## 规则
- 每天 30-45 分钟
- 每 3-5 天安排一次综合复习
- 掌握度越低安排越多时间
