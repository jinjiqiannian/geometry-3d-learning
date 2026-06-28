---
name: student-model
description: 学生画像构建 — 掌握度 + 错误模式 + 学习趋势
model: flash
---

# Student Model Builder

维护学生长期画像。每次考试分析后自动更新。

## StudentModel
```
{
  masteryMap: { "函数": 0.8 },          // 知识点→掌握度
  mistakePatterns: [{ type, count }],   // 错误类型分布
  strengths: ["立体几何"],               // mastery >= 0.7
  weaknesses: ["概率"],                   // mastery < 0.5
  learningStyle: "practice",            // visual/logical/practice
  examCount: 5,
  recentTrend: "improving"              // improving/stable/declining
}
```

## 规则
- 新考试覆盖旧考试（最近 30 天权重最高）
- 掌握度 = 正确题数 / 总题数
- 错误模式按 type 聚合计数
- strengths/weaknesses 按 mastery 阈值自动划分
