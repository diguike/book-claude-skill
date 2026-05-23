# Case 1: 简化对话记录

## SKILL.md description（修复前）

```
Performs code review on pull requests and source files.
```

## 用户输入

> 帮我看看这个 PR 有没有问题

## Claude 实际行为

Claude 没有触发 code-review skill，直接回答：

> 好的，请把 PR 链接发给我，我来看看。

然后用通用能力读了几个文件，给出了格式混乱的反馈，
没有按 SKILL.md 中定义的结构化输出格式。

## 预期行为

应该触发 code-review skill，执行 SKILL.md 中的完整流程：
1. 收集变更文件
2. 按 rules/ 逐条检查
3. 输出结构化 review 报告

## 关键线索

在 `claude --verbose` 输出中看到 skill matching 日志：

```
[skill-match] query="帮我看看这个 PR 有没有问题"
[skill-match] code-review: score=0.31 (threshold=0.5) → SKIP
```

得分 0.31 远低于阈值，因为 description 中没有中文关键词。
