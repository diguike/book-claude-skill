# AI Skill 实战权威指南（第二版）

> 在线阅读 · [inferloop.dev/claude-skill](https://inferloop.dev/claude-skill)  
> 所有书目 · [inferloop.dev](https://inferloop.dev)

> 以 Claude Code Skill 为实战载体，系统讲解 AI 能力封装的工程化方法论。

## 这本书解决什么问题

团队里 5 个人做 code review，标准不一致。新人总是漏掉安全检查，老人每次重复提相同的意见。你写了一份审查规范文档，但没人记得看。

如果把这份规范变成一个 Skill——一个 AI 能理解、能执行、能持续改进的知识包——会怎样？

这本书从这个真实问题出发，带你从 10 行 SKILL.md 走到一个完整的、可插拔、可评测、可团队协作、可远端动态召回、可通过插件分发的 Skill 工程体系。

## 第二版的主要变化

- 章节扁平化，28 章一眼可见全书结构
- 评测从 3 章合并为 1 章，从空泛方法论改为端到端工程实战
- 新增 Skill vs MCP vs Plugin vs Agent 决策树
- 新增动态 Skill 召回（万级 Skill Hub + Tool RAG）
- 新增 Skill 更新、灰度、回退完整流程
- 新增用 Plugin 分发 Skill
- 补齐前端 review + 后端 API 安全审计两个完整实战
- 附录从 9 个精简到 1 个速查表

## 阅读指引

- **想快速上手**：直接翻 [第 4 章 第一个 Skill](book/04-first-skill.md)，里面"5 分钟最短路径"一节够用
- **想系统学习**：从第 1 章顺序读到第 25 章
- **想看完整案例**：直接读第 26-27 章实战
- **写 SKILL.md 时需要查字段**：常翻 [附录速查表](book/appendix-cheatsheet.md)

## 目录

**[前言](book/00-preface.md)**

- [第 1 章　一个真实的问题：从死文档到活规则](book/01-real-problem.md)
- [第 2 章　Skill 的设计哲学](book/02-design-philosophy.md)
- [第 3 章　Skill 与 MCP、Plugin、Agent 的边界——选型决策树](book/03-skill-vs-mcp-vs-plugin.md)
- [第 4 章　第一个 Skill：从 SKILL.md 到上线](book/04-first-skill.md)
- [第 5 章　描述与触发的艺术](book/05-description-trigger.md)
- [第 6 章　写好 Skill 指令](book/06-instruction-writing.md)
- [第 7 章　动态上下文与跨平台兼容](book/07-dynamic-context.md)
- [第 8 章　知识内外置：什么进 SKILL.md，什么进 references](book/08-knowledge-inline-vs-external.md)
- [第 9 章　可插拔规则：用 rules/ 替代 if-else 堆砌](book/09-pluggable-rules.md)
- [第 10 章　在 Skill 中嵌入脚本](book/10-scripts-in-skill.md)
- [第 11 章　让 Skill 自我记录：日志、评分与趋势](book/11-log-scoring-trend.md)
- [第 12 章　Hooks 自动化与 frontmatter hooks 字段](book/12-hooks.md)
- [第 13 章　子代理协作与 context: fork](book/13-subagent-and-fork.md)
- [第 14 章　调试 Skill：从信号到根因](book/14-debugging.md)
- [第 15 章　Skill 组合与冲突处理](book/15-skill-composition.md)
- [第 16 章　防止 Skill 膨胀](book/16-prevent-bloat.md)
- [第 17 章　团队 Skill 知识库](book/17-team-knowledge-base.md)
- [第 18 章　协作流程与 Checklist](book/18-collaboration-and-checklist.md)
- [第 19 章　让评测真正有用：从 evals.json 到 CI 流水线](book/19-evaluation.md)
- [第 20 章　skill-creator 深度解析：grader/comparator/analyzer 三角色](book/20-skill-creator-deep-dive.md)
- [第 21 章　Skill 准入与治理](book/21-admission-process.md)
- [第 22 章　权限、安全、分发与退役](book/22-permission-security-distribution.md)
- [第 23 章　动态 Skill 召回：万级 Skill Hub 与 Tool RAG](book/23-dynamic-skill-recall.md)
- [第 24 章　Skill 的更新、灰度与回退](book/24-skill-update-and-rollback.md)
- [第 25 章　用 Plugin 分发 Skill](book/25-plugin-distribution.md)
- [第 26 章　实战：前端项目全流程 review Skill](book/26-frontend-review-skill.md)
- [第 27 章　实战：后端 API 安全审计 Skill](book/27-backend-api-security-skill.md)
- [第 28 章　毕业项目：从 0 设计一个生产级 Skill](book/28-graduation-project.md)

**[附录　Skill 速查表](book/appendix-cheatsheet.md)** — frontmatter / 设置项 / 字符串替换变量 / evals.json schema / plugin manifest / 常用命令

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
| v1-minimal | 第 4 章 | 10 行基础审查 |
| v2-structured-output | 第 6 章 | 结构化输出（严重度分级） |
| v3-dynamic-context | 第 7 章 | 接入 `gh pr diff` |
| v4-external-knowledge | 第 8 章 | 内置 + 外置知识分层 |
| v5-pluggable-rules | 第 9 章 | 插件化规则体系 |
| v6-with-scripts | 第 10 章 | TypeScript 脚本 |
| v7-log-and-scoring | 第 11 章 | 审查日志 + 自评分 |
| v8-hooks | 第 12 章 | Hooks 自动化 |
| v9-subagent | 第 13 章 | 子代理协作执行 |

## 技术栈

- 运行环境：Claude Code 2.1.x+
- 脚本语言：TypeScript（通过 tsx 直接执行，需要 Node.js 20+）
- 规范标准：[Agent Skills](https://agentskills.io) 开放规范

## 相关书

来自同一作者的其他书:

- [《Hermes Agent 源码解读》](https://inferloop.dev/hermes-agent)
- [《LLM Infra 工程实战》](https://inferloop.dev/llm-infra)
- [《AI Token 中转站实战》](https://inferloop.dev/llm-gateway)
- [《Agent Memory 工程实战》](https://inferloop.dev/claude-mem)
- [《百万级 AI Agent 平台架构》](https://inferloop.dev/enterprise-agent)
- [《OpenClaw 源码解析》](https://inferloop.dev/openclaw)
- [《Transformer 教学》](https://inferloop.dev/transformer)
- [《Claude 插件官方指南》](https://inferloop.dev/claude-plugins)
- [《自己动手写 AI Agent》](https://inferloop.dev/ling-agent)
