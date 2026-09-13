# 施工单：平行六面体支持

> 交给新会话直接开工用。目标是把「平行六面体」从"静默画成正方体"变成真正支持。
> 写于 2026-09-13，基于当时代码。

---

## 一、验收用例（先跑这个，确认问题）

在搜题模式输入：

```
如图，在平行六面体 ABCD - A'B'C'D' 中，AB = 4，AD = 3，AA' = 5，
∠BAD = 90°，∠BAA' = ∠DAA' = 60°，求：
(1) AA' · AB; (2) AB' 的长; (3) AC' 的长。
```

**当前表现**：3D 画布渲染出一个**正方体**，顶点标签是 `E F G H A B C D`。
形状错（应是斜的平行六面体）、标签错（题目用的是 `A B C D A' B' C' D'`）。

**AI 解题本身是对的**（10、√61、√85），坏的是几何可视化。

---

## 二、为什么不是"加个类型"那么简单

现有模板体系是「**固定单位形状 + 按 size 缩放**」。平行六面体套不上，因为
它的顶点位置**依赖题目给的边长和夹角**：

```
A(0,0,0)  B(4,0,0)  D(0,3,0)  C(4,3,0)          ← 底面由 AB、AD 定
AA' 需同时满足：
  |AA'| = 5
  AA'·AB = 5·4·cos60° = 10   →  x·4 = 10      →  x = 2.5
  AA'·AD = 5·3·cos60° = 7.5  →  y·3 = 7.5     →  y = 2.5
  x² + y² + z² = 25          →  z = √12.5 ≈ 3.5355
AA' = (2.5, 2.5, √12.5)
A' = A + AA' = (2.5, 2.5, √12.5)
B' = B + AA' = (6.5, 2.5, √12.5)
D' = D + AA' = (2.5, 5.5, √12.5)
C' = C + AA' = (6.5, 5.5, √12.5)
```

**所以要么给模板加"参数化顶点"能力，要么新增一条按题目解顶点的路径。**

---

## 三、要改的文件

以下路径基于 `src/engines/`。**每一项开工前先打开确认，不要照抄。**

### 1. `sceneIRTemplate.js`（新增一种类型）

- 加 `PARALLELEPIPED_VERTICES`（参考 `PYRAMID_VERTICES` 的写法）
- 在模板表里加 `parallelepiped` 条目：`vertices` / `labels` / `centers` / `lines` / `faces`
- 在 `ROLE_DEFINITIONS` 里加：底面四点 + 顶面四点的角色定义

**棱的 id 命名要跟现有一致**（`AB` / `B'C'` 这种），因为下游靠它匹配高亮。

### 2. `geometryValidator.js`

- `SHAPE_EDGE_TEMPLATES` 加条目。**注意**：cube 的 `requiredEdges` 里
  已经同时列了 `A1B1` 和 `A'B'` 两种写法，可以参照它处理撇号
- `buildRoleMap` 加分支。**这里有前车之鉴**：pyramid 曾因
  `degree > maxDegree` 严格比较误判锥顶，导致整套坐标错位一格。
  平行六面体没有"锥顶"概念，走 **按标签顺序直接映射** 更安全
- `computePointPositions` 需要能处理"顶点由题目参数决定"的情况

### 3. `geometryEngine.js`

- `createGeometry` 加 `case 'parallelepiped'`
- `getFaceIndices` 加对应面索引
- `isPolyhedral` 把它加进去（否则不画棱边）

### 4. `problemParser.js`

- `parseProblemToSemantic` 的 `shapePatterns` 加 `/平行六面体|parallelepiped/`
  → `shape: 'parallelepiped'`
- **注意顺序**：`正方体|立方体|cube` 在前，`长方体|cuboid` 也在前。
  平行六面体容易被 `长方体` 抢先匹配，**要放在足够靠前的位置**

### 5. `constraintSolver.js`（可能需要）

- 现有 `computeVerticesFromParams` 支持 `cuboidA/B/C` 这类参数。
  平行六面体需要「三条棱长 + 两个夹角」，看是按它扩展还是新开一条

### 6. `labelMapper.js`（需要确认）

- 确认 `A'` 这种撇号标签能被 `extractVerticesFromText` 提取出来

---

## 四、标签体系是个独立的坑

现有体系的标签是：

- 立方体/长方体 → `A B C D E F G H`
- 棱锥 → `A B C D P` 或 `S A B C D`
- 有些地方用 `A₁`（下标）

**平行六面体用 `A'`（撇号）**，而且是「底面 A-D + 顶面 A'-D'」的对应关系。

**必须确认整条链路都认撇号**：解析 → 角色映射 → SceneIR 的 `points[].id`
→ Canvas3D 的线端点查找。

**这里出错的症状和棱锥那个一模一样**：坐标对了但标签错位，或者某条线
静默消失（`resolvedLines` 里 `if (!from || !to) return null` 会把它丢掉）。

---

## 五、验证方法

### 单元测试（新增，参考现有写法）

`src/engines/__tests__/` 下已有 `sceneIR-geometry.test.js`，可以照着扩：

```js
it('平行六面体：底面须为平行四边形，顶面须是底面的平移', () => {
  const sem = parseProblemToSemantic(验收用例的题目文本)
  const ir = buildSceneIRSequenceFromSemantic(sem, [])[0]
  const pos = Object.fromEntries(ir.points.map(p => [p.id, p.position]))

  // ① 八个顶点都要有坐标，且都是有限值
  for (const k of ['A','B','C','D',"A'","B'","C'","D'"]) {
    expect(pos[k], `点 ${k} 没有坐标`).toBeTruthy()
    expect(pos[k].every(Number.isFinite)).toBe(true)
  }

  // ② 顶面必须是底面平移同一个向量（平行六面体的定义）
  const sub = (a, b) => a.map((v, i) => v - b[i])
  const shift = sub(pos["A'"], pos['A'])
  for (const [t, b] of [['B\'','B'], ['C\'','C'], ['D\'','D']]) {
    sub(pos[t], pos[b]).forEach((v, i) =>
      expect(v, `${t} 相对 ${b} 的位移应与 A' 一致`).toBeCloseTo(shift[i], 6))
  }

  // ③ 棱长要跟题目一致：|AB|=4, |AD|=3, |AA'|=5
  const d = (a, b) => Math.hypot(...sub(pos[a], pos[b]))
  expect(d('A','B')).toBeCloseTo(4, 6)
  expect(d('A','D')).toBeCloseTo(3, 6)
  expect(d('A',"A'")).toBeCloseTo(5, 6)

  // ④ 夹角：AA'·AB=10, AA'·AD=7.5（比用 arccos 更稳，避开精度问题）
  const dot = (a, b, c, e) => sub(pos[b], pos[a])
    .reduce((s, v, i) => s + v * sub(pos[e], pos[c])[i], 0)
  expect(dot('A','A\'','A','B')).toBeCloseTo(10, 6)
  expect(dot('A','A\'','A','D')).toBeCloseTo(7.5, 6)
})
```

**光有断言还不够，必须同时断言"没有 NaN"**（照抄 `sceneIR-geometry.test.js`
里的 `auditSceneIR` / `auditGeometry` 两个函数）。

### 端到端（真浏览器）

用 Playwright + 本机 Edge 跑验收用例，看：

- 画布上有 8 个顶点，标签是 A B C D A' B' C' D'（**不是 E F G H**）
- 形状是斜的，不是正方体
- 控制台 NaN 告警为 0

---

## 六、已知的坑（都是这个仓库真实踩过的）

1. **静默兜底**：`createGeometryFromSceneIR` 遇到不认识的类型会返回默认
   立方体，不报错。**新类型没接全链路时，表现可能还是"画了个立方体"**，
   别以为改对了。建议：先确认 3D 画的是平行六面体，再看标签。

2. **标签错位**：见棱锥那次 —— 锥顶判定用 `degree > maxDegree` 严格比较，
   第一个底面点胜出，整套坐标错位一格，而且**数值全部合法**，
   只查 NaN 的测试完全抓不住。**所以要断言几何性质，不只是断言没崩。**

3. **`replace_all` 会骗人**：这个仓库里出现过缩进不同导致只替换到一处的情况，
   而工具返回的是"All occurrences were successfully replaced"。
   **改完 grep 数一遍。**

4. **两个入口**：搜题模式和教学模式各有一条路径。**改完两条都要走一遍。**
   （LaTeX 规范化那次就是只有 `WorkspacePage` 做了、`SearchPage` 漏了。）

5. **不要只测合成数据**：OCR 那次我用代码渲染了一张干净图，一路绿灯，
   但真实照片完全不是那回事。**能用真题目就别造。**

---

## 七、做之前先想清楚的一件事

现在**光靠 AI 也能把平行六面体的题做对**（答案 10、√61、√85 都是对的）。
缺的只是那张图。

所以先问一句：**这个章节（空间向量）到底需不需要 3D？**
向量运算的核心是代数式的展开，3D 图是辅助理解"三条棱的夹角"。

如果价值不高，**更划算的做法可能是**：遇到 `parallelepiped` 时
**明确不渲染 3D**（复用已有的"非几何题型不渲染"机制），
而不是花大力气做一个可能用不上的形状。

**这个判断应该由产品负责人做，不该由实现者顺手决定。**
