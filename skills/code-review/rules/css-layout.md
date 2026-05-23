# CSS / 布局 / 响应式审查规则

审查 CSS、SCSS、样式文件或包含布局代码时使用。

## 1. 响应式设计

- 所有页面布局组件必须在移动端可用（最小支持 375px 宽度）
- 使用相对单位（rem、em、%、vw/vh），不要用固定 px 做布局宽度
- 检查 Flex/Grid 布局在小屏幕下是否会溢出

## 2. 魔法数字

- 间距使用设计系统的 token（如 4px 的倍数：4、8、12、16、24、32）
- ❌ `padding: 13px` — 不在任何间距系统中
- ✅ `padding: var(--spacing-md)` 或 `gap: 16px`

## 3. z-index 管理

- 不要随意使用大数字
- ❌ `z-index: 99999`
- ✅ 使用预定义层级：`--z-dropdown: 100`、`--z-modal: 200`、`--z-toast: 300`

## 4. 动画性能

- 只对 `transform` 和 `opacity` 做动画（GPU 合成，不触发重排）
- ❌ `transition: width 0.3s` / `transition: margin 0.3s`
- ✅ `transition: transform 0.3s`
- 使用 `will-change` 要谨慎，只在确实需要的元素上使用

## 5. 布局稳定性

- 图片和异步内容要预留空间（设置 aspect-ratio 或固定高度），避免内容跳动（CLS）
- 字体加载应使用 `font-display: swap`，避免不可见文字（FOIT）

## 6. 文字溢出

- 长文本要处理溢出：`overflow: hidden; text-overflow: ellipsis` 或换行
- 检查多语言场景下文字是否会超出容器（德语和俄语通常比中英文长 30-50%）
