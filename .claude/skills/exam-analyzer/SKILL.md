---
name: exam-analyzer
description: 试卷分析 — 上传→OCR→解析→错题归因→知识点掌握度
model: flash
---

# Exam Analyzer

分析试卷结果。输入 Exam + Questions，输出 Mistakes + KnowledgeMastery。

## 流程
1. 获取考试记录 + 题目列表
2. 对比 student_answer vs correct_answer → 标记 is_correct
3. 对错题调用 DeepSeek 归因
4. 更新 knowledge_mastery 表

## 错误分类
| 类型 | 含义 | 教学动作 |
|------|------|----------|
| CALCULATION_ERROR | 计算失误 | 加强计算训练 |
| READING_ERROR | 审题错误 | 训练读题习惯 |
| CONCEPT_ERROR | 知识漏洞 | 重新讲解概念 |
| REASONING_ERROR | 推理错误 | 梳理逻辑链路 |
| CARELESS_ERROR | 粗心错误 | 检查清单 |

## API
```
POST /api/analyze          — 触发分析（body: { examId }）
GET  /api/analyze/:examId  — 获取分析结果
```

## 输出格式
```json
{
  "mistakes": [{ "type": "CONCEPT_ERROR", "reason": "..." }],
  "mastery": [{ "knowledge_point": "函数", "mastery": 0.8 }]
}
```
