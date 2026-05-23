# Case 3: 简化对话记录

## references/ 目录（修复前）

```
references/
  react.md          (120 lines)
  vue.md             (100 lines)
  angular.md         (150 lines)
  svelte.md          (80 lines)
  typescript.md      (200 lines)
  api-design.md      (150 lines)
  database.md        (200 lines)
  devops.md          (180 lines)
  testing.md         (180 lines)
  architecture.md    (200 lines)
  总计: ~1560 lines（加上 SKILL.md 和 rules/ 接近 2000 行）
```

## 测试 1: 短对话（正常）

用户: review src/components/UserList.tsx
Claude: （触发 skill，正确识别 React 组件）
> 1. useEffect 缺少 cleanup
> 2. 列表缺少稳定的 key
> 3. ...

## 测试 2: 长对话后（异常）

（前面已有 15 轮对话）
用户: review src/components/Dashboard.tsx
Claude: （触发 skill，但给出通用建议）
> 1. 变量命名不一致
> 2. 函数过长
> 3. ...

完全没有提到 React 相关的检查（如 hooks 规则、组件拆分）。

## 分析

短对话时总 token 数在模型有效处理范围内。
长对话后，对话历史 + references 总量过大，
模型对 references 内容的注意力下降。
