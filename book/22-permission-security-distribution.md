---
title: 第 22 章 权限、安全、分发与退役
feishu_url: "https://fivwvysqdz.feishu.cn/docx/JqLBddJq6o79fCxhTqCc3HxBnKd"
last_synced: "2026-06-03T14:13:32Z"
---


## 三种调用模式

每个 Skill 都有两个开关：用户能不能手动调用、AI 能不能自动触发。两个开关的组合产生三种模式：

| 配置 | 用户可调用 | AI 可自动触发 | 典型场景 |
|------|-----------|-------------|---------|
| 默认（两个都不设） | 是 | 是 | 代码审查、解释代码、生成测试 |
| `disable-model-invocation: true` | 是 | 否 | 部署、发消息、删除操作 |
| `user-invocable: false` | 否 | 是 | 背景知识、编码规范、内部约定 |

第一种是默认行为，不需要额外配置。大部分 Skill 用这种就行。

第二种是给有副作用的操作准备的。部署到生产环境、给客户发消息、删除数据库——这些操作你不希望 Claude 自己判断"现在应该部署一下"然后自动触发。必须由人明确输入 `/deploy` 之类的命令才执行。

```yaml
---
disable-model-invocation: true
---
```

第三种看起来反直觉：用户不能调用，但 AI 可以。典型用途是编码规范。你不需要用户输入 `/coding-standards` 来激活规范，你希望 Claude 在写代码的时候自动把规范纳入考量。这种 Skill 更像是"始终生效的背景知识"。

```yaml
---
user-invocable: false
---
```

一个简单的判断标准：**如果这个 Skill 执行后会改变外部系统的状态（发请求、写数据库、推代码、发消息），加上 `disable-model-invocation: true`。** 其他情况用默认就好。

## allowed-tools：最小权限原则

`allowed-tools` 决定了 Skill 被激活后，Claude 能使用哪些工具。这是安全控制的核心。

### 反面教材

```yaml
---
allowed-tools:
  - Bash(*)
  - Read(*)
  - Write(*)
---
```

这等于没有任何限制。Skill 激活后 Claude 可以执行任意命令、读写任意文件。如果 SKILL.md 的指令被注入了恶意内容（比如通过动态上下文引入的用户输入），攻击者可以拿到完整的系统访问权限。

### 正面示例

一个只需要查看 PR 信息的代码审查 Skill：

```yaml
---
allowed-tools:
  - Bash(gh pr diff *)
  - Bash(gh pr view *)
  - Bash(gh pr checks *)
  - Read(*)
---
```

只允许三个 `gh pr` 子命令和读文件。不能写文件，不能执行其他命令。

一个生成 SQL 查询的 Skill：

```yaml
---
allowed-tools:
  - Bash(psql --host=readonly-replica *)
  - Read(*.sql)
---
```

只能连接只读副本，只能读 `.sql` 文件。即使出了问题，也不会写入生产数据库。

### 权限粒度

`Bash()` 的权限匹配是前缀匹配 + 通配符：

- `Bash(git log *)` — 允许 `git log` 开头的任何命令
- `Bash(npm test)` — 只允许 `npm test`，不允许 `npm test --coverage`
- `Bash(npm test*)` — 允许 `npm test` 及其所有变体

注意 `Bash(git *)` 会允许 `git push --force`。如果你只想允许只读的 git 操作：

```yaml
---
allowed-tools:
  - Bash(git log *)
  - Bash(git diff *)
  - Bash(git show *)
  - Bash(git status)
---
```

逐个列出，不要图省事用 `Bash(git *)`。

## Skill() 权限规则

当一个 Skill 需要调用另一个 Skill 时，也需要显式授权：

```yaml
# 允许调用特定 Skill
allowed-tools:
  - Skill(code-review)
  - Skill(commit-message *)
```

也可以在 settings 层面控制 Skill 的调用权限：

```json
{
  "permissions": {
    "allow": [
      "Skill(code-review)",
      "Skill(generate-tests *)"
    ],
    "deny": [
      "Skill(deploy *)"
    ]
  }
}
```

`deny` 优先级高于 `allow`。如果你想禁用所有 Skill 的自动调用：

```json
{
  "permissions": {
    "deny": ["Skill"]
  }
}
```

这会阻止所有 Skill 之间的链式调用，但不影响用户直接触发。

## 安全检查清单

每个进入 project scope 或 enterprise scope 的 Skill，review 时过一遍这个清单：

### 1. 动态注入的命令是否有注入风险

```markdown
当前分支的最近提交：
`!`git log --oneline -5``
```

这行没问题，因为命令是固定的。但如果是这样：

```markdown
查询用户指定的表：
`!`psql -c "SELECT * FROM $0"``
```

用户输入 `users; DROP TABLE users; --` 会发生什么？不要在动态命令中直接拼接用户输入。用脚本来处理参数校验：

```markdown
`!`scripts/safe-query.sh "$0"``
```

在脚本里做输入验证和转义。

### 2. scripts/ 中的脚本是否泄露敏感信息

检查要点：

- 有没有硬编码的 API key、token、密码
- 有没有把敏感数据写入临时文件（`/tmp` 下的文件可能被其他进程读取）
- HTTP 请求有没有把 Authorization header 打印到日志
- 错误处理有没有输出完整的数据库连接字符串

### 3. allowed-tools 是否过于宽泛

前面已经讲过，这里补充一个检查方法：把 allowed-tools 列表里的每个权限展开，想一下"如果有人恶意利用这个权限，能造成什么后果"。如果后果不可接受，缩小范围。

### 4. references/ 中是否包含敏感信息

`references/` 目录的内容会被注入到 Claude 的上下文中。如果里面有 API key，等于在跟 Claude 的每次对话中都暴露了密钥。

这个问题比想象中常见。有人会把内部 API 文档放到 references/ 里，文档中的示例代码包含了真实的 API key。

**规则：references/ 中的任何文件都应该能安全地公开。** 如果不能，就不该放在那里。

## 分发机制

Skill 写好了，怎么让该用的人用上？四种方式。

### Project skills

最常见的方式。把 Skill 放在项目根目录的 `.claude/skills/` 下，随代码一起提交到 Git。

```
my-project/
├── .claude/
│   └── skills/
│       ├── code-review/
│       │   └── SKILL.md
│       └── db-check/
│           ├── SKILL.md
│           └── scripts/
│               └── check.sh
├── src/
└── ...
```

优点：版本管理跟代码一致，PR review 自然覆盖 Skill 变更。

缺点：只在这一个项目中可用。

### Monorepo 自动发现

如果是 monorepo 结构，Claude Code 会自动发现嵌套的 `.claude/skills/` 目录：

```
monorepo/
├── .claude/
│   └── skills/           ← 全局 Skill
│       └── org-standards/
├── packages/
│   ├── frontend/
│   │   └── .claude/
│   │       └── skills/   ← 前端专用 Skill
│   └── backend/
│       └── .claude/
│           └── skills/   ← 后端专用 Skill
```

当你在 `packages/frontend/` 下工作时，前端专用的 Skill 和全局 Skill 都可用。不需要额外配置。

### Plugin

当一组 Skill 需要跨多个项目共享时，用 Plugin。

创建一个独立的仓库或目录，包含 `skills/` 文件夹，然后在使用方的 `.claude/settings.json` 中引用：

```json
{
  "plugins": [
    "/path/to/shared-skills"
  ]
}
```

适合的场景：公司级的编码规范、通用的 review checklist、共享的部署流程。

### Enterprise managed

通过组织管理后台统一下发给所有成员。管理员在后台配置后，所有人的 Claude Code 会自动加载这些 Skill。

适合的场景：安全策略、合规检查、强制执行的编码规范。这些不是"建议遵守"，是"必须遵守"。

用户无法修改或禁用 enterprise managed 的 Skill。

## 选择建议

| 团队规模 | 推荐方式 | 理由 |
|---------|---------|------|
| 个人 | `~/.claude/skills/` | 最简单，不影响别人 |
| 项目团队（2-10 人） | `.claude/skills/` 提交到 repo | 随代码版本管理，PR review 覆盖 |
| 多项目组织（10-50 人） | Plugin | 一处维护，多处引用 |
| 大型组织（50+ 人） | Enterprise managed | 统一管控，强制执行 |

这不是互斥的。大型组织通常同时使用多种方式：enterprise managed 处理安全策略，plugin 共享通用工具，project skills 处理项目特定需求。

## 权限分层的实际案例

我们团队的权限配置是这样分层的：

**Enterprise managed（管理员配置）：**
- `security-scan` — 每次 PR 强制运行，检查敏感信息泄露
- `coding-standards` — 背景知识型，`user-invocable: false`

**Plugin（共享仓库）：**
- `code-review` — 所有项目通用的 review 流程
- `commit-message` — 统一的 commit message 格式

**Project skills（各项目自己的）：**
- `db-migration-checker` — 只有后端项目需要
- `component-generator` — 只有前端项目需要

**Personal（个人偏好）：**
- `explain-like-5` — 我喜欢让 Claude 用简单语言解释复杂概念
- `meeting-notes` — 我个人整理会议记录的格式

每一层覆盖的范围不同，维护责任也不同。enterprise managed 出了问题是管理员的事，project skills 出了问题是提交者的事，personal skills 出了问题是你自己的事。

### Skill 的版本管理与 Breaking Change

Skill 没有正式的包管理系统，但这不代表版本问题不存在。你的 code-review Skill 的输出格式从 Markdown 表格改成了 JSON，下游有个 CI 脚本解析这个表格生成报告——改完就炸了。

**什么算 breaking change：**

- 输出格式变更（Markdown → JSON、表格列顺序调整）
- 新增必填参数（原来不传参也能跑，现在必须传 PR 编号）
- 删除或重命名 references/ 中的规则文件（其他 Skill 可能引用了它）
- 修改 `allowed-tools` 导致原有工作流权限不足

**处理策略：**

改之前先想一下"谁在用这个 Skill 的输出"。如果有 CI 脚本、有其他 Skill 依赖、有团队成员已经形成了使用习惯，那就是有下游消费者。处理方式：

1. PR 描述中明确标注 `BREAKING CHANGE`，说明改了什么、影响范围
2. 在 `scripts/` 中做向后兼容——比如同时输出旧格式和新格式，给下游迁移窗口
3. 团队 Slack / 飞书群里通知一声，别让别人自己发现

**版本号建议：**

不需要搞完整的 semver，但至少在 SKILL.md 中留个版本标记：

```markdown
<!-- version: 2.0 -->
<!-- breaking: 输出格式从 Markdown 表格改为 JSON -->
```

HTML 注释不会影响 AI 的理解，但给维护者提供了变更历史的线索。当有人问"这个 Skill 什么时候改的输出格式"时，你有据可查，不用翻 git log 一条条看。

如果你的 Skill 只有自己在用、没有脚本依赖、输出只给人看不给机器解析——那不用管版本，直接改就是了。版本管理的成本只在有下游依赖时才值得付出。

第 24 章会讲完整的版本演进、灰度发布、回退流程。本节作为 governance 视角的一个引子。

## Skill 退役

跟"准入"对应，治理体系里另一条不能缺的链路是"退出"。Skill 不是写完就永远在的。业务变化、技术演进、规范更新，都会让某些 Skill 失去价值，但很少有人主动下线它们——这是治理债务的主要来源。

### 退役的触发信号

把这几个信号定期检视，是 Skill owner 团队的工作：

- **触发率降为 0**：Skill 三个月没被自动触发过。可能是 description 过时（关键词不再匹配真实用户表述），也可能是真没人用了
- **底层业务消失**：Skill 依赖的系统或流程已经下线。比如 review 规则里有一条针对老 webpack 配置的检查，但项目已经全部迁到 Vite
- **被新 Skill 取代**：组里出了一个更好的版本，老的从来没正式下线
- **eval pass_rate 持续偏低**：连续 6 轮 eval 都过不去 0.5，且没人有时间修

第一种信号最常被忽略。Skill 装着不痛不痒，但每次启动 Claude Code 都占用 description budget（第 24 章），更新基线时还要分配维护成本。**僵尸 Skill 是治理债务**。

### 退役流程

不是直接 `rm -rf`。需要一个软着陆：

**Stage 1：deprecation notice（4-8 周）**

在 SKILL.md 里加显著标记：

```yaml
---
name: legacy-webpack-review
description: "（已废弃，将于 2026-09-01 删除）审查 webpack 配置..."
metadata:
  status: "deprecated"
  deprecated_at: "2026-06-01"
  removal_date: "2026-09-01"
  replacement: "vite-review"
---

> ⚠️ **DEPRECATED**: 本 Skill 将于 2026-09-01 删除。
>
> 项目已迁移到 Vite，请使用 `vite-review` 代替。
> 迁移文档：[references/migration-from-webpack.md](references/migration-from-webpack.md)

[原指令保留]
```

`description` 前面加"（已废弃）"提示词，AI 在召回时能识别。原指令保留，让仍依赖的人有缓冲期。

**Stage 2：归档（删除前 2 周）**

通过 `disable-model-invocation: true` 让 AI 不再自动召回，但用户主动 `/skill-name` 还能用：

```yaml
disable-model-invocation: true
```

发邮件/IM 提醒"这个 Skill 还有 2 周下线"。

**Stage 3：删除**

git rm 整个 Skill 目录，commit message 引用 deprecation 期：

```bash
git rm -r .claude/skills/legacy-webpack-review/
git commit -m "remove deprecated webpack-review skill (deprecated 2026-06, removed 2026-09)

Replaced by vite-review. Migration doc was at references/migration-from-webpack.md."
```

### Plugin 分发 Skill 的退役

如果 Skill 是通过 plugin 分发的（第 25 章），退役方式不同：

- **marketplace 端**：把 plugin 标记为 `deprecated`，停止接受新 install
- **不能强制 uninstall**：用户机器上已经装的 plugin 还在工作。只能通过 marketplace 元数据 + 通知方式提醒升级
- **保留旧版本至少 6 个月**：以便依赖该版本的用户有迁移时间

### Enterprise managed Skill 的退役

通过 managed settings 强制下发的 Skill，退役需要 IT 流程：

1. IT 团队在 managed settings 里把 Skill 标记为 deprecated
2. 全员通知 + 文档
3. 一段缓冲期后从 managed settings 里移除——此时所有员工的 Claude Code 启动时不再加载这个 Skill
4. 监测有没有用户报反馈"Skill 不工作了"

Enterprise 场景下退役**风险最低代价最高**——影响所有员工的工作流，必须有充分前置通知。

### Owner 季度审计

owner team 每季度做一次审计：

| 项 | 检查内容 |
|---|---------|
| 触发率 | 过去 3 个月有没有真实使用 |
| eval pass_rate | 是否持续达标 |
| 依赖的下游系统 | 还在用吗 |
| 维护负担 | 最近有没有人在改 |
| 是否被取代 | 有没有更好的新 Skill |

发现"该退役的"，进入 deprecation 流程。这套机制最重要的不是"删 Skill"，而是**让 Skill 库保持新陈代谢**——Skill 是会过期的工程产物，不是会议纪要那种"留着以后查"的资料。

权限越大，审查越严，分发范围越广，责任越大。退出也一样——分发范围越大，退役流程越长。这不是什么新道理，就是软件治理的常识在 Skill 管理中的体现。

---

> 本章来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
