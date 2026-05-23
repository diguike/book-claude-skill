---
name: code-review
description: "审查代码的质量、安全性和可维护性。当用户说'review 这段代码'、'帮我看看这个 PR'、'检查一下代码质量'、'这段代码有没有问题'、'帮我 check 一下'时使用。"
argument-hint: "[PR-number]"
allowed-tools: "Bash(gh pr *) Bash(npx tsx *) Bash(git add *) Bash(git commit *)"
---

## PR 上下文

!`gh pr view $0 --json title,body,labels,changedFiles 2>/dev/null || echo "未指定 PR，将审查当前代码"`

## 变更概览

!`gh pr diff $0 --stat 2>/dev/null || git diff --stat`

## 完整 diff

!`gh pr diff $0 2>/dev/null || git diff`

## 审查指令

基于以上变更内容，进行代码审查。

### 审查维度

1. **Bug 风险**：空指针、未处理异常、边界条件、类型错误、竞态条件
2. **安全问题**：XSS、SQL 注入、敏感信息泄露、未授权访问、CSRF
3. **可维护性**：命名清晰度、函数长度、重复代码、过度耦合、注释质量
4. **性能**：不必要的渲染、内存泄漏、大循环中的重复计算、N+1 查询

### 严重度标准

- 🔴 **Critical**：必须修复才能合并。安全漏洞、数据丢失风险、线上必现 bug。
- 🟡 **Warning**：建议修复。影响可维护性、潜在的边界 bug、性能隐患。
- 🔵 **Suggestion**：可以考虑。更优雅的写法、微小的性能优化、代码风格。

不要把所有问题都标 Critical——只有真正阻塞合并的才算。过度警告会让开发者麻木。

### 规则加载

始终加载 [rules/base.md](rules/base.md)。

根据代码内容，额外加载相关规则：
- 包含 `.tsx`/`.jsx` 或 React 导入 → [rules/react.md](rules/react.md)
- 包含 CSS/SCSS/样式文件 → [rules/css-layout.md](rules/css-layout.md)
- 包含 `platform`/`os` 判断或 React Native → [rules/multi-platform.md](rules/multi-platform.md)
- 包含主题/颜色变量/CSS 变量 → [rules/theme-compat.md](rules/theme-compat.md)
- 包含 `aria-`/`role=`/`tabIndex` → [rules/accessibility.md](rules/accessibility.md)
- 包含文案字符串/i18n 函数 → [rules/i18n.md](rules/i18n.md)
- 所有代码始终检查 → [rules/security.md](rules/security.md)

### 参考知识

根据技术栈，按需读取：
- React 项目 → [references/react.md](references/react.md)
- Vue 项目 → [references/vue.md](references/vue.md)
- TypeScript 严格模式相关 → [references/typescript-strict.md](references/typescript-strict.md)
- API 接口代码 → [references/api-design.md](references/api-design.md)

团队知识（始终参考）：
- [references/team-knowledge/naming-conventions.md](references/team-knowledge/naming-conventions.md)
- [references/team-knowledge/known-pitfalls.md](references/team-knowledge/known-pitfalls.md)
- [references/team-knowledge/architecture-decisions.md](references/team-knowledge/architecture-decisions.md)

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
