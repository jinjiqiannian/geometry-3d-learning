# 函数导数模型库 — 第一阶段实施计划

## 目标
在现有几何模型系统旁，建立函数/导数模型库（首批15个模型），保持100%向后兼容。

## 背景
当前系统只支持立体几何（5个模型）。函数/导数是高考数学最高价值章节（占60%压轴题），需要扩展模型库覆盖这些内容。

## 实施步骤

### Step 1: 内容文件 (15个JSON模型)

创建两个新目录：
- `content/models/function/` (8个模型)
- `content/models/derivative/` (7个模型)

模型加载器 `modelLoader.ts` 已支持递归目录遍历，无需修改代码。

**函数模型：**
- `function-linear.json` - 一次函数
- `function-quadratic.json` - 二次函数
- `function-power.json` - 幂函数
- `function-exponential.json` - 指数函数
- `function-logarithmic.json` - 对数函数
- `function-composite.json` - 复合函数
- `function-piecewise.json` - 分段函数
- `function-property.json` - 函数性质(奇偶/周期)

**导数模型：**
- `derivative-definition.json` - 导数的定义与计算
- `derivative-tangent.json` - 切线问题
- `derivative-monotonicity.json` - 单调性判断
- `derivative-extremum.json` - 极值问题
- `derivative-max-min.json` - 最值问题
- `derivative-image.json` - 导数与函数图像
- `derivative-comprehensive.json` - 导数综合

### Step 2: 类型系统扩展 (server/src/types/index.ts)

最小改动，保持向后兼容：

```typescript
// 在 ParsedProblem 中加 category 字段
export interface ParsedProblem {
  type: GeometryType
  size: number
  labels: string[]
  highlightLines: HighlightLine[]
  annotations: Annotation[]
  explanation: string
  extraParams?: Record<string, number>
  problemType?: ProblemSubType
  category?: ModelCategory  // ← 新增，undefined = geometry-3d（向后兼容）
}
```

`category` 为 `undefined` 时视为 `'geometry-3d'`，所有旧数据无需迁移。

### Step 3: AI Service 扩展 (server/src/services/ai.service.ts)

**3a. 扩展 STEP_SCHEMA_REGISTRY**
添加函数/导数的步骤模板（每个模型4-5步，使用已有的 `conceptual/construction/calculation/validation` 类型）

**3b. 扩展 mapModelToProblemType**
添加15个新模型ID到本地模板的映射。函数模型统一映射到 `function_general`，导数模型按子类型映射。

**3c. 扩展 LOCAL_CONTENT / LOCAL_WHY / LOCAL_STUCK**
为函数/导数问题类型添加教学文本（中文）。至少覆盖：函数图像分析、函数性质判断、导数定义、切线计算、单调区间、极值求法。

**3d. solveComplete 快速路径分支**
当 `bestMatch.model.category` 为 `'function'` 或 `'derivative'` 时，不再硬编码 `type: 'cube', size: 2`，改为：
```typescript
const parsed: ParsedProblem = {
  type: undefined,  // 非几何体
  size: 0,
  labels: [],
  highlightLines: [],
  annotations: [],
  explanation: bestMatch.model.title,
  problemType: problemType as any,
  category: bestMatch.model.category,
}
```

**3e. generateVisualStates 跳过非几何**
在 `generateVisualStates` 函数入口处检查 `parsed.category`，若非 `'geometry-3d'` 则直接返回空数组。

### Step 4: 前端条件渲染 (src/pages/WorkspacePage.jsx)

最小改动：当 `parsedData.category` 非 geometry-3d 时，隐藏 Canvas3D 和所有几何控件，直接显示步骤卡片（`ExplanationPanel` 已经能处理）。

```jsx
const isGeometry = !parsedData?.category || parsedData.category === 'geometry-3d'

// 条件渲染 Canvas3D
{isGeometry && <Canvas><Canvas3D ... /></Canvas>}
```

### Step 5: 路由验证调整 (server/src/routes/ai.ts)

`reasonSchema` 中 `parsedData` 的 `type` 字段当前为 `z.string()`（已接受任意值），无需改动。仅需在后续需要时添加 `category` 字段的校验。

### 不做的（推迟到后续阶段）
- LaTeX公式渲染（KaTeX/MathJax集成）
- 2D函数图像绘制
- AI提示词重构（非几何问题仍走本地模板，不走AI fallback）
- `explanationEngine.js` 本地模板更新（客户端仅用于几何）

## 关键文件清单

| 文件 | 操作 | 改动量 |
|------|------|--------|
| `content/models/function/*.json` | 新增(8个) | ~80行/个 |
| `content/models/derivative/*.json` | 新增(7个) | ~80行/个 |
| `server/src/types/index.ts` | 修改(1行) | 加1字段 |
| `server/src/services/ai.service.ts` | 修改 | ~200行 (schema+content+映射) |
| `src/pages/WorkspacePage.jsx` | 修改 | ~20行 (条件渲染) |

## 验证方式
1. `npx vitest run` — 91个现有测试全部通过
2. 服务器启动时日志显示 "MathModel loaded: 20 models (0 errors)"
3. 几何工作台正常渲染（回归测试）
4. `/api/models/match` 返回函数模型匹配结果
5. `/api/ai/solve` 传入函数题目时，返回 `matchedModel.category` 为 `function`
