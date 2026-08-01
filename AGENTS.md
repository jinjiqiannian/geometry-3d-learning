# 几何维度开发工作流

## 🎯 核心目标
为初中学生提供3D交互式几何学习平台，帮助理解空间几何概念。

---

## 🛠️ 技术栈

### 前端
- **框架**: React 19 + Vite 8
- **状态管理**: React Context (WorkspaceContext, ThemeContext, SubscriptionContext)
- **路由**: React Router DOM 7
- **3D渲染**: Three.js + @react-three/fiber + @react-three/drei
- **样式**: CSS Modules + CSS Variables (主题切换)
- **测试**: Vitest + @testing-library/react

### 后端
- **框架**: Node.js + Express + TypeScript
- **数据库**: Supabase (PostgreSQL)
- **支付**: Stripe
- **部署**: Vercel (前端) + Railway (后端)

### AI集成
- **本地计算引擎**: calculationEngine.js (数学公式计算)
- **题目解析**: problemParser.js (自然语言解析)
- **步骤生成**: explanationEngine.js (AI + 本地双引擎)
- **API支持**: OpenAI / DeepSeek (可配置API Key)

---

## 📁 核心文件结构

```
src/
├── components/          # UI组件
│   ├── AnswerPanel.jsx      # 答案展示面板
│   ├── ExplanationPanel.jsx # 解题步骤面板
│   ├── GeometryMiniControls.jsx # 3D控制按钮
│   └── StepCard.jsx         # 步骤卡片
├── engines/             # 核心引擎
│   ├── calculationEngine.js # 数学计算引擎(替代模板)
│   ├── explanationEngine.js # 解题步骤生成
│   ├── problemParser.js     # 题目解析器
│   └── geometryEngine.js    # 3D几何引擎
├── features/            # 功能模块
│   └── solid-geometry/      # 立体几何功能
│       ├── Canvas3D.jsx     # 3D画布
│       ├── ControlPanel.jsx # 控制面板
│       └── MeasureTool.jsx  # 测量工具
├── pages/               # 页面
│   ├── WorkspacePage.jsx    # 工作台(核心)
│   ├── LandingPage.jsx      # 首页
│   └── HistoryPage.jsx      # 历史记录
└── contexts/            # 上下文
    └── WorkspaceContext.jsx # 工作台状态管理
```

---

## 🔧 关键引擎说明

### calculationEngine.js
- **作用**: 根据几何体类型和参数，动态生成解题步骤和答案
- **支持几何体**: cube, cuboid, pyramid, prism, cylinder, cone, sphere, frustum
- **支持题型**: volume(体积), surface(表面积), lateral(侧面积), diagonal(对角线), angle(角度)
- **公式标准**: 使用教材通用公式(如V=⅓S底h)，而非数值代入式

### problemParser.js
- **作用**: 解析自然语言题目，提取几何体类型、尺寸、参数
- **输入**: 题目文本(如"正方体棱长为2，求体对角线长度")
- **输出**: 结构化数据{type, size, params, questionType}

### explanationEngine.js
- **作用**: 生成解题步骤
- **策略**: AI优先(API Key可用时)，本地计算引擎作为降级
- **步骤结构**: 核心思路 → 分步解析 → 公式应用 → 计算过程 → 结论

---

## ⚠️ 已知问题与解决方案

### 问题1: 步骤全错/解析失败
**原因**: `generateLocalSteps`被调用两次，第二次使用错误数据覆盖正确结果
**解决方案**: 将步骤生成与后续操作(recordUsage/保存历史)分开，确保步骤生成成功后不会被后续错误覆盖

### 问题2: 答案不完整
**原因**: 结论步骤缺少具体数值答案
**解决方案**: 在calculationEngine.js的solve函数中，确保每个problemType都返回明确的answer值

### 问题3: 公式显示错误
**原因**: 使用数值代入式而非教材通用公式
**解决方案**: 在步骤中使用`formula`字段存储教材公式，AnswerPanel优先读取该字段

### 问题4: 数学符号显示问题
**解决方案**: 使用Unicode数学符号(π, √, ², ³, ⅓)

### 问题5: 3D视图未高亮关键线和夹角
**解决方案**: 在解析成功后，根据parsedData.highlightLines设置customLines和visibleLines

---

## 📐 编码规范

### JavaScript/React
- 使用函数组件 + Hooks
- 使用可选链(?. )和空值合并(??)防止空指针
- 避免直接修改state，使用setState回调
- 复杂逻辑提取到自定义hooks或引擎文件

### CSS
- 使用CSS Variables定义主题颜色
- 优先使用Flexbox/Grid布局
- 移动端优先设计(min-width: 390px)
- 禁止使用!important

### 提交规范
- feat: 新功能
- fix: Bug修复
- refactor: 重构
- docs: 文档
- style: 样式

---

## 🎯 开发优先级

### P0 - 核心功能
- 题目解析正确率
- 解题步骤正确性
- 3D视图可视化

### P1 - 用户体验
- 答案与解析对应
- 深色模式显示优化
- 交互按钮稳定性

### P2 - 辅助功能
- 教师模式
- PPT导出
- 错题本

### P3 - 低优先级
- 炫酷特效
- 复杂设置
- 小众功能

---

## 🧪 测试标准

### 单元测试
- engines/目录下所有引擎文件
- 测试覆盖率 ≥ 80%

### 功能测试
- 每种几何体类型至少2个测试用例
- 每种题型至少1个测试用例

### 视觉测试
- Desktop / Tablet / Mobile 三端检查
- 深色模式检查

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build
```

---

## 📝 注意事项

1. 修改引擎文件前，先查看相关测试文件
2. 涉及数据库修改必须先询问
3. 引入新依赖必须先评估
4. 超过10个文件修改必须先询问
5. 保持代码简洁，避免过度抽象