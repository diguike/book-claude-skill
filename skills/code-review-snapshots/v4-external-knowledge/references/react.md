# React 审查参考知识

> 审查 React 代码时参考这些常见陷阱和最佳实践。

## 常见陷阱

### 1. useEffect 依赖遗漏

缺少依赖项会导致闭包捕获过时的值，引发难以排查的 bug。

```tsx
// ❌ count 永远是 0
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []);

// ✅ 正确声明依赖
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, [count]);
```

### 2. 渲染中创建对象/数组

每次渲染都创建新引用会导致子组件不必要的重渲染。

```tsx
// ❌ 每次渲染都是新对象
<Context.Provider value={{ user, setUser }}>

// ✅ 用 useMemo 保持引用稳定
const value = useMemo(() => ({ user, setUser }), [user, setUser]);
<Context.Provider value={value}>
```

### 3. key 使用 index

列表项可增删时用 index 作 key 会导致状态错乱。

```tsx
// ❌ 删除中间项时后续项的状态会串
{items.map((item, i) => <Item key={i} />)}

// ✅ 用唯一标识
{items.map(item => <Item key={item.id} />)}
```

## 团队约定

- 组件文件名与导出名一致：`UserCard.tsx` 导出 `UserCard`
- 自定义 Hook 统一放 `hooks/` 目录
- 避免超过 3 层的 Context 嵌套
