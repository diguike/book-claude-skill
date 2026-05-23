# Vue Review Knowledge

## Composition API 模式

### composable 命名与结构
```ts
// GOOD: use 前缀，返回响应式数据 + 方法
export function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  const decrement = () => count.value--;
  return { count, increment, decrement };
}
```

### composable 不要在条件分支里调用
```ts
// BAD: 和 React hooks 一样，composable 不能条件调用
if (props.enabled) {
  const { data } = useFetch(url); // 错误
}

// GOOD: 把条件传入 composable 内部处理
const { data } = useFetch(url, { enabled: props.enabled });
```

## 响应式陷阱

### 解构丢失响应式
```ts
const store = useCounterStore();
// BAD: count 变成普通数字，不再响应
const { count } = store;

// GOOD: storeToRefs 保留响应式
const { count } = storeToRefs(store);
```

### ref vs reactive 选择
- `ref` 用于原始值和需要替换整个对象的场景
- `reactive` 用于不需要替换的复杂对象
- 混用时注意：`reactive` 包裹的 `ref` 会自动解包，但数组和 Map 里的 `ref` 不会

### watch 的常见错误
```ts
// BAD: 监听 reactive 对象的属性直接写属性名
watch(state.count, () => {}); // 不工作，state.count 是一个值

// GOOD: 用 getter
watch(() => state.count, (newVal) => {});

// 或者用 ref
const count = ref(0);
watch(count, (newVal) => {});
```

### toRaw 和 markRaw
```ts
// 传给第三方库（如 Chart.js）时，用 toRaw 去掉 Proxy
chart.update(toRaw(chartData.value));

// 大量只读数据不需要响应式，用 markRaw 提升性能
const hugeList = markRaw(await fetchBigData());
```

## 模板与渲染

### v-if vs v-show
- `v-if` 真正销毁/创建 DOM，适合不常切换的场景
- `v-show` 只切换 display，适合频繁切换
- 不要在大列表的每一项上用 `v-if`，用 computed 过滤后再 v-for

### v-for 必须加 key
```vue
<!-- BAD -->
<li v-for="item in items">{{ item.name }}</li>

<!-- GOOD -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
```

### 避免 v-if 和 v-for 同时用在同一元素
```vue
<!-- BAD: v-if 优先级低于 v-for（Vue 3），每次都遍历全部 -->
<li v-for="item in items" v-if="item.active" :key="item.id">

<!-- GOOD: 用 computed 先过滤 -->
<li v-for="item in activeItems" :key="item.id">
```

## 性能

### 大列表用虚拟滚动
超过 200 条建议用 `vue-virtual-scroller` 或类似方案。

### defineAsyncComponent 懒加载
```ts
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'));
```

### shallowRef / shallowReactive
对于深层嵌套但只需要顶层响应的数据，用 shallow 版本避免深度代理。
