---
name: commit-message
description: "生成符合 Conventional Commits 规范的 commit message。当用户说'提交'、'commit'、'写个 commit message'时使用。"
disable-model-invocation: true
argument-hint: "[描述]"
allowed-tools: "Bash(git diff *) Bash(git add *) Bash(git commit *)"
---

根据暂存区的变更生成 commit message。

## 变更内容

!`git diff --cached --stat`

## Commit Message 规范

格式：`<type>(<scope>): <subject>`

type 必须是以下之一：
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构（不改变行为）
- `docs`: 文档
- `style`: 格式调整（不影响逻辑）
- `test`: 测试
- `chore`: 构建/工具/依赖

规则：
- subject 用中文，不超过 50 字
- scope 用英文，表示影响的模块
- 不以句号结尾
- 用祈使语气（"添加"而非"添加了"）

## 流程

1. 分析 `git diff --cached` 的内容
2. 判断变更类型（feat/fix/refactor/...）
3. 确定 scope（哪个模块）
4. 生成 commit message
5. 向用户确认后执行 `git commit -m "..."`
