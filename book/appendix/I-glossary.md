# 附录 I：术语表

按英文术语字母顺序排列。"首次出现"指本书中正式引入该概念的章节。

| 英文术语 | 中文 | 定义 | 首次出现 |
|----------|------|------|---------|
| Agent Skills 规范 | Agent Skills 规范 | 开放的 Skill 格式标准，定义了 SKILL.md + 目录结构的约定，被 30+ 平台采用 | 第 1 章 |
| Assertion | 断言 | evals.json 中的可验证陈述，用于判定 Skill 输出是否达标，必须能判定 true/false | 第 4 章 |
| Blind Comparison | 盲比 | 将两个输出匿名呈现后评分，消除评测者的确认偏差 | 第 3 章 |
| Compaction | 上下文压缩 | 上下文窗口快满时，Claude Code 自动将历史消息压缩为摘要以释放空间 | 第 15 章 |
| Context Fork | 上下文分叉 | 设置 `context: fork` 让 Skill 在隔离的子代理中运行，不污染主会话上下文 | 第 14 章 |
| Delta 思维 | Delta 思维 | 评测 Skill 价值时衡量"有 Skill - 无 Skill"的差异，而非绝对输出质量 | 第 4 章 |
| Description | 触发描述 | SKILL.md frontmatter 中的字段，Claude Code 据此决定是否自动加载该 Skill | 第 6 章 |
| Dual-role Evaluation | 双角色评测 | 同时评判两件事：Skill 的输出质量和断言本身的质量 | 第 3 章 |
| Dynamic Context Injection | 动态上下文注入 | 在 SKILL.md 中用 `!`command`` 语法，加载时执行 shell 命令并将结果注入上下文 | 第 8 章 |
| eval | 评测 | 测试 Skill 效果的完整过程，包括 with/without 对比、断言判定、指标计算 | 第 4 章 |
| Frontmatter | 前置元数据 | SKILL.md 开头 `---` 包裹的 YAML 区域，包含 name、description 等元数据 | 第 5 章 |
| Knowledge Stacking | 知识叠加 | 多个 Reference 型 Skill 同时生效，各自注入领域知识，互不冲突 | 第 16 章 |
| Lean Prompts | 精益指令 | 删除不起作用的指令，遵循 fewer > more 原则，让每条指令都可验证 | 第 2 章 |
| Progressive Disclosure | 渐进式信息披露 | Skill 的三级加载机制：metadata（触发判断）→ body（指令）→ resources（资源文件） | 第 2 章 |
| Rule Routing | 规则路由 | SKILL.md 中根据代码类型、文件后缀等条件选择性加载 `rules/` 下的规则文件 | 第 10 章 |
| Self-scoring | 自评分 | Skill 完成任务后对自身输出质量打分，用于自动化质量监控 | 第 12 章 |
| Skill Owner | Skill 负责人 | 负责某个 Skill 质量、迭代和评测的团队成员，类似微服务的 owner | 第 19 章 |
| Theory of Mind | 心智理论 | 编写指令时解释 why 而非命令 must，利用 AI 的理解力而非靠硬性约束 | 第 2 章 |
| Three-dimensional Metrics | 三维指标 | `pass_rate x tokens x time` 的评测模型，平衡质量、成本和速度 | 第 4 章 |
| Transcript | 执行日志 | AI 完成任务的完整过程记录，包含工具调用和中间输出，用于调试 Skill | 第 15 章 |
| Trigger Evaluation | 触发评测 | 用 20 条查询（10 条应触发 + 10 条不应触发）测试 description 的准确率 | 第 6 章 |
