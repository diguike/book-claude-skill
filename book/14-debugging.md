---
title: 调试与排障
feishu_url: "https://fivwvysqdz.feishu.cn/docx/BjmPdbCq8olf0kxwr5Dcrt0Undb"
last_synced: "2026-06-03T14:13:32Z"
---


你写了一个 code-review Skill，security.md 里写得清清楚楚要检查 SQL 注入，结果真跑起来，一段明显的字符串拼接 SQL 就在眼皮底下，它愣是没提。

你的第一反应是在 security.md 里加粗、加 MUST、加 ALWAYS ALWAYS ALWAYS。

别急。先搞清楚它为什么没按预期工作。

## 第一步：读 transcript

transcript 是 AI 的执行日志——它看到了什么、想了什么、调用了哪些工具、输出了什么。在 Claude Code 中可以查看每次执行的详细过程。

读 transcript 时关注三件事：

1. **AI 是否加载了你的 SKILL.md？** 有时候 Skill 根本没被触发，用户说的话没命中 description 里的关键词，AI 就当普通对话处理了。
2. **AI 是否读了你的规则文件？** 你有 5 个 references 文件，但 AI 可能只加载了 3 个。看看 security.md 在不在其中。
3. **AI 对指令是怎么理解的？** 有时候你写的"检查 SQL 注入风险"，AI 理解成"提醒开发者注意 SQL 注入"而不是"逐行扫描拼接 SQL 的代码"。

大部分问题在这一步就能定位。不看 transcript 就改 prompt，等于蒙眼调参。

## 问题定位决策树

```
Skill 没按预期工作
├── 完全没反应
│   ├── description 缺少关键词 → 补充用户的常用表述
│   ├── 被其他 Skill 抢先匹配 → 检查 description 是否有重叠
│   └── 手动用 /skill-name 强制触发，确认 Skill 本身没问题
│
├── 触发了，但指令没被遵循
│   ├── 指令太抽象 → 加具体的代码示例
│   ├── 指令被对话历史冲淡 → 精简 SKILL.md，删掉没用的内容
│   └── 上下文中有矛盾信息 → 检查 references 之间是否打架
│
├── 遵循了，但结果不对
│   ├── 领域知识不足 → 在 references/ 中补充背景
│   ├── 规则太笼统 → 用正反代码示例替代文字描述
│   └── AI 对术语理解有偏差 → 加定义和上下文解释
│
└── 时好时坏
    ├── SKILL.md 太长，尾部内容被 compaction 截断 → 重要指令前移
    ├── 指令有歧义，AI 每次解读不同 → 改写为无歧义表述
    └── 随机性导致 → 用 evals 多次运行，确认是概率问题还是确定性 bug
```

从上往下排查，先确认 Skill 被触发了，再看指令有没有被读到，最后才是调指令的措辞。顺序搞反了会浪费大量时间。

## 上下文窗口用量分析

Skill 的所有内容——SKILL.md 正文、references 文件、动态注入的命令输出——都要占用上下文窗口。如果你的 SKILL.md 加上 5 个 references 文件已经占了上下文的 30%，留给实际代码分析的空间就不够了。AI 被迫在有限空间里做取舍，你的某些规则自然会被"忽略"。

诊断方法很粗暴但有效：把 references 文件删掉一半，看审查效果是否反而更好。如果是，说明你的 Skill 内容超载了。

**Compaction 的影响**更隐蔽。当上下文快满时，Claude Code 会压缩对话历史来腾出空间。压缩时会保留最近触发的 Skill 内容，但如果 Skill 本身就很大，它的尾部也可能被截断。

这就是为什么我们反复强调：重要的指令放在 SKILL.md 的前半部分。放在末尾的"务必检查 SQL 注入"可能正好在 compaction 的裁剪线上。

## 实战：定位一个漏掉的 SQL 注入

场景：code-review 审查一个 Node.js 后端 PR，其中有这样一行：

```typescript
const result = await db.query(`SELECT * FROM orders WHERE user_id = ${req.params.id}`);
```

教科书级的 SQL 注入。但 code-review 没报。

**排查过程：**

1. 看 transcript，确认 security.md 被加载了——确实加载了
2. 找到 security.md 中关于 SQL 注入的描述：

```markdown
### SQL 注入
注意检查 SQL 注入风险。
```

一句话，没了。

问题找到了。"注意检查 SQL 注入风险"这句话对 AI 来说太抽象，它不知道要找什么具体模式。它可能扫了一眼觉得"用了 db.query 看起来是 ORM 的写法，应该没问题"。

**修复**——把抽象规则改成具体的代码模式匹配：

```markdown
### SQL 注入
检查以下模式：
- 模板字符串拼接 SQL：`` `SELECT ... ${variable}` ``
- 字符串拼接 SQL：`"SELECT ... " + variable`
- 未使用参数化查询的裸 SQL 调用

❌ 错误示例：
`db.query(\`SELECT * FROM orders WHERE user_id = ${userId}\`)`

✅ 正确写法：
`db.query('SELECT * FROM orders WHERE user_id = ?', [userId])`
```

修改后重跑，这次立刻报了 Critical。

教训：AI 不是不能发现 SQL 注入，而是你没告诉它要找的具体"形状"是什么。第七章讲的"正反示例"原则，在调试阶段体现得最明显。

## 错误恢复模式

Skill 在运行时会依赖外部资源——脚本执行、子代理调用、文件读取、CLI 工具。这些环节都可能挂掉。与其祈祷一切顺利，不如在 SKILL.md 中预设兜底策略。

| 场景 | 表现 | 应对 |
|------|------|------|
| 脚本执行失败 | `npx tsx` 报错，输出一堆 stack trace | 在 SKILL.md 中加兜底指令："如果脚本执行失败，跳过后处理步骤，直接输出审查结果" |
| 子代理超时 | `context: fork` 的子代理长时间无响应 | 设置合理的超时预期；SKILL.md 中说明"如果子代理未返回结果，用主对话完成剩余审查" |
| references 文件缺失 | Read 工具报 file not found | 在 SKILL.md 中加容错："如果参考文件不存在，用你的通用知识替代，并在输出中标注'未加载团队规则'" |
| 动态注入命令失败 | `` !`gh pr diff` `` 返回错误信息 | 在命令中用 `2>/dev/null \|\| echo "FALLBACK"` 做兜底（v3 快照已展示此模式） |

关键原则：**优雅降级，而不是静默失败。** 兜底策略执行后，必须在输出中告知用户哪个环节降级了、结果可能缺少什么。用户看到"未加载团队规则，以下审查基于通用标准"，至少知道要多看一眼。看到一份看似正常但实际少了一半检查项的报告，才是真正危险的。

## 调试速查表

| 症状 | 最可能的原因 | 快速验证 |
|------|-------------|---------|
| 完全没反应 | description 不匹配 | 用 /skill-name 手动触发 |
| 格式不对 | 输出模板被忽略或截断 | 检查模板位置是否在 SKILL.md 后半段 |
| 部分规则不生效 | 规则文件没被加载 | 在 transcript 中搜索文件名 |
| 结果时好时坏 | 指令有歧义 | 多跑几次 eval 对比结果差异 |
| 审查太浅 | 上下文超载 | 删减 references 后对比效果 |
| 子代理结果为空 | 传参不足 | 检查 $ARGUMENTS 是否包含必要信息 |

## 常见故障与解决方案

下面这份清单合并了实际遇到过的高频问题。按问题类型分组。

### Skill 不触发

**症状**：用户说了相关问题，Claude 用通用方式回答，没用你的 Skill。

诊断步骤：

1. 在 Claude Code 里直接问：`What skills are available?` 看你的 Skill 在不在列表
2. 在列表里但 description 被截断（只显示名字）→ skill listing budget overflow。跑 `/doctor` 确认。解决：调大 `skillListingBudgetFraction`，或把不常用 Skill 设成 `name-only`（见第 24 章）
3. 在列表且 description 完整 → description 关键词没覆盖用户的实际表述。补关键词（包括同义词、口语版本）

**根治**：用 20 条查询测试法（第 5 章）覆盖各种触发表述。

### `!`command`` 不执行，被当成纯文本

**症状**：SKILL.md 里写了 `` !`gh pr diff` ``，AI 看到的是字面字符串而不是命令输出。

可能原因：

1. 你在非 Claude Code 客户端使用（Cursor、Gemini CLI 等）。`!`command`` 是 Claude Code 扩展，跨平台不可用。解决：改用第 7 章的"跨平台兼容版本"
2. 命令前面有非空白字符。`!` 必须出现在行首或紧跟空白后。`KEY=!`cmd`` 不会被识别
3. settings 里启用了 `disableSkillShellExecution: true`。这通常是 managed settings 强制的安全策略，无法绕过

### references 文件读不到

**症状**：SKILL.md 引用了 references/foo.md，AI 报"file not found"或忽略它。

诊断：

1. 引用路径错误。正确用 `${CLAUDE_SKILL_DIR}/references/foo.md` 或相对路径 `references/foo.md`。**不要用绝对路径**（plugin 安装后绝对路径会变）
2. plugin 内但 Skill 装到了 plugin cache，相对路径解析的是 cache 路径不是源文件路径。改用 `${CLAUDE_PLUGIN_ROOT}/references/foo.md`（仅 plugin 内有效）
3. 引用了 `.gitignore` 中的文件，commit 时没被推送上去。检查 `git ls-files .claude/skills/` 看文件是不是真的在 repo 里

### 改了 SKILL.md 但行为没变

**症状**：你刚改了一行，重新跑 Skill，输出和之前一样。

可能原因：

1. 当前 session 已经加载过旧版本，新版本要等下一次 session 或下一次 invocation 生效。Live change detection 对编辑过的文本生效，但已经在 context 里的 Skill 内容不会被替换——直到下次 invocation 重新加载
2. 你改的是 plugin 里的 Skill，但 plugin 是从 marketplace 装的。装的是 cache 里的复制版本，你改源文件不会生效。需要 `/plugin update` 或本地用 `claude --plugin-dir` 直接加载源目录
3. Skill 被 `skillOverrides` 覆盖成 `off` 或 `name-only`。检查 `.claude/settings.local.json`

### Skill 在 monorepo 子目录不工作

**症状**：根目录跑没问题，进入 `packages/frontend/` 跑就不识别 Skill。

可能原因：

1. Skill 在某个父目录的 `.claude/skills/`，应该被自动加载，但实际没加载。检查是不是 Skills-directory plugin（有 `.claude-plugin/plugin.json`）——这种只从启动目录加载，不向上找。要么从 repo 根启动，要么 `/reload-plugins`
2. 你设了 `paths` 字段限定路径。检查 `paths` 是不是把当前路径排除了

### Skill 在 CI 环境失效

**症状**：本地测试通过，CI 跑挂掉。

可能原因：

1. CI 没装 `gh` / `npm` / `tsx` 等依赖。Skill 引用了 host 命令，确认 CI 镜像里有
2. CI 没 ANTHROPIC_API_KEY。eval runner 跑不起来
3. CI 在容器里跑，文件路径可能和本地不同。用 `${CLAUDE_PROJECT_DIR}` 而不是相对/绝对路径
4. CI 没有真实的 git 仓库（fetch-depth: 1），`gh pr diff` 这种依赖完整 git 历史的命令会挂。CI 配置加 `fetch-depth: 0`

### Skill 输出格式漂移

**症状**：上周 Skill 输出还很整齐，这周开始格式乱了。

可能原因：

1. Claude Code 升级了模型版本（默认模型变了）。新模型对相同 prompt 的输出有微妙差异。解决：在 frontmatter 里 pin 一个具体的 `model: claude-sonnet-4-6`
2. 你的 Skill 被 auto-compaction 截掉了（第 24 章）。session 太长，重新调用 Skill 让它完整加载
3. 输出模板写在 SKILL.md 中段，被 AI 忽略。把模板放最后，明确说"按这个格式输出"

### Eval 跑出来 pass_rate 比上次低 0.1+

**症状**：CI 报"Skill 退化"。

诊断步骤：

1. 看 CI 的 eval report（artifact 下载）。具体哪些断言挂了？
2. 是同一批断言连续挂的吗？看第 19 章的"顽固断言"模式——可能是结构性问题
3. 重跑两次 eval，是不是稳定挂的？LLM 输出有随机性，5% 以内波动是正常的
4. 真的退化了 → git revert 引入退化的 commit，或者改 SKILL.md 修

调试 Skill 和调试代码一个道理：先复现，再定位，最后修复。别跳过前两步直接改 prompt——那叫碰运气，不叫调试。

---

> 本章来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
