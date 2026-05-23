# 附录 C：字符串替换变量一览

Skill 在加载时会自动替换以下变量。

## 参数变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `$ARGUMENTS` | 用户传入的完整参数字符串 | `/review fix login bug` → `"fix login bug"` |
| `$0` | 第一个参数 | `/review 456` → `"456"` |
| `$1` | 第二个参数 | `/migrate SearchBar React Vue` → `"React"` |
| `$2` | 第三个参数 | 同上 → `"Vue"` |
| `$N` | 第 N 个参数（从 0 开始） | |

## 环境变量

| 变量 | 说明 |
|------|------|
| `${CLAUDE_SKILL_DIR}` | 当前 Skill 的目录绝对路径 |
| `${CLAUDE_SESSION_ID}` | 当前会话 ID |

## 使用示例

```yaml
---
name: review-pr
argument-hint: "[PR-number]"
allowed-tools: "Bash(gh pr *)"
---

审查 PR #$0 的代码变更。

## PR 上下文

!`gh pr view $0 --json title,body,labels`

## 变更内容

!`gh pr diff $0`

## 审查后处理

运行统计脚本：
`npx tsx ${CLAUDE_SKILL_DIR}/scripts/collect-metrics.ts`
```

## 注意事项

- 参数为空时，`$0` 会被替换为空字符串，不会报错
- `${CLAUDE_SKILL_DIR}` 始终是绝对路径，适合在脚本调用中使用
- 动态注入命令 `` !`command` `` 中也可以使用这些变量

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
