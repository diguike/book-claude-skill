# Case 1: 修复方案

## 根因

description 只写了英文，语义匹配对中文查询得分低。

## 修复

更新 SKILL.md 的 description，加入中文关键词和常见表述：

```diff
- Performs code review on pull requests and source files.
+ Performs code review on pull requests and source files.
+ 代码审查、review PR、看看代码、检查代码质量。
+ Trigger when user asks to review, check, or inspect code changes.
```

## 验证

用 trigger-queries.json 跑了一轮测试：

| 修复前 | 修复后 |
|--------|--------|
| 4/10 should-trigger | 10/10 should-trigger |
| 9/10 should-not-trigger | 9/10 should-not-trigger |

准确率从 65% 提升到 95%。

## 教训

- description 要覆盖目标用户的语言
- 用 trigger test set 量化验证，不要靠直觉
- 参考 ch06 的优化流程
