---
name: 学习计划
description: 学习计划生成 — 7/14/30天路线图
model: flash
---

<!--
📝 中文说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 核心作用：基于知识点掌握度生成个性化学习计划

🔔 何时触发：
   - 生成学习计划时
   - 用户要求"制定计划"、"学习路线图"时
   - 考试分析后生成提升计划时

📌 关键要点：
   1. 输入：examId + durationDays(7/14/30)
   2. 优先训练最薄弱的3个知识点
   3. 每天30-45分钟
   4. 每3-5天安排一次综合复习
   5. 掌握度越低安排越多时间
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

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
