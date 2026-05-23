# Case 3: 修复方案

## 根因

references/ 文件总量 2000 行，所有文件无差别加载。
长对话中上下文过大，模型无法有效利用全部内容。

## 修复

1. 按技术栈拆分 references，SKILL.md 中根据文件类型条件加载：

```markdown
## 动态参考加载

根据待 review 文件的扩展名和 import 语句判断技术栈：
- .tsx / .jsx / import React → 加载 references/react.md
- .vue / import { ref } → 加载 references/vue.md
- 其他情况只加载 references/base.md
```

2. 每个 reference 文件精简到 80 行以内，只保留高频问题
3. 删除 angular.md、svelte.md 等团队不使用的技术栈

## 修复后结构

```
references/
  react.md       (80 lines)
  vue.md         (70 lines)
  typescript.md  (80 lines)
  api-design.md  (60 lines)
  总计: ~290 lines（单次最多加载 ~160 lines）
```

## 验证

长对话（20 轮后）测试 10 次：
- 修复前: 4/10 包含框架特定建议
- 修复后: 10/10 包含框架特定建议

## 教训

- references/ 总量控制在 500 行以内
- 按需加载优于全量加载
- 定期清理不再使用的 reference 文件
