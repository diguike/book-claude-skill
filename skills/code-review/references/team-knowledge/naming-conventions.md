# 团队命名约定

> 最后更新：2025-03

## 组件

- React 组件：PascalCase（`UserCard`、`SearchBar`）
- 组件文件名与组件名一致：`UserCard.tsx`
- 页面组件以 `Page` 结尾：`DashboardPage`、`SettingsPage`

## 函数和变量

- 工具函数：camelCase（`formatDate`、`parseToken`）
- 常量：UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`、`API_BASE_URL`）
- 布尔变量：`is`/`has`/`should` 前缀（`isLoading`、`hasPermission`）

## Hooks

- 自定义 Hook 以 `use` 开头：`useAuth`、`useDebounce`
- 返回值解构命名：`[value, setValue]`（对称的名词和 setter）

## API 接口

- RESTful 命名：`GET /api/users`、`POST /api/users`
- 路径参数用名词复数：`/api/users/:id`（不是 `/api/user/:id`）
- 查询参数用 camelCase：`?pageSize=20&sortBy=name`

## 目录

- 功能模块用 kebab-case：`user-profile/`、`search-results/`
- 组件目录用 PascalCase：`components/UserCard/`
