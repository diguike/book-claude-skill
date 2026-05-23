# 性能审查规则

## 1. 不必要的重渲染

检查组件是否因为父组件渲染而被迫重渲染。

- 在 JSX 中创建内联对象/数组/函数会导致每次渲染都创建新引用：
  - ❌ `<List style={{ marginTop: 10 }} />` — 每次渲染创建新对象
  - ✅ 将样式提到组件外：`const listStyle = { marginTop: 10 }`
  - ❌ `<Button onClick={() => handleClick(id)} />` — 每次渲染创建新函数
  - ✅ `<Button onClick={handleClick} />` 或用 `useCallback`

- 但不要过度优化——`React.memo`、`useMemo`、`useCallback` 本身有成本。只在以下场景使用：
  - 组件渲染成本高（大列表、复杂图表）
  - 作为 Context Provider 的 value
  - 传给已经被 memo 的子组件

## 2. 列表渲染

超过 50 条数据的列表应使用虚拟化。

- ❌ 直接 `items.map(item => <Row />)` 渲染 1000 条数据
- ✅ 使用 `react-window` 或 `@tanstack/react-virtual`

key 必须是稳定的唯一标识，不要用 index：
- ❌ `items.map((item, i) => <Row key={i} />)` — 列表变更时会导致错误的 DOM 复用
- ✅ `items.map(item => <Row key={item.id} />)`

## 3. 数据请求

- 避免瀑布式请求（父组件请求完成后子组件才开始请求）
- 检查是否有重复请求（同一数据被多个组件各请求一次）
- 大数据量接口应使用分页或无限滚动

## 4. 内存泄漏

- useEffect 中的订阅（EventListener、WebSocket、定时器）必须在清理函数中取消
- ❌ `useEffect(() => { window.addEventListener('resize', handler) }, [])` — 组件卸载后 handler 仍在执行
- ✅ `useEffect(() => { window.addEventListener('resize', handler); return () => window.removeEventListener('resize', handler) }, [])`

## 5. 计算密集操作

- 避免在渲染路径上执行耗时计算
- 数据过滤、排序等操作用 `useMemo` 缓存，但前提是数据量确实大（>100 条）
- Web Worker 适用于真正的 CPU 密集任务（如大文件解析、图片处理）
