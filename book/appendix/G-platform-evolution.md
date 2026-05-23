# 附录 G：平台演进与版本兼容性

## Agent Skills 开放规范

Skill 遵循 [Agent Skills](https://agentskills.io) 开放规范，目前被 30+ 平台支持，包括 Claude Code、GitHub Copilot、VS Code、Cursor、OpenHands、Junie 等。

规范定义了 Skill 的核心结构：
- SKILL.md 文件格式
- Frontmatter 基础字段
- 目录组织约定

各平台可能在规范基础上扩展自己的字段（如 Claude Code 的 `context: fork`、`agent`、`hooks` 等）。

## 应对平台更新的策略

### 1. 区分规范字段和平台字段

| 类型 | 示例 | 稳定性 |
|------|------|--------|
| 规范字段 | name, description, allowed-tools | 高（跨平台通用） |
| 平台字段 | context, agent, hooks, effort | 中（可能随 Claude Code 版本变化） |

建议：核心逻辑只依赖规范字段，平台特有字段做注释说明。

### 2. 不依赖未文档化行为

- 只使用官方文档中列出的 frontmatter 字段
- 不假设特定的上下文窗口大小
- 不依赖 compaction 的具体行为

### 3. 脚本的兼容性

- TypeScript 脚本通过 `npx tsx` 执行，不依赖全局安装
- 避免使用平台特有的 shell 语法（保持 POSIX 兼容）
- 脚本的输入输出用 JSON，不依赖特定的文本格式

### 4. 持续关注

- 规范更新：[agentskills.io](https://agentskills.io)
- Claude Code 更新：[code.claude.com/docs](https://code.claude.com/docs)
- 社区讨论：[github.com/anthropics/skills](https://github.com/anthropics/skills)

## 版本标记建议

在 SKILL.md 中用注释标记依赖的平台特性：

```yaml
---
name: code-review
description: "..."
context: fork          # Claude Code specific
agent: Explore         # Claude Code specific
allowed-tools: "Bash(gh pr *)"
---
```

这样在迁移到其他平台时，可以快速识别需要调整的部分。

### 模型升级导致 Skill 行为变化

模型升级（比如 Sonnet 4 → Sonnet 4.5）不改你的 SKILL.md 一个字，但 Skill 的行为可能变了。常见的变化包括：输出格式微调（AI 自作主张加了 emoji 或换了措辞）、对模糊指令的理解发生偏移、审查的严格度变化。

**应对方式：** 模型升级后跑一轮 eval，把结果和上一版 benchmark 对比。如果 eval 全过且输出质量没退化，不用管。如果某些 case 挂了，看是指令需要调整还是模型的新行为更合理——有时候新模型的理解反而更好，是你的 eval 预期该更新了。

**什么时候锁模型版本：** frontmatter 的 `model` 字段可以指定模型。适合锁定的场景：输出格式严格、下游有脚本解析、CI pipeline 依赖 Skill 的输出结构。这些场景下模型升级带来的格式漂移会直接导致下游挂掉，锁住版本是最稳妥的选择。

```yaml
---
model: claude-sonnet-4-20250514
---
```

**什么时候不锁：** 大部分情况。如果你的 Skill 输出是给人看的（代码审查意见、解释文档、技术方案），不锁模型可以自动享受升级带来的质量提升——更好的推理、更准的判断、更自然的表达。锁了反而是给自己设上限。

经验法则：**有脚本解析输出的 → 锁。给人看的 → 不锁。** 拿不准的先不锁，等出问题了再锁也不迟。

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
