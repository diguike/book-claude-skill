# AI Skill 实战权威指南

> 以 Claude Code Skill 为实战载体，系统讲解 AI 能力封装的工程化方法论。

## 这本书解决什么问题

团队里 5 个人做 code review，标准不一致。新人总是漏掉安全检查，老人每次重复提相同的意见。你写了一份审查规范文档，但没人记得看。

如果把这份规范变成一个 Skill——一个 AI 能理解、能执行、能持续改进的知识包——会怎样？

这本书从这个真实问题出发，带你从 10 行 SKILL.md 走到一个完整的、可插拔、可评测、可团队协作的 Skill 工程体系。

## 阅读指引

- **想快速上手**：直接翻 [附录 A：5 分钟快速入门](book/appendix/A-quick-start-5min.md)
- **想系统学习**：从第 1 章开始顺序阅读，每章末尾的 🔨 实战与 `skills/code-review-snapshots/` 对应
- **想直接用**：`skills/code-review/` 是可以直接复制到 `.claude/skills/` 的完整 Skill
- **想创建自己的 Skill**：从 `templates/skill-starter/` 开始

## 仓库结构

```
book/           # 书稿（Markdown）
skills/         # 可直接使用的 Skill 产物 + 各章渐进快照
examples/       # 各章独立示例代码
templates/      # 可复用的 Skill 脚手架模板
playground/     # 读者练习区
```

## 配套的主线案例

全书围绕 `code-review` Skill 展开，从最简版到最终形态共 9 个快照：

| 快照 | 对应章节 | 新增能力 |
|------|----------|----------|
| v1-minimal | 第 5 章 | 10 行基础审查 |
| v2-structured-output | 第 7 章 | 结构化输出（严重度分级） |
| v3-dynamic-context | 第 8 章 | 接入 `gh pr diff` |
| v4-external-knowledge | 第 9 章 | 内置 + 外置知识分层 |
| v5-pluggable-rules | 第 10 章 | 插件化规则体系 |
| v6-with-scripts | 第 11 章 | TypeScript 脚本 |
| v7-log-and-scoring | 第 12 章 | 审查日志 + 自评分 |
| v8-hooks | 第 13 章 | Hooks 自动化 |
| v9-subagent | 第 14 章 | 子代理协作执行 |

## 技术栈

- 运行环境：Claude Code
- 脚本语言：TypeScript（通过 tsx 直接执行）
- 规范标准：[Agent Skills](https://agentskills.io) 开放规范
