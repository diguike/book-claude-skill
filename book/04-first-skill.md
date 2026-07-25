---
title: 第一个 Skill——从 SKILL.md 到上线
feishu_url: "https://fivwvysqdz.feishu.cn/docx/ZTK0dUjcyojndjxPqumcpMhunMg"
last_synced: "2026-06-03T14:13:32Z"
---

到这里你已经知道 Skill 是什么、为什么这样设计、它和 MCP/Plugin/Agent 的边界。是时候动手做一个能跑的。

这一章会三件事一气呵成：

1. **运行前提**：装 Claude Code、对账号要求的简短交代
2. **5 分钟最短路径**：跟着敲完你就有了第一个能用的 Skill
3. **SKILL.md 的完整结构和字段**：从 hello-world 走到真正的工程化

如果你只想先体验，跳到"5 分钟最短路径"。如果你已经熟悉 5 分钟入门体验，跳到"SKILL.md 的完整结构"。

## 运行前提

Skill 的运行载体是 Claude Code（或其他兼容 Agent Skills 规范的客户端）。开始之前确认：

- **Claude Code 版本**：建议 2.1.x 或更新。这本书很多 frontmatter 字段（`paths`、`when_to_use`、`shell`、`disable-model-invocation` 等）需要相对新的版本支持。`claude --version` 查
- **Claude 账号**：Claude Code 在 Pro / Max / Team / Enterprise 计划下都能用。免费版能跑基础对话但 Skill 是付费功能。完整账号要求见 [code.claude.com](https://code.claude.com) 的官方文档
- **运行时**：本书代码示例大多是 TypeScript，通过 `npx tsx` 直接执行。需要 Node.js 20+（用 nvm 装最方便）
- **Shell**：默认假设 bash 或 zsh（macOS/Linux）。Windows PowerShell 用户在某些章节会看到额外说明，对应 frontmatter 的 `shell: powershell` 字段

如果你还没装 Claude Code，从这里开始：[code.claude.com](https://code.claude.com)。后续步骤假设 `claude` 命令已经能在终端跑起来。

## 5 分钟最短路径

不讲理论，先跑一个能用的 Skill，体会一下"有 Skill"和"没 Skill"的区别。

### 场景

你让 Claude 解释一段代码，它通常会逐行翻译——正确但无聊，读完跟没读一样。

你真正想要的是：一个类比帮你秒懂，一张 ASCII 图看清流程，再点出容易踩的坑。

这种"解释风格"的偏好，说一次可以，每次都说就烦了。Skill 就是干这个的。

### 第 1 步：创建目录

```bash
mkdir -p ~/.claude/skills/explain-code
```

`~/.claude/skills/` 是 **personal scope**——这里的 Skill 在你所有项目里都生效。如果你想让 Skill 只在某个项目可见，路径改成 `<项目>/.claude/skills/`。

### 第 2 步：写 SKILL.md

```bash
cat > ~/.claude/skills/explain-code/SKILL.md << 'EOF'
---
name: explain-code
description: "用类比和图解的方式解释代码。当用户问'这段代码干什么'、'解释一下这个函数'、'这个模块怎么工作的'时使用。"
---

解释代码时，按这个结构来：

1. **一句话概括**：这段代码在做什么，用一句大白话说清楚
2. **类比**：找一个日常生活中的类比，帮助理解核心逻辑
3. **流程图**：用 ASCII art 画出代码的执行流程或数据流向
4. **逐段解读**：分段解释关键逻辑，跳过显而易见的部分
5. **容易踩的坑**：指出一个初学者容易误解或犯错的地方

语气保持口语化，像是在白板前给同事讲解。
EOF
```

总共 15 行。

### 第 3 步：试一下

打开 Claude Code：

```bash
claude
```

扔一段代码给它：

```
解释一下这段代码：

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

### 效果对比

**没有 Skill 时**：

> 这个函数接收 `value` 和 `delay` 两个参数。它使用 `useState` 创建了一个状态 `debouncedValue`。在 `useEffect` 中，它设置了一个 `setTimeout`，在 `delay` 毫秒后更新 `debouncedValue`。清理函数会清除定时器。当 `value` 或 `delay` 变化时，effect 会重新执行。

正确，但读完你还是不太确定"为什么要这么写"。

**有 Skill 后**：

> **一句话概括**：用户狂敲键盘时别急着响应，等他停下来再说。
>
> **类比**：就像电梯关门——有人按按钮，门就重新计时。只有没人再按了，门才真正关上。每次 `value` 变化就是"有人按了按钮"，`delay` 就是电梯等待的秒数。
>
> **流程图**：
> ```
> value 变化
>     │
>     ▼
> 清掉上一个定时器
>     │
>     ▼
> 启动新定时器（delay ms）
>     │
>     ├── delay 内 value 又变了 ──→ 回到顶部
>     │
>     └── delay 到了，没有新变化
>             │
>             ▼
>       更新 debouncedValue
> ```
>
> **逐段解读**：核心就一个 `useEffect`。每次 value 变化时先清掉旧定时器（`clearTimeout`），再设新的。这样只有最后一次变化会真正生效。
>
> **容易踩的坑**：别忘了 `delay` 也在依赖数组里。如果你把 `delay` 写成一个每次渲染都变的表达式（比如直接传对象属性），会导致 effect 疯狂重跑，debounce 形同虚设。

同样的问题，信息密度和可理解性完全不同。

### 这就是一个 Skill

一个文件夹，一个 `SKILL.md`，没了。

你刚才做的事情：把"我希望你每次都这样回答"写成了一个可复用的指令文件。Claude 会在合适的时机自动加载它。

接下来这一章会把 SKILL.md 的所有可用字段讲清楚，让你能写出更复杂的 Skill——能调用工具、读取文件、执行多步检查。

## SKILL.md 的两部分结构

一个 SKILL.md 文件由两部分组成：frontmatter 和 body。没了。

```
---
name: code-review                    ← frontmatter（YAML）
description: "审查代码质量"
---
                                     ← 分隔线之后是 body
你是一个代码审查者。审查时关注……     ← body（Markdown）
```

Frontmatter 用 `---` 包裹，里面是 YAML 格式的元数据，告诉平台"这个 Skill 叫什么、什么时候触发、给它什么权限"。Body 是 Skill 被触发后 AI 读到的完整指令——你的所有策略、规则、输出格式，全写在这里。

两者分工明确：**frontmatter 管调度，body 管执行**。

## Frontmatter 全字段

完整的字段表（包括 Claude Code 平台扩展）：

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | Skill 唯一标识，kebab-case，≤ 64 字符 | `code-review` |
| `description` | string | 触发条件描述，≤ 1024 字符 | `"审查代码的质量、安全性..."` |
| `when_to_use` | string | description 的补充，trigger phrases 和示例请求 | `"PR review 时；用户说 review、check"` |
| `argument-hint` | string | 用户输入 `/name` 后的自动补全提示 | `[PR-number]` |
| `arguments` | string/list | 命名位置参数，配合 `$name` 用 | `[issue, branch]` |
| `disable-model-invocation` | boolean | `true` 时 AI 不会自动触发，只能用户手动 `/name` | `true` |
| `user-invocable` | boolean | `false` 时从 `/` 菜单隐藏，只能 AI 调用 | `false` |
| `allowed-tools` | string/list | 预授权工具，跳过权限弹窗 | `Bash(git add *) Read` |
| `disallowed-tools` | string/list | 该 Skill 激活时禁用的工具 | `AskUserQuestion` |
| `model` | string | 覆盖默认模型 | `claude-sonnet-4-6` |
| `effort` | string | 覆盖努力等级 | `high` |
| `context` | string | 设 `fork` 在子代理隔离上下文运行 | `fork` |
| `agent` | string | `context: fork` 时的代理类型 | `Explore` |
| `hooks` | object | 该 Skill 生命周期内的 hooks | 见第 12 章 |
| `paths` | string/list | 限制 Skill 只在路径匹配时激活 | `src/**/*.ts` |
| `shell` | string | body 内联命令的 shell | `bash` / `powershell` |
| `metadata` | object | 自由扩展键值对，用来放 version/owner/changelog | 见第 24 章 |

几个容易忽略的细节：

- `description` 不是给人看的摘要，是给 AI 看的触发条件。写法应该是"当用户说 X / 问 Y / 要求 Z 时使用"，而不是"这个 Skill 可以做什么"
- `description` 和 `when_to_use` 拼接后在 skill listing 里被截断到 **1536 字符**。所以关键的触发关键词放前面
- `allowed-tools` 支持通配符。`Bash(git *)` 表示授权所有 `git` 开头的命令。不需要的权限别给——最小授权原则
- `context: fork` 适合耗时长或输出量大的任务，子代理结束后把结果汇报回主对话
- `paths` 字段对 monorepo 场景特别有用：让前端 Skill 只在 `packages/frontend/**` 激活，避免在后端代码里误触发

## 字符串替换变量

Body 中可以使用以下变量，Claude Code 在运行时替换：

| 变量 | 说明 | 示例 |
|------|------|------|
| `$ARGUMENTS` | 用户传入的完整参数字符串 | `/review fix login bug` → `"fix login bug"` |
| `$ARGUMENTS[N]` / `$N` | 第 N 个参数（从 0 开始） | `/review 123 main` → `$0`="123" `$1`="main" |
| `$name` | frontmatter `arguments` 里声明的命名参数 | `arguments: [issue, branch]` → `$issue` `$branch` |
| `${CLAUDE_SESSION_ID}` | 当前会话 ID | `sess_abc123` |
| `${CLAUDE_EFFORT}` | 当前 effort 等级 | `low` / `medium` / `high` / `xhigh` / `max` |
| `${CLAUDE_SKILL_DIR}` | 当前 Skill 的目录绝对路径 | `/home/user/.claude/skills/review-pr` |

实际用法：

```yaml
---
name: review-pr
description: "审查指定 PR 的代码变更。当用户说'review PR 123'或'看看这个 PR'时使用。"
argument-hint: "[PR-number]"
arguments: "pr_number"
allowed-tools: "Bash(gh pr view *) Bash(gh pr diff *)"
---

审查 PR #$pr_number 的代码变更。

步骤：
1. 运行 `gh pr diff $pr_number` 获取变更内容
2. 逐文件审查，关注 bug 风险和安全问题
3. 运行 `gh pr view $pr_number` 了解 PR 描述和上下文
4. 给出总结和改进建议
```

`${CLAUDE_SKILL_DIR}` 在 Skill 需要读取同目录下的参考文件时特别有用：

```markdown
先读取 ${CLAUDE_SKILL_DIR}/references/team-knowledge/naming-conventions.md 了解团队命名规范，
然后按规范审查代码。
```

为什么要 `${CLAUDE_SKILL_DIR}` 而不是相对路径？因为 Skill 装在 plugin 里时（第 25 章会讲），文件实际路径会改变。用环境变量让 Skill 在任何安装位置都能正确引用自己的文件。

## 作用域层级

Skill 可以放在四个位置，优先级从高到低：

| 作用域 | 路径 | 生效范围 |
|--------|------|----------|
| Enterprise | 组织托管设置 | 全组织所有成员 |
| Personal | `~/.claude/skills/` | 你参与的所有项目 |
| Project | `.claude/skills/` | 仅当前项目 |
| Plugin | `<plugin>/skills/` | 装了 plugin 的地方 |

同名 Skill 的覆盖规则：高优先级赢。Personal 和 Project 都有 `code-review`，Personal 的生效。Plugin 用 `plugin-name:skill-name` 命名空间，永远不和其他级别冲突。

选择哪个作用域？

- **你个人的工作习惯**（翻译风格、解释偏好）→ Personal
- **团队的工程规范**（review 标准、提交格式）→ Project，提交到 git
- **组织级安全策略** → Enterprise（通过 managed settings）
- **跨项目复用 + 一组配套能力** → Plugin（第 25 章）

### Monorepo 自动发现

Project 级 Skill 不只看启动目录的 `.claude/skills/`，还会向上一直找到 repo 根，向下按需找子目录。在 `packages/frontend/` 里启动 Claude Code，会自动加载：

- `packages/frontend/.claude/skills/`
- `packages/.claude/skills/`
- 仓库根的 `.claude/skills/`

这套机制让 monorepo 各 package 可以有自己专属的 Skill，又能共享根目录的通用 Skill。

### Live change detection

Claude Code 监听 `~/.claude/skills/`、项目 `.claude/skills/`、`--add-dir` 加进来的 `.claude/skills/` 三个位置的 `SKILL.md` 变化。改完保存就生效，session 不需要重启。

```
session 跑着，你在另一个终端：vim ~/.claude/skills/code-review/SKILL.md，改完保存
当前 session 在下一个 turn 就用新内容
```

写 Skill 的迭代过程因此可以非常快。但生产环境的纪律不同，第 24 章会讲。

## Skill 与 CLAUDE.md 的区别

新手最常见的困惑：什么东西该写在 CLAUDE.md 里，什么该做成 SKILL.md？

| | CLAUDE.md | SKILL.md |
|---|-----------|----------|
| 加载时机 | 始终在上下文中 | 触发时才加载 |
| 定位 | 项目级背景知识和规则 | 按需触发的能力包 |
| 触发方式 | 自动，每次对话都在 | 通过 description 匹配或 `/命令` |
| 评测体系 | 无 | 有（evals.json + benchmark） |
| 生命周期 | 随项目存在 | 有独立的创建/迭代/退出流程 |

判断标准：

- **所有对话都需要的背景信息**（项目架构、技术栈、编码规范）→ CLAUDE.md
- **特定场景按需使用的能力**（代码审查、生成 changelog、部署）→ SKILL.md

一个典型错误：把 review 规则全塞进 CLAUDE.md。这意味着每次跟 Claude 聊天——哪怕只是问一个语法问题——都得带上几百行 review 规则。浪费 token，还可能干扰无关任务。

反过来，把"本项目用 TypeScript + React，包管理器是 pnpm"写成 Skill 也不合适，因为几乎每次对话都需要这个信息。

简单记：**CLAUDE.md 是"我是谁"，SKILL.md 是"我能做什么"**。

## Skill 内容的生命周期

第 24 章会详细讲。这里先建立基本概念：

- 你 / AI 调用一个 Skill，SKILL.md 的完整 body 进入对话上下文，**整个 session 都在**
- Claude Code 不会在后续 turn 重新读 SKILL.md。所以指令要写成"标准规则"，而不是一次性步骤
- 长 session 触发 auto-compaction 时，被调用过的 Skill 内容会被特殊对待：保留每个 Skill 最近一次的前 5000 token，所有 Skill 共享 25000 token 上限
- 如果 Skill body 太长（建议 < 500 行），把详细参考资料拆到 `references/` 里，第 8 章会展开

## 实战：创建 code-review v1

回到第 1 章的 code review 场景。你已经了解了完整配置选项，来创建一个最小但完整的版本：

```bash
mkdir -p .claude/skills/code-review
```

`.claude/skills/code-review/SKILL.md`：

```yaml
---
name: code-review
description: "审查代码的质量、安全性和可维护性。当用户说'review 这段代码'、'帮我看看这个 PR'、'检查一下代码质量'时使用。"
---

你是一个严格但友善的代码审查者。审查时关注：

1. **Bug 风险**：空指针、未处理异常、边界条件
2. **安全问题**：XSS、注入、敏感信息泄露
3. **可维护性**：命名清晰度、函数长度、重复代码

对每个问题标注严重度：P0 / P1 / P2

最后给出总体评价和一个 1-10 的评分。
```

15 行。没有 `allowed-tools`，没有 `context: fork`，没有花哨的参数传递。这就是 v1-minimal——能用，但还有很大改进空间。

对应快照目录 `skills/code-review-snapshots/v1-minimal/`。

后续章节会逐步加入参考文件、工具授权、结构化输出，把它从"能用"变成"好用"。第 5 章是描述与触发的精细打磨，第 6 章是指令写作艺术，第 7 章是动态上下文注入。一步步往下走，到第 15 章你会有一个 v9-subagent 形态的完整 Skill。

---

> 本章来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/skill-guide](https://github.com/diguike/skill-guide)
