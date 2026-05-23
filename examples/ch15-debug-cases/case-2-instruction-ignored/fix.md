# Case 2: 修复方案

## 根因

SKILL.md 700 行过长。安全规则放在文件末尾，compaction 时被截断。

## 修复

1. 将安全规则提取到 `rules/security.md`
2. SKILL.md 缩减到 150 行，只保留核心流程
3. 安全检查从「可选附加项」改为流程中的必经步骤

```diff
  ## 审查流程
  1. 收集变更文件
  2. 检查代码风格（rules/base.md）
- 3. 检查性能
- 4. 检查可访问性
+ 3. 检查安全问题（rules/security.md）—— 此步骤不可跳过
+ 4. 检查性能（rules/performance.md）
```

关键改动：把最重要的规则放在 SKILL.md 的前 50 行内，
或者作为独立 rules 文件在流程中显式引用。

## 验证

- SKILL.md 从 700 行缩减到 148 行
- 连续 20 次测试，安全检查无遗漏
- 长对话（20+ 轮）后触发 skill 也能正常检查安全

## 教训

- SKILL.md 超过 200 行就要警惕
- 关键规则不要放在文件末尾
- 用 rules/ 拆分可以对抗 compaction 截断
