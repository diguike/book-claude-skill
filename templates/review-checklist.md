# Skill Review Checklist

PR #___  Skill: ___  Reviewer: ___  Date: ___

## 结构
- [ ] SKILL.md 存在且 frontmatter 格式正确
- [ ] name: kebab-case，≤64 字符
- [ ] description: ≤250 字符，前置关键信息

## 内容
- [ ] 指令用祈使句
- [ ] 每条指令有 why 解释
- [ ] 无 ALL-CAPS 命令
- [ ] 有正反示例

## 质量
- [ ] evals/evals.json 存在（≥2 用例）
- [ ] pass_rate ≥ baseline
- [ ] 断言可验证

## 安全
- [ ] allowed-tools 最小权限
- [ ] 无敏感信息硬编码
- [ ] 有副作用的操作设置了 disable-model-invocation: true

## 性能
- [ ] SKILL.md body < 500 行
- [ ] 非必需知识放 references/
- [ ] 规则文件 < 200 行

## 备注

___
