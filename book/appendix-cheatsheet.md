---
title: 附录 · Skill 速查表
feishu_url: "https://fivwvysqdz.feishu.cn/docx/L1bidQixWof3VAxf1oKcjxxrn9f"
last_synced: "2026-06-03T14:13:32Z"
---

写 SKILL.md 时常翻这页。所有字段、变量、设置项、命令一张表搞定。

## Frontmatter 字段全表

### Agent Skills 规范字段（跨平台通用）

| 字段 | 类型 | 必填 | 约束 / 默认 | 用途 |
|------|------|------|------------|------|
| `name` | string | 是 | ≤ 64 字符，kebab-case，不以 `-` 开头/结尾，无连续 `--`，必须与目录名一致 | Skill 唯一标识 |
| `description` | string | 是 | ≤ 1024 字符 | 触发条件，AI 用它决定何时召回 |
| `license` | string | 否 | — | 许可协议名称或文件引用 |
| `compatibility` | string | 否 | ≤ 500 字符 | 环境兼容性（目标产品、系统包、网络要求等） |
| `metadata` | object | 否 | 任意键值对 | 自由扩展，推荐用来放 version/owner/changelog |
| `allowed-tools` | string/list | 否 | 实验性 | 预授权工具列表 |

### Claude Code 平台扩展字段

| 字段 | 类型 | 必填 | 约束 / 默认 | 用途 |
|------|------|------|------------|------|
| `when_to_use` | string | 否 | 拼接在 description 后，总长 ≤ 1536 字符 | 补充 trigger phrases 和示例请求 |
| `argument-hint` | string | 否 | — | 自动补全提示，如 `[issue-number]` |
| `arguments` | string/list | 否 | — | 命名位置参数，配合 `$name` 替换变量 |
| `disable-model-invocation` | boolean | 否 | `false` | `true` 时 AI 不自动触发，只能用户 `/name` |
| `user-invocable` | boolean | 否 | `true` | `false` 时从 `/` 菜单隐藏，仅 AI 可调用 |
| `disallowed-tools` | string/list | 否 | — | 该 Skill 激活时禁用的工具 |
| `model` | string | 否 | session 默认 | 覆盖默认模型 |
| `effort` | string | 否 | session 默认 | `low` / `medium` / `high` / `xhigh` / `max` |
| `context` | string | 否 | inline | 设 `fork` 在子代理隔离上下文运行 |
| `agent` | string | 否 | `general-purpose` | `context: fork` 时的代理类型：`Explore` / `Plan` / `general-purpose` / 自定义 |
| `hooks` | object | 否 | — | 该 Skill 生命周期内的 hooks（见第 12 章） |
| `paths` | string/list | 否 | — | 限制激活路径的 glob：`src/**/*.ts` |
| `shell` | string | 否 | `bash` | 内联命令的 shell：`bash` / `powershell` |

### Name 字段规则

- 仅允许：小写字母、数字、连字符 `-`
- 不允许：大写字母、空格、下划线、连续连字符 `--`
- 不以 `-` 开头或结尾
- 最大 64 字符
- 必须与父目录名一致

```yaml
# ✅ 有效
name: pdf-processing
name: code-review
name: data-analysis

# ❌ 无效
name: PDF-Processing    # 不允许大写
name: -pdf              # 不能以 `-` 开头
name: pdf--processing   # 不允许连续 `-`
name: file_processor    # 不允许下划线
```

### Description 写作要点

1. **前置关键信息**：description + when_to_use 拼接被截断到 1536 字符，关键关键词放前面
2. **前半句说能力，后半句列触发场景**
3. **用用户的自然语言**，不是技术术语
4. **宁可激进（多触发）不要保守（漏触发）**
5. **多语言团队覆盖多语言表述**

```yaml
# ✅ 好的 description
description: "审查代码的质量、安全性和可维护性。当用户说 review、审查、检查代码、看看这个 PR、帮我 check 一下时使用。"

# ❌ 差的 description
description: "A code review tool"
```

### allowed-tools 语法

```yaml
# 字符串形式（空格分隔）
allowed-tools: "Bash(git add *) Bash(git commit *) Read"

# 列表形式
allowed-tools:
  - "Bash(git add *)"
  - "Bash(git commit *)"
  - "Bash(npx tsx *)"
  - "Read"

# 通配符
allowed-tools: "Bash(git:*) Bash(jq:*)"
```

## 字符串替换变量

Skill body 中的变量，Claude Code 在运行时替换：

| 变量 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `$ARGUMENTS` | 字符串 | 用户传入的完整参数字符串 | `/review fix login bug` → `"fix login bug"` |
| `$ARGUMENTS[N]` | 字符串 | 第 N 个参数（从 0 开始，shell-style 引号） | `/review "fix x" main` → `$ARGUMENTS[0]`="fix x" |
| `$N` | 字符串 | `$ARGUMENTS[N]` 的简写 | `$0` 第一个参数，`$1` 第二个 |
| `$name` | 字符串 | frontmatter `arguments` 里声明的命名参数 | `arguments: [issue, branch]` → `$issue` `$branch` |
| `${CLAUDE_SESSION_ID}` | 字符串 | 当前会话 ID | `sess_abc123` |
| `${CLAUDE_EFFORT}` | 字符串 | 当前 effort 等级 | `low` / `medium` / `high` / `xhigh` / `max` |
| `${CLAUDE_SKILL_DIR}` | 路径 | 当前 Skill 的目录绝对路径 | `/Users/x/.claude/skills/code-review` |

Plugin 内还有：

| 变量 | 类型 | 说明 |
|------|------|------|
| `${CLAUDE_PLUGIN_ROOT}` | 路径 | plugin 安装目录的绝对路径，**升级时会变** |
| `${CLAUDE_PLUGIN_DATA}` | 路径 | plugin 的持久化数据目录，升级保留 |
| `${CLAUDE_PROJECT_DIR}` | 路径 | 项目根目录 |
| `${user_config.KEY}` | 字符串 | 用户在安装 plugin 时输入的配置 |

### 使用示例

```yaml
---
name: review-pr
argument-hint: "[PR-number]"
arguments: "pr_number"
allowed-tools: "Bash(gh pr *)"
---

审查 PR #$pr_number 的代码变更。

## PR 上下文

!`gh pr view $pr_number --json title,body,labels`

## 变更内容

!`gh pr diff $pr_number`

## 审查后处理

运行统计脚本：
`npx tsx ${CLAUDE_SKILL_DIR}/scripts/collect-metrics.ts`
```

注意事项：

- 参数为空时，`$0` 会被替换为空字符串，不报错
- `${CLAUDE_SKILL_DIR}` 始终是绝对路径，适合脚本调用
- 动态注入命令 `` !`command` `` 中也可以用这些变量
- 多词参数要在调用时加引号：`/my-skill "hello world" second` → `$0`="hello world"

## settings.json 关键设置

| 设置 | 类型 | 默认 | 用途 |
|------|------|------|------|
| `skillOverrides` | object | `{}` | 单个 Skill 的显示策略，4 个值：`on` / `name-only` / `user-invocable-only` / `off` |
| `skillListingBudgetFraction` | number | `0.01` | skill listing 占总上下文的预算比例（1% = 200K 模型 2000 token） |
| `maxSkillDescriptionChars` | number | `1536` | 单个 Skill description+when_to_use 拼接的字符上限 |
| `disableSkillShellExecution` | boolean | `false` | 禁用 SKILL.md 中 `!`command`` 内联命令执行（managed setting 常用） |
| `pluginConfigs.<plugin>.options` | object | — | plugin 安装时输入的 userConfig 值 |
| `mcpServers` | object | — | MCP Server 配置 |
| `permissions` | object | — | Allow/Deny 规则，包括 `Skill(name)` 形式 |

### skillOverrides 四个状态

| 值 | AI 看到 | `/` 菜单 |
|----|---------|---------|
| `on`（默认） | 名字 + 描述 | 显示 |
| `name-only` | 只看到名字 | 显示 |
| `user-invocable-only` | 看不到 | 显示 |
| `off` | 看不到 | 不显示 |

```json
// .claude/settings.local.json
{
  "skillOverrides": {
    "legacy-context": "name-only",
    "deprecated-deploy": "off"
  }
}
```

### Skill 权限规则

```text
# 允许指定 Skill
Skill(commit)
Skill(review-pr *)

# 禁用指定 Skill
Skill(deploy *)

# 禁用所有 Skill
Skill
```

## evals.json schema

```json
{
  "skill_name": "code-review",
  "baseline_pass_rate": 0.85,
  "evals": [
    {
      "id": "complex-pr-001",
      "name": "审查涉及多文件的 PR",
      "description": "测试 Skill 能否处理跨文件的复杂 PR",
      "prompt": "review 当前 PR 的所有变更",
      "workspace": "test-complex-pr",
      "setup": {
        "command": "git checkout fixtures/complex-pr"
      },
      "assertions": [
        { "id": "covers-all-files", "text": "...", "type": "must" },
        { "id": "grouped-output", "text": "...", "type": "should" }
      ],
      "timeout_ms": 120000
    }
  ]
}
```

| 字段 | 必填 | 语义 |
|------|------|------|
| `skill_name` | 是 | Skill 名称 |
| `baseline_pass_rate` | 是 | 当前 baseline，CI 退化检测用 |
| `evals[].id` | 是 | 稳定 ID，CI 报告引用 |
| `evals[].name` | 是 | 人类可读名称 |
| `evals[].prompt` | 是 | 给 AI 的输入 |
| `evals[].workspace` | 是 | 测试数据目录（相对 Skill 根），runner 会 chdir 进去 |
| `evals[].setup` | 否 | 跑测试前的准备动作 |
| `evals[].assertions` | 是 | 断言列表 |
| `evals[].assertions[].type` | 否 | `must`（必须通过）/ `should`（应该通过） |
| `evals[].timeout_ms` | 否 | 单用例超时，默认 60 秒 |

## Plugin manifest schema 摘要

`<plugin>/.claude-plugin/plugin.json`：

| 字段 | 必填 | 用途 |
|------|------|------|
| `name` | 是 | 唯一标识，kebab-case |
| `displayName` | 否 | UI 中显示的人类可读名 |
| `version` | 否 | SemVer，不写则用 git SHA |
| `description` | 否 | 简介 |
| `author` | 否 | `{ name, email, url }` |
| `homepage` / `repository` | 否 | 文档和源码 URL |
| `license` | 否 | 许可协议 |
| `defaultEnabled` | 否 | 默认 true。设 false 让 plugin 装上但不启用 |
| `userConfig` | 否 | 安装时引导式输入的配置项 |
| `dependencies` | 否 | 依赖其他 plugin |
| `skills` / `agents` / `commands` / `hooks` / `mcpServers` / `lspServers` / `outputStyles` | 否 | 自定义组件路径 |

### Path behavior

| 字段 | 行为 |
|------|------|
| `skills` | 追加到默认 `skills/` 目录 |
| `commands` / `agents` / `outputStyles` | **替换**默认目录 |
| `hooks` / `mcpServers` / `lspServers` | 自有合并规则 |

所有路径必须以 `./` 开头、相对 plugin 根。

### Plugin 安装作用域

| scope | settings 文件 | 适合 |
|-------|--------------|------|
| `user` | `~/.claude/settings.json` | 个人跨项目 |
| `project` | `.claude/settings.json` | 团队共享，commit 到 git |
| `local` | `.claude/settings.local.json` | 项目内个人化，gitignored |
| `managed` | enterprise managed | IT 强制下发 |

## 常用命令速查

### Skill 相关

```bash
# 看当前可用 Skills
> What skills are available?

# 直接调用 Skill
/skill-name [args]

# 重启 Claude Code 重新加载所有 plugin
/reload-plugins
```

### Plugin marketplace

```bash
# 添加 marketplace
/plugin marketplace add <user>/<repo>

# 安装 plugin
/plugin install <plugin>@<marketplace>

# 安装指定版本
/plugin install <plugin>@<marketplace>@<version>

# 升级
/plugin update <plugin>@<marketplace>

# 启用 / 禁用 / 卸载
claude plugin enable <plugin>
claude plugin disable <plugin>
claude plugin uninstall <plugin> [--keep-data]

# 验证 plugin manifest
claude plugin validate ./my-plugin [--strict]
```

### 排障

```bash
# 看 skill listing budget 是否 overflow、哪些 Skill 被截断
/doctor

# 看版本
claude --version
```

## SemVer 在 Skill 上的语义

| 变更类型 | 版本变化 | 例子 |
|---------|---------|------|
| 调整 description 触发词 | patch | 加入 "check" 同义词 |
| 改输出格式（含义不变） | patch | "严重度" → "优先级" |
| 新增 reference 文件 | minor | 增加 `references/security-rules.md` |
| 新增 / 删除断言点 | minor | 多检查 SQL 注入 |
| **改输出格式（破坏下游）** | **major** | emoji 标记 → P0/P1 文本 |
| **删除一类规则** | **major** | 不再检查 React 特定问题 |

major 变更必须走灰度（第 24 章）。

## 关键文档链接

- Agent Skills 规范：[agentskills.io/specification](https://agentskills.io/specification)
- Claude Code Skill 文档：[code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- Plugin reference：[code.claude.com/docs/en/plugins-reference](https://code.claude.com/docs/en/plugins-reference)
- 官方示例 marketplace：[github.com/anthropics/skills](https://github.com/anthropics/skills)
- Agent Skills 社区：[github.com/agentskills/agentskills](https://github.com/agentskills/agentskills)

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/skill-guide](https://github.com/diguike/skill-guide)
