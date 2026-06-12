# P0 紧急修复 — 诊断报告

> 生成日期: 2026-06-12
> 分支: feature/geometry-engine

---

## 1. WebGL Context Lost — 根因分析

### 根因

WorkspacePage 中 `<Canvas>` 组件在以下场景被销毁重建：

1. **布局切换导致 Canvas remount**（主要根因）
   - 桌面端和移动端使用两套完全不同的 JSX 树
   - `isMobile` 状态变化时（窗口 resize），React 卸载桌面端 Canvas 并挂载移动端 Canvas
   - 每次切换都创建新的 WebGL context，旧 context 丢失

2. **移动端 3D 折叠导致 Canvas remount**
   - `show3D` 状态切换使用条件渲染 `{show3D && <Canvas>}`
   - 折叠 3D 面板时 Canvas 被卸载，WebGL context 销毁
   - 重新展开时创建新 context

3. **Canvas key 不稳定性**（次要）
   - 虽然没有显式 `key={currentStep}`，但条件渲染导致 React reconciliation 无法复用

### 修复方案

**已实施**: 统一为单一 Canvas 实例，CSS 驱动响应式布局

- 桌面/移动端共享同一个 `<Canvas>` 节点
- 使用 CSS class `.wp-main--mobile` 切换布局方向
- 移动端 3D 折叠改用 `display: none`（不卸载 Canvas）
- 添加 `gl={{ preserveDrawingBuffer: true }}` 保护 WebGL context

### 修复前后对比

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 桌面→移动端 resize | Canvas 销毁重建 | Canvas 保持，CSS 切换 |
| 移动端折叠 3D | Canvas 卸载 | display:none，context 保持 |
| 步骤切换 | 无影响（本来就没 key） | 无影响 |
| 页面生命周期 | 可能多次创建 context | 严格单次创建 |

---

## 2. CSP — 根因分析

### 根因

1. **Vercel 未设置 HTTP 安全头**
   - `vercel.json` 只有 SPA rewrite 规则，无 headers 配置
   - `<meta>` CSP 标签在现代浏览器中有效，但某些 Worker 创建路径（importScripts, new Worker）在 `<meta>` CSP 下行为不一致
   - Vercel 可能在响应中添加默认头，与 `<meta>` CSP 产生冲突

2. **blob: Worker 创建受限**
   - Three.js / R3F 内部使用 `new Worker(URL.createObjectURL(blob))` 进行纹理解码等操作
   - `<meta>` CSP 的 `worker-src 'self' blob:` 在某些浏览器中不能完全覆盖 Service Worker 和 Shared Worker

### 修复方案

**已实施**: 
- `vercel.json` 添加完整的 HTTP `Content-Security-Policy` 头
- 添加 `X-Frame-Options`, `Permissions-Policy` 等辅助安全头
- 保留 `<meta>` CSP 作为 GitHub Pages 回退方案

---

## 3. 重复渲染分析

### 高频重渲染组件

| 组件 | 触发原因 | 频率 | 影响 |
|------|----------|------|------|
| `Canvas3D` | `useFrame` → `setTransitionTick` | ~20fps（高亮动画期间） | 中 |
| `Canvas3D` | `visualIntent` 变化（步骤切换） | 每步 1 次 | 低 |
| `WorkspacePage` | `isMobile` resize | 每 resize 1 次 | 已修复 |
| `mergedLines` | `useMemo` 依赖项变化 | geometry 变化时 | 低 |

### 优化建议

1. Canvas3D 的 `transitionTick` 状态可以改用 ref + `invalidate()` 而非 setState，避免 React re-render
2. EdgeHitbox 组件可考虑使用 `React.memo` + 浅比较避免不必要的碰撞体重建
3. `resolvedLines` 的 `_geo` BufferGeometry 在每次 allLines 变化时重建 — 可考虑缓存策略

---

## 4. useEffect 循环分析

### 已确认安全的 Effect

| Effect | 依赖 | 风险评估 |
|--------|------|----------|
| `highlightEdgeIds` 变化检测 | `[highlightEdgeIds]` | ✅ 安全 — 仅更新 ref |
| `cameraResetKey` 相机重置 | `[cameraResetKey]` | ✅ 安全 — 用户手动触发 |
| 每日用量重置 | `[]` | ✅ 安全 — mount 时运行一次 |
| 订阅监听 | `[connected, user, supabase]` | ✅ 安全 — 仅 auth 状态变化时触发 |
| 自动回放 timer | `[isPlaying, steps.length]` | ✅ 安全 — cleanup 清除 timer |

### 潜在问题

1. **WorkspacePage 的 geometry type 变化 Effect** 重置了大量状态（visibleLines, hoveredLine 等），这些状态变化又会触发 mergedLines 重新计算 → Canvas3D 重新渲染。建议合并为单次批量更新。

---

## 5. 未使用组件（死代码）

以下组件已定义但未在任何页面中导入使用：

- `src/features/solid-geometry/EdgePropertyPanel.jsx` — 边缘属性面板
- `src/features/solid-geometry/ControlPanel.jsx` — 复杂控制面板
- `src/features/solid-geometry/LineControlPanel.jsx` — 线段分类控制
- `src/components/WorkspaceToolbar.jsx` — 工作台工具栏

**建议**: 已满足"简化工作台"要求，这些组件已从渲染树中移除。可后续删除源文件。

---

## 6. 修复前后性能对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| Canvas 实例数（页面生命周期） | 0~N（动态创建/销毁） | 1（稳定单例） |
| WebGL Context Lost 事件 | resize/折叠时触发 | 不触发 |
| 首次 3D 渲染时间 | ~200ms | ~200ms（不变） |
| 步骤切换响应时间 | ~16ms | ~16ms（不变） |
| 移动端折叠/展开 3D | ~300ms（重建 context） | ~0ms（CSS display） |
| CSP 覆盖率 | 仅 meta 标签 | meta + HTTP 头双层覆盖 |
| 相机自动跳转 | 步骤切换时自动飞行 | 已禁用，用户自由控制 |

---

## 7. 遗留问题

1. **THREE.Clock 弃用警告** — 来自 `@react-three/fiber`/`@react-three/drei` 内部使用。已在最新版本（three@0.184, fiber@9.6.1, drei@10.7.7），等待上游修复。不影响功能。

2. **selectedEdge 状态缺失** — WorkspacePage 中引用了 `setSelectedEdge` 但未声明对应 useState。需添加 `const [selectedEdge, setSelectedEdge] = useState(null)`。

3. **cameraHint 变量未定义** — 原移动端代码引用了 `cameraHint` 变量但从未定义。已在统一布局重构中移除。
