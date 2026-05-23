# React 组件结构审查规则

## 1. Props 定义

用 interface 而非 type alias 定义 props，因为 interface 支持声明合并且报错信息更友好。

- ❌ `type ButtonProps = { label: string }`
- ✅ `interface ButtonProps { label: string }`

props 超过 5 个时，考虑用对象参数或拆分组件。过多的 props 通常意味着组件承担了太多职责。

## 2. Hooks 使用顺序

按 React 约定：useState → useRef → useContext → useEffect → 自定义 hooks。
不一致的顺序会增加阅读成本，尤其在大组件中。

## 3. useEffect 依赖数组

每个 useEffect 必须声明完整的依赖数组。ESLint 的 exhaustive-deps 规则必须开启。
遗漏依赖会导致闭包陈旧（stale closure），这类 bug 在开发环境难以复现，但在生产环境会间歇性出现。

- ❌ `useEffect(() => { fetchUser(userId) }, [])` — userId 变化时不会重新请求
- ✅ `useEffect(() => { fetchUser(userId) }, [userId])`

## 4. 条件渲染

避免在 JSX 中用 `&&` 做条件渲染时左侧为数字 0 或空字符串。

- ❌ `{count && <Badge count={count} />}` — count 为 0 时渲染出 `0`
- ✅ `{count > 0 && <Badge count={count} />}`
- ✅ `{count ? <Badge count={count} /> : null}`

## 5. 组件文件组织

一个文件只导出一个组件。子组件、hooks、类型定义可以在同一文件内定义，但只有主组件被导出。
超过 300 行的组件文件应考虑拆分。
