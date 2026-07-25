---
title: 动态上下文注入
feishu_url: "https://fivwvysqdz.feishu.cn/docx/OA6nd9LhRoPuxNxfjC8cmMOMnKg"
last_synced: "2026-06-03T14:13:32Z"
---


到目前为止，code-review Skill 有一个明显的问题：用户得自己粘贴代码。

"帮我 review 一下 PR #142"——然后呢？AI 看不到 PR 的 diff，只能回一句"请把代码发给我"。这体验跟没有 Skill 差不多。

如果 Skill 加载时能自动拉取 PR 的 diff、描述、标签，用户只需要说一句话就够了。这就是动态上下文注入要解决的问题。

> **⚠️ 跨平台兼容性提示**
>
> 这一章用到的 `` !`<command>` `` 语法是 **Claude Code 的平台扩展**，不是 [Agent Skills 规范](https://agentskills.io/specification) 的标准字段。其它兼容客户端（Cursor、Gemini CLI、GitHub Copilot 等）多数不支持，把内联命令当成纯文本不执行。
>
> **如果你的 Skill 计划跨平台分发**，本章末尾给出一份"标准规范兼容"版本，把命令注入改成"让 AI 自己 Bash 调用"，跨平台一致。
>
> **如果你的 Skill 只在 Claude Code 内用**，正常用本章语法，能极大减少 AI 自己跑命令的轮次和 token 消耗。
>
> 一个 Skill 中要不要用这个语法，看你的部署场景。后面章节会反复用到——本书的主线 code-review Skill 假设跑在 Claude Code 上。

## `!`command`` 语法

在 SKILL.md 的 body 中，用 `` !`command` `` 包裹 shell 命令。Skill 被触发时，平台会先执行这些命令，把输出结果替换到对应位置，然后整体交给 AI。

单行命令：

```markdown
!`gh pr diff $0`
```

多行命令用代码块，语言标记写 `!`：

````markdown
```!
gh pr view $0 --json title,body,labels
gh pr diff --name-only $0
git log --oneline -10
```
````

多行代码块中的每条命令依次执行，输出拼接在一起。`$0` 是用户传入的第一个参数——上一章讲过的字符串替换变量。

执行时机很重要：这些命令在 Skill 加载阶段就跑了，不是 AI 决定要不要跑。AI 拿到的是已经注入好结果的完整文档。

> **平台兼容性提示**：`` !`command` `` 是 Claude Code 的平台扩展语法，遵循 Agent Skills 规范的其他平台（Cursor、GitHub Copilot 等）可能不支持。如果你的 Skill 需要跨平台使用，替代方案是把数据获取逻辑放在 `scripts/` 中作为预处理脚本，或者在 SKILL.md 中指示 AI 用 Bash 工具自行获取。

## 何时用动态注入 vs 让 AI 自己调工具

不是所有数据都适合预加载。

| 场景 | 推荐方式 | 理由 |
|------|---------|------|
| 每次都需要的上下文（PR diff、PR 描述） | 动态注入 | 一次加载，AI 直接读，省一轮工具调用 |
| 可能需要也可能不需要（某个文件的 git 历史） | 让 AI 用 Bash 工具 | 按需获取，不需要时省 token |
| 大量数据（整个 repo 的文件列表） | 都不推荐 | 先用脚本过滤，只注入有用的部分 |

判断标准：如果这个数据 10 次调用里有 9 次都要用，就注入。偶尔用一次的，让 AI 自己去取。

## 注意事项

**命令失败时会怎样？** 比如用户在一个不是 git 仓库的目录下触发了 Skill，`gh pr diff` 会报错。这时候注入的内容就是那段错误信息。Skill 的指令里最好提一句："如果上面的命令输出了错误信息，告诉用户需要在 git 仓库目录下运行，并确保 gh CLI 已登录。"

**不要注入太多数据。** 一个 500 文件变更的大 PR，完整 diff 可能几万行，直接塞进上下文会撑爆 token 预算。策略是分层加载：先注入 `--stat` 看概览，让 AI 根据概览判断哪些文件需要细看，再用工具拉取具体文件的 diff。

**安全：警惕命令注入。** `$0` 来自用户输入。如果用户传入的不是 PR 编号而是 `; rm -rf /`，你的命令会变成 `gh pr diff ; rm -rf /`。好消息是平台层面对 `!`command`` 做了沙箱处理。但作为习惯，不要在动态注入中拼接复杂的用户输入——简单的 PR 编号没问题，用户传入的任意字符串则建议让 AI 在运行时用工具处理，而不是写进预执行命令。

## 实战：code-review v3 — 接入 gh pr diff

把动态注入加到 v2 上。完整的 `.claude/skills/code-review/SKILL.md`：

```yaml
---
name: code-review
description: "审查代码的质量、安全性和可维护性。当用户说'review 这段代码'、'帮我看看这个 PR'、'检查一下代码质量'时使用。"
argument-hint: "[PR-number]"
allowed-tools: "Bash(gh pr *)"
---

## PR 上下文

!`gh pr view $0 --json title,body,labels,changedFiles`

## 变更概览

!`gh pr diff $0 --stat`

## 完整 diff

!`gh pr diff $0`

## 审查指令

基于以上 PR 信息，进行代码审查。

如果上面的命令输出了错误信息，告诉用户可能的原因：不在 git 仓库目录、gh CLI 未登录、PR 编号不存在。

### 审查关注点

1. **Bug 风险**：空指针、未处理异常、边界条件、竞态条件
2. **安全问题**：XSS、SQL 注入、敏感信息硬编码、不安全的反序列化
3. **错误处理**：所有 async 函数必须有明确的错误处理路径，因为未捕获的 Promise rejection 在生产环境中表现为沉默故障
4. **可维护性**：函数超过 50 行要标记，嵌套超过 3 层要标记，重复代码要标记

### 严重度定义

- 🔴 Critical：必须修复才能合并。判断标准：会导致数据丢失、安全漏洞、或线上崩溃
- 🟡 Warning：建议修复。判断标准：不修会增加未来维护成本或 bug 风险
- 🔵 Suggestion：可选优化。判断标准：有更好的写法，但现有代码不会出问题

拿不准严重度时，宁可往低标。

### 输出格式

严格按照以下格式输出，不要改变表格结构：

#### 问题列表
| # | 文件 | 行号 | 严重度 | 问题描述 | 修复建议 |
|---|------|------|--------|----------|----------|

如果没有发现问题，写"未发现问题"，不要硬凑。

#### 总结
- 总体评分：X/10
- 主要风险：（一句话概括最大的风险点，没有就写"无"）
- 亮点：（代码中做得好的地方，至少写一条）

### 补充调查

如果审查中发现需要了解更多上下文（比如某个被修改函数的调用方、某个配置项的历史变更），使用 `gh` 或 `git` 命令自行查找，不要猜测。
```

相比 v2，变化集中在三处：

1. **Frontmatter 新增了两个字段**。`argument-hint: "[PR-number]"` 让用户输入 `/code-review` 时看到参数提示。`allowed-tools: "Bash(gh pr *)"` 预授权所有 `gh pr` 开头的命令，AI 在审查过程中可以自己跑 `gh pr checks`、`gh pr comments` 等命令追查更多信息，不用每次弹窗确认。

2. **三个动态注入块**。`gh pr view` 拿 PR 的标题、描述和标签，让 AI 理解这个 PR 想做什么。`gh pr diff --stat` 给一个文件变更概览。`gh pr diff` 给完整 diff。三者的顺序是刻意的：先看全局再看细节，和人类审查的习惯一致。

3. **兜底指令**。告诉 AI 命令失败时该怎么回应，以及审查中需要更多上下文时可以自己去查。

用户现在只需要说"review PR 142"，Skill 自动拉取 diff，AI 直接开始审查。从"能用"到"顺手"，差的就是这几行动态注入。

对应快照目录 `skills/code-review-snapshots/v3-dynamic/`。

## 跨平台兼容版本

如果你需要这个 Skill 同时在多个客户端工作，把命令注入改成"让 AI 自己 Bash 调用"的写法：

```yaml
---
name: code-review
description: "审查指定 PR 的代码变更。当用户说 'review PR 123'、'看看 #142'、'帮我审 PR' 时使用。"
argument-hint: "[PR-number]"
allowed-tools: "Bash(gh pr *)"
---

审查 PR #$0 的代码变更。

## 第一步：获取 PR 上下文

先运行以下命令获取信息：

1. `gh pr view $0 --json title,body,labels` 拿 PR 描述
2. `gh pr diff --stat $0` 拿变更概览
3. `gh pr diff $0` 拿完整 diff

如果命令报错（PR 不存在、未登录 gh、网络问题），礼貌告知用户并停止。

## 第二步：审查

[同前]
```

差异在于：
- v3 版本：Skill 加载时平台自动跑 `gh pr diff`，AI 加载完直接看到 diff
- 跨平台版本：Skill 加载后 AI 主动决定跑这些命令

跨平台版本要多花 1-2 个 turn（AI 思考要跑哪些命令、跑、再分析），但能在任何支持 Agent Skills 规范的客户端跑。本书后续主线还是用 Claude Code 扩展版本，但你的 Skill 是否跨平台是你的选择。

---

> 本章来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
