# 多端适配审查规则

审查涉及多平台（Web/iOS/Android/小程序/React Native）的代码时使用。

## 1. 平台判断不要硬编码

检查是否使用了 `navigator.userAgent` 做平台判断。userAgent 字符串不可靠且跨平台行为不一致。

- ❌ `if (navigator.userAgent.includes('iPhone'))`
- ✅ `if (Platform.OS === 'ios')` （React Native）
- ✅ 使用媒体查询 `@media (pointer: coarse)` 判断触屏设备

## 2. 触摸目标尺寸

可点击元素的最小尺寸应为 44x44pt（Apple HIG）或 48x48dp（Material Design）。移动端用户用手指操作，过小的目标会导致误触。

- ❌ `<button style={{ width: 24, height: 24 }}>×</button>`
- ✅ 视觉可以小，但点击区域要大：`padding: 12px` 或 `min-height: 44px`

## 3. 滚动行为

- iOS 的弹性滚动（rubber banding）和 Android 的 overscroll 行为不同
- 固定定位元素（`position: fixed`）在移动端浏览器中被虚拟键盘推开
- 横向滚动在触屏设备上需要额外的可发现性提示

## 4. 输入处理

- 移动端文本输入应设置正确的 `inputMode`：数字用 `numeric`，邮箱用 `email`
- 移动端搜索框应使用 `type="search"` 以显示搜索键盘
- 考虑触屏设备没有 hover 状态：不要把关键信息藏在 hover 提示中

## 5. 网络条件

- 移动端更容易遇到弱网环境，接口调用要有超时和重试
- 大文件上传要支持断点续传
- 图片要有多分辨率适配（srcset 或 CDN 动态裁剪）

## 6. 小程序特有

- 小程序不支持 DOM API（querySelector 等），检查是否有直接操作 DOM 的代码
- 小程序的双线程模型导致 setData 有性能开销，避免高频 setData
- 包体积限制（通常 2MB），检查是否有不必要的大依赖
