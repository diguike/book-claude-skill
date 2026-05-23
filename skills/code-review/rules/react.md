# React 组件审查规则

审查 `.tsx`/`.jsx` 文件或包含 React 导入的代码时使用。

## 1. Hooks 规则

- Hooks 只能在组件或自定义 Hook 的顶层调用，不能在条件语句、循环、嵌套函数中调用
- useEffect 的依赖数组必须完整，ESLint exhaustive-deps 规则不能禁用
- 自定义 Hook 必须以 `use` 开头

## 2. 状态管理

- 能用 props 传递的数据不要放 state，因为多余的 state 会导致数据不同步
- 能用 useMemo/派生的数据不要额外存 state
- ❌ 同时维护 `items` 和 `filteredItems` 两个 state — filteredItems 应该从 items 派生

## 3. 组件设计

- 单个组件文件不超过 300 行
- 一个组件只做一件事——如果 render 中有超过 3 个条件分支，考虑拆分
- 避免 prop drilling 超过 3 层——用 Context 或状态管理库

## 4. 性能

- 大列表（>50条）使用虚拟化（react-window / @tanstack/react-virtual）
- 避免在 JSX 中创建内联对象/函数（如 `style={{ margin: 10 }}`），会导致子组件不必要的重渲染
- React.memo 只在渲染成本高的组件上使用，不要过度优化

## 5. Key 的使用

- 列表渲染的 key 必须是稳定的唯一 ID，不要用 index
- ❌ `items.map((item, i) => <Row key={i} />)` — 列表增删时导致错误的 DOM 复用
- ✅ `items.map(item => <Row key={item.id} />)`

## 6. 错误边界

- 页面级组件应包裹 ErrorBoundary，避免一个组件崩溃导致整页白屏
- ErrorBoundary 应展示友好的错误提示和重试按钮，不是空白页面
