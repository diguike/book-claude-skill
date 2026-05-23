---
name: code-review
description: "审查代码的质量、安全性和可维护性。当用户说'review 这段代码'、'帮我看看这个 PR'、'检查一下代码质量'、'这段代码有没有问题'时使用。"
argument-hint: "[PR-number]"
allowed-tools: "Bash(gh pr *) Bash(npx tsx *) Bash(git add *) Bash(git commit *)"
hooks:
  pre-tool-call: |
    如果即将调用的工具会修改文件（写入、删除），中止并提示用户确认。
    审查过程中只允许读取操作和运行统计脚本。
  post-skill: |
    审查完成后，检查是否有 Critical 问题。如果有：
    1. 自动在 PR 上添加 "needs-fix" 标签：gh pr edit $0 --add-label needs-fix
    2. 发一条 PR comment 总结 Critical 问题
---

## PR 上下文

!`gh pr view $0 --json title,body,labels,changedFiles`

## 变更概览

!`gh pr diff $0 --stat`

## 完整 diff

!`gh pr diff $0`

## 审查指令

基于以上 PR 信息，进行代码审查。

### 规则加载

始终加载 [rules/base.md](rules/base.md)。

根据代码内容，额外加载相关规则：
- 包含 `.tsx`/`.jsx` 或 React 导入 → [rules/react.md](rules/react.md)
- 包含安全相关操作（用户输入、SQL、认证）→ [rules/security.md](rules/security.md)

### 严重度标准

- 🔴 **Critical**：必须修复才能合并。安全漏洞、数据丢失风险、线上必现 bug。
- 🟡 **Warning**：建议修复。影响可维护性、潜在的边界 bug、性能隐患。
- 🔵 **Suggestion**：可以考虑。更优雅的写法、微小的性能优化、代码风格。

不要把所有问题都标 Critical——只有真正阻塞合并的才算。

### 参考知识

根据技术栈，按需读取：
- React 项目 → [references/react.md](references/react.md)
- Go 项目 → [references/go.md](references/go.md)

### 输出格式

严格按以下格式输出：

#### 问题列表

| # | 文件 | 行号 | 严重度 | 问题描述 | 修复建议 |
|---|------|------|--------|----------|----------|

#### 总结

- **总体评分**：X/10
- **主要风险**：一句话概括最大的问题
- **亮点**：值得肯定的做法
- **建议优先级**：先修什么，后修什么

### 自我评分

审查完成后，对本次审查质量进行评分（诚实评估，不要虚高）：
- **coverage**（0-1）：你审查了变更文件的多大比例？
- **accuracy**（0-1）：你提出的问题中，有多少是真实存在的问题（而非过度警告）？
- **depth**（0-1）：你是否发现了需要理解业务逻辑才能看出的深层问题？

以 JSON 格式输出 selfScore。

### 审查后处理

审查完成后：
1. 将审查结果保存到临时文件 `/tmp/review-output.md`
2. 运行 `npx tsx ${CLAUDE_SKILL_DIR}/scripts/collect-metrics.ts /tmp/review-output.md` 生成统计
3. 将统计结果和 selfScore 传给 `npx tsx ${CLAUDE_SKILL_DIR}/scripts/append-log.ts data/review-metrics.jsonl '<统计JSON>'` 记录日志
