# 团队已知陷阱

> 这些是团队踩过的坑，审查时要特别注意。

## Auth SDK 在 SSR 下返回 null（2024-11 发现）

我们的 Auth SDK（`@internal/auth`）在服务端渲染时 `getUser()` 返回 null 而不是抛异常。如果代码没有检查 null，会导致页面白屏。

**审查时注意**：任何使用 `getUser()` 的地方都要检查返回值是否为 null。

## dayjs 的 locale 不会自动加载（2024-09 发现）

`dayjs` 默认只有英文 locale，中文需要手动导入 `dayjs/locale/zh-cn`。忘记导入会导致日期显示为英文。

**审查时注意**：新增 `dayjs` 使用的文件，检查是否正确设置了 locale。

## Zustand store 的 selector 要用浅比较（2025-01 发现）

直接 `useStore(state => ({ a: state.a, b: state.b }))` 每次都返回新对象，导致无限重渲染。

**正确做法**：`useStore(useShallow(state => ({ a: state.a, b: state.b })))` 或分开选取。

## Docker 镜像中 sharp 需要安装 libvips（2024-12 发现）

本地开发没问题，但 Docker 构建时 `sharp` 找不到 `libvips`。需要在 Dockerfile 中加 `apt-get install -y libvips-dev`。

**审查时注意**：如果 PR 新增了图片处理相关依赖，检查 Dockerfile 是否更新。
