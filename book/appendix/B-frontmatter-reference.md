# 附录 B：Frontmatter 字段速查表

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | string | 目录名 | Skill 名称，kebab-case，≤64 字符，不以 `-` 开头/结尾 |
| `description` | string | — | 触发机制描述，≤1024 字符（建议 <250），前置关键信息 |
| `argument-hint` | string | — | 参数提示，显示在自动补全中，如 `[PR-number]` |
| `disable-model-invocation` | boolean | `false` | 为 `true` 时 AI 不会自动触发，仅用户通过 `/name` 调用 |
| `user-invocable` | boolean | `true` | 为 `false` 时用户看不到，仅 AI 能自动触发（背景知识用途） |
| `allowed-tools` | string / list | — | 预授权工具列表，跳过权限确认弹窗 |
| `model` | string | — | 覆盖默认模型 |
| `effort` | string | — | 推理努力等级：`low` / `medium` / `high` / `max` |
| `context` | string | — | 设为 `fork` 在隔离子代理中运行 |
| `agent` | string | — | `context: fork` 时的代理类型：`Explore` / `Plan` / `general-purpose` |
| `hooks` | object | — | Skill 生命周期钩子配置（具体 schema 随平台版本变化，推荐使用 settings.json 配置，见第 13 章） |
| `paths` | string / list | — | 限制 Skill 激活的路径 glob，如 `src/**/*.ts` |
| `shell` | string | — | 内联命令使用的 shell：`bash` / `powershell` |

## Name 规则

- 仅允许：小写字母、数字、连字符 `-`
- 不允许：大写字母、空格、下划线、连续连字符 `--`
- 不以 `-` 开头或结尾
- 最大 64 字符
- 示例：✅ `code-review` ❌ `Code_Review` ❌ `--review`

## Description 编写要点

1. 前半句说能力，后半句列触发场景
2. 用用户的自然语言，不是技术术语
3. 宁可激进（多触发）不要保守（漏触发）
4. 多语言团队覆盖多语言表述

```yaml
# ✅ 好的 description
description: "审查代码的质量、安全性和可维护性。当用户说 review、审查、检查代码、看看这个 PR、帮我 check 一下时使用。"

# ❌ 差的 description
description: "A code review tool"
```

## allowed-tools 语法

```yaml
# 单个工具
allowed-tools: "Bash(git add *)"

# 多个工具（空格分隔）
allowed-tools: "Bash(git add *) Bash(git commit *) Bash(gh pr *)"

# 列表形式
allowed-tools:
  - "Bash(git add *)"
  - "Bash(git commit *)"
  - "Bash(npx tsx *)"
```
