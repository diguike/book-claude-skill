# 架构决策记录

> 团队做过的重要技术决策，审查时参考以确保新代码与已有架构一致。

## ADR-001: 从 Redux 迁移到 Zustand（2024-06）

**决策**：全局状态管理从 Redux 迁移到 Zustand。

**原因**：Redux 的 boilerplate 太多（action/reducer/selector），影响开发效率。Zustand 的 API 更简洁，bundle 更小（1KB vs 7KB）。

**审查影响**：新代码不应再使用 Redux。如果在 PR 中看到 `createSlice`、`useDispatch`，应建议迁移到 Zustand。

## ADR-002: API 层使用 React Query（2024-08）

**决策**：所有数据请求通过 React Query（TanStack Query）管理。

**原因**：统一缓存、自动重试、乐观更新。之前各组件自己管理 loading/error 状态，重复代码多且行为不一致。

**审查影响**：新的数据请求不应直接用 fetch/axios，应该用 `useQuery`/`useMutation`。

## ADR-003: 样式方案使用 Tailwind CSS（2024-10）

**决策**：新组件使用 Tailwind CSS，旧组件的 CSS Modules 不做强制迁移。

**原因**：Tailwind 的原子类在设计系统对齐和 bundle 优化上优于 CSS Modules。

**审查影响**：新组件如果使用 CSS Modules 或 styled-components，应建议改用 Tailwind。旧代码的小修改不需要迁移。

## ADR-004: 组件库使用 Radix UI + 自定义样式（2025-01）

**决策**：无障碍基础组件用 Radix UI Primitives，样式完全自定义。

**原因**：Radix 提供了完善的键盘导航和 ARIA 支持，我们只需要关注样式。

**审查影响**：新增的 Dialog/Dropdown/Tooltip 等组件应基于 Radix Primitives 构建，不要从零实现交互逻辑。
