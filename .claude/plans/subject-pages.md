# 物理/化学/生物 独立功能页方案

## 架构
每个学科有 **学科首页**（概览+公式+例题+知识点）+ **独立工作台**（解题界面）

## 页面清单

### 新建 3 个学科首页（取代当前 SubjectPage）
| 页面 | 文件 | 说明 |
|------|------|------|
| 物理 | `src/pages/PhysicsPage.jsx` | 力学/电磁学/光学 + 公式 + 例题 + 知识点 |
| 化学 | `src/pages/ChemistryPage.jsx` | 物质结构/化学反应/有机化学 + 公式 + 例题 + 知识点 |
| 生物 | `src/pages/BiologyPage.jsx` | 细胞/遗传/生态 + 公式 + 例题 + 知识点 |

### 修改路由（App.jsx）
```
/physics    → PhysicsPage   (替换 SubjectPage subjectId="physics")
/chemistry  → ChemistryPage (替换 SubjectPage subjectId="chemistry")
/biology    → BiologyPage   (替换 SubjectPage subjectId="biology")
```

### 工作台方案
- 每个学科首页点击"开始学习" → 跳转到 `/workspace?subject=physics` 等
- 工作台根据 URL 参数 `subject` 切换上下文（标题、颜色、示例题目）
- 共用同一套解析/3D 渲染引擎（初期），后续可按学科定制可视化

## 每个学科首页的结构

```
[Hero]
  学科图标 + 学科名 + 一句话描述
  [开始学习] 按钮 → /workspace?subject=xxx

[公式库]
  4-6 个核心公式卡片（名称 + 公式 + 说明）

[典型例题]
  4-6 道例题，点击跳转工作台

[知识点列表]
  3 个知识分类，每类 3-4 个知识点
```

## 修改文件
| 文件 | 操作 |
|------|------|
| `src/pages/PhysicsPage.jsx` | 新建 |
| `src/pages/ChemistryPage.jsx` | 新建 |
| `src/pages/BiologyPage.jsx` | 新建 |
| `src/App.jsx` | 更新路由，替换 SubjectPage |
| `src/pages/SubjectPage.jsx` | 保留或移除 |

## 设计风格
- 与首页一致的深色大标题风格
- 每个学科使用对应的主题色（物理=青色/blue, 化学=紫色, 生物=绿色）
- 统一的卡片/列表样式
