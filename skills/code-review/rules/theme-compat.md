# 主题适配审查规则

审查涉及主题切换、暗色模式、高对比度的代码时使用。

## 1. 不要硬编码颜色

所有颜色值应使用 CSS 变量或主题 token，不要硬编码 hex/rgb 值。

- ❌ `color: #333333` — 暗色模式下黑色文字在深色背景上不可见
- ❌ `background: white` — 同理
- ✅ `color: var(--text-primary)`
- ✅ `background: var(--bg-surface)`

## 2. CSS 变量的命名

使用语义化命名，不要用颜色值命名：
- ❌ `--color-black`、`--color-white` — 在暗色模式下含义混乱
- ✅ `--text-primary`、`--bg-surface`、`--border-default`

## 3. 暗色模式实现

- 检查是否使用了 `prefers-color-scheme` 媒体查询或主题 context
- 图片和 icon 是否适配了暗色模式（纯白色 icon 在亮色背景上不可见）
- 阴影在暗色模式下效果不同，可能需要调整或替换为边框

## 4. 对比度

文字与背景的对比度应满足 WCAG AA 标准：
- 正常文字：≥ 4.5:1
- 大文字（≥18px bold 或 ≥24px）：≥ 3:1
- 交互元素的边框/焦点指示：≥ 3:1

## 5. 高对比度模式

- Windows 高对比度模式会覆盖所有颜色
- 使用 `forced-colors` 媒体查询处理高对比度模式
- 边框比背景色更可靠——高对比度模式下背景色会被覆盖，但边框通常保留

## 6. 主题切换的过渡

- 主题切换时应有平滑过渡（`transition: color 0.2s, background-color 0.2s`）
- 但首次加载时不要有过渡动画（防止闪烁）
- 用户的主题偏好应持久化到 localStorage
