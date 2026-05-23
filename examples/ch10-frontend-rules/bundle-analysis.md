# 包体积审查规则

## 1. 动态导入

路由级组件和大型第三方库应使用动态导入，避免打入首屏 bundle。

- ❌ `import ChartLibrary from 'heavy-chart-lib'` — 在首屏加载 200KB 的图表库
- ✅ `const ChartLibrary = lazy(() => import('heavy-chart-lib'))`

判断标准：如果一个模块只在特定页面/交互中使用，就应该动态导入。

## 2. 避免引入整个库

检查是否可以只引入需要的部分。

- ❌ `import _ from 'lodash'` — 引入整个 lodash（70KB gzipped）
- ✅ `import debounce from 'lodash/debounce'` — 只引入 debounce（<1KB）
- ✅ 更好：自己写一个 debounce（10 行代码，零依赖）

## 3. 图片和静态资源

- 超过 100KB 的图片应该用 CDN 而非打包到 bundle
- SVG icon 优先用组件化导入（tree-shaking 友好），不要用 sprite
- 检查是否有未压缩的图片被直接 import

## 4. Tree-shaking 友好

检查导出方式是否支持 tree-shaking：

- ❌ `export default { funcA, funcB, funcC }` — 导出对象，无法 tree-shake
- ✅ `export { funcA, funcB, funcC }` — 命名导出，bundler 可以只打包被引用的

## 5. 重复依赖

检查 `package.json` 是否有功能重叠的依赖：
- `moment` + `dayjs`（选一个）
- `axios` + `ky` + `got`（选一个）
- `lodash` + `ramda`（选一个）
