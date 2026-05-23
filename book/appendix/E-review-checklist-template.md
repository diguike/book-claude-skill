# 附录 E：Skill Review Checklist 模板

PR 审查 Skill 变更时，逐项检查。

## 结构

- [ ] SKILL.md 存在且 frontmatter 格式正确（`---` 分隔）
- [ ] `name` 字段 kebab-case，≤64 字符，无大写/空格/下划线
- [ ] `description` ≤ 250 字符，前置关键用例
- [ ] frontmatter 只包含已知字段（name/description/allowed-tools/...）
- [ ] 目录结构清晰（rules/ references/ scripts/ evals/ 按需使用）

## 内容

- [ ] 指令使用祈使句（"检查..."而非"你应该检查..."）
- [ ] 每条指令有 why 解释（"因为...会导致..."）
- [ ] 无 ALL-CAPS 命令（无 MUST/NEVER/ALWAYS 全大写）
- [ ] 无冗余指令（删掉 AI 本来就会做的事）
- [ ] 输出格式有明确模板
- [ ] 有正反示例（❌/✅ 对比）

## 质量

- [ ] `evals/evals.json` 存在，至少 2 个测试用例
- [ ] 断言可验证（有具体条件，不是"输出是好的"）
- [ ] pass_rate ≥ 上一版 baseline
- [ ] with_skill vs without_skill 有可衡量的 delta

## 安全

- [ ] `allowed-tools` 遵循最小权限（不是 `Bash(*)`）
- [ ] 无敏感信息硬编码（API key、密码、内部 URL）
- [ ] 有副作用的操作设置了 `disable-model-invocation: true`
- [ ] 动态注入命令无注入风险

## 性能

- [ ] SKILL.md body < 500 行
- [ ] 非必需的知识放在 references/（按需加载）
- [ ] 规则文件单个 < 200 行
- [ ] 大型参考文件有目录索引

## 团队规范

- [ ] 变更有对应的 eval 运行结果
- [ ] PR 描述说明了修改原因和影响
- [ ] 如果是新增 Skill，有 Owner 指定
- [ ] 如果修改了输出格式，通知了依赖该格式的下游脚本

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
