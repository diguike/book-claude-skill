# React Review Knowledge

## Hooks 常见问题

### useEffect 依赖遗漏
```tsx
// BAD: count 变化不会重新执行
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []); // 缺少 count 依赖

// GOOD: 用函数式更新避免依赖
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

### useEffect 里做数据获取没有 cleanup
```tsx
// BAD: 组件卸载后仍然 setState
useEffect(() => {
  fetchUser(id).then(setUser);
}, [id]);

// GOOD: AbortController 取消请求
useEffect(() => {
  const ctrl = new AbortController();
  fetchUser(id, { signal: ctrl.signal }).then(setUser).catch(() => {});
  return () => ctrl.abort();
}, [id]);
```

### 自定义 Hook 返回不稳定引用
```tsx
// BAD: 每次渲染返回新对象
function useFilters() {
  const [search, setSearch] = useState('');
  return { search, setSearch, filters: { search } }; // filters 每次新对象
}

// GOOD: useMemo 稳定引用
function useFilters() {
  const [search, setSearch] = useState('');
  const filters = useMemo(() => ({ search }), [search]);
  return { search, setSearch, filters };
}
```

## 组件反模式

### 在渲染中定义组件
```tsx
// BAD: 每次渲染创建新组件，state 全部丢失
function Parent() {
  const Child = () => <div>{/* ... */}</div>;
  return <Child />;
}

// GOOD: 组件定义在外部
const Child = () => <div>{/* ... */}</div>;
function Parent() {
  return <Child />;
}
```

### Props 透传超过 3 层
如果 props 穿越 3 层以上组件才到达使用处，建议用 Context 或状态管理库。
透传不仅增加耦合，还让中间组件因为不相关的 props 变化而重渲染。

### 把 index 当 key
```tsx
// BAD: 列表有增删排序时 index 会导致 DOM 复用错误
items.map((item, i) => <Item key={i} {...item} />);

// GOOD: 用稳定唯一的 id
items.map(item => <Item key={item.id} {...item} />);
```

## 性能检查清单

### React.memo 使用原则
- 只在组件的 props 不经常变化、且渲染成本较高时使用
- 如果 props 里有内联对象/函数，memo 无效（每次都是新引用）
- 先用 React DevTools Profiler 确认瓶颈，再加 memo

### useMemo / useCallback 不是万能药
```tsx
// 不必要的 useMemo：简单计算比 memo 本身更快
const label = useMemo(() => `${first} ${last}`, [first, last]);

// 合理的 useMemo：过滤大列表
const filtered = useMemo(
  () => items.filter(i => i.name.includes(query)),
  [items, query]
);
```

### 懒加载路由级组件
```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
```
只对路由级别使用 lazy，不要对小组件 lazy，拆得太细反而增加请求数。

### 避免在 Context.Provider value 里传内联对象
```tsx
// BAD: 每次 Parent 渲染都触发所有 consumer 重渲染
<Ctx.Provider value={{ user, logout }}>

// GOOD: 稳定引用
const ctxValue = useMemo(() => ({ user, logout }), [user, logout]);
<Ctx.Provider value={ctxValue}>
```

## 状态管理红线

- 不要把「可以从 props 计算出来的值」放进 state
- 不要把「只有一个组件用」的状态提升到全局 store
- 表单状态优先用 react-hook-form 等库，不要手写一堆 useState
- 服务端数据用 TanStack Query / SWR 管理，不要手动 fetch + setState
