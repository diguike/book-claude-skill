# 样式审查规则

## 1. CSS-in-JS vs Utility-first

检查项目使用的样式方案是否一致。同一个项目中不应混用多种样式方案。

- 如果项目用 Tailwind → 新代码也用 Tailwind，不要混入 styled-components
- 如果项目用 CSS Modules → 新代码也用 CSS Modules

## 2. 魔法数字

样式中的数值应该使用设计 token 或变量，不要硬编码。

- ❌ `padding: 13px` — 13px 不在任何间距系统中
- ✅ `padding: var(--spacing-md)` 或 `padding: theme.spacing(2)`

## 3. 响应式设计

页面布局组件必须有响应式处理。检查是否遗漏了移动端适配。

- 检查 Flex/Grid 布局是否在小屏幕下会溢出
- 检查固定宽度是否会导致横向滚动
- 检查文字是否在长内容下会溢出容器

## 4. z-index 管理

z-index 不要随意使用大数字。项目应有统一的层级定义。

- ❌ `z-index: 99999` — 会导致层级混乱，难以维护
- ✅ 使用预定义常量：`z-index: var(--z-modal)` / `z-index: var(--z-tooltip)`

## 5. 动画性能

只对 `transform` 和 `opacity` 做动画，这两个属性由 GPU 合成，不触发重排。

- ❌ `transition: width 0.3s` — 触发重排，性能差
- ❌ `transition: margin 0.3s` — 触发重排
- ✅ `transition: transform 0.3s` — GPU 合成，流畅
