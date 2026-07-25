---
title: Skill 的更新、灰度与回退
feishu_url: "https://fivwvysqdz.feishu.cn/docx/PLfidbEX0okzRexbogVcWSXDnTg"
last_synced: "2026-06-03T14:13:32Z"
---

第 23 章解决了"用户怎么找到对的 Skill"。这一章解决另一个同样重要的问题：**一个已经在用的 Skill，怎么改？**

写 Skill 容易，改 Skill 难。改之前所有人都在用旧版本，改之后所有人立刻用新版本——这是一个无声的"全量发布"，不像应用代码有 PR、有 staging、有逐步放量。如果新版本在某个场景下退化了，等你发现可能已经累计了一千次错误调用。

这一章讲的是工程纪律：把 Skill 当成线上服务来对待，建立版本、灰度、回退的完整流程。

## 三个真实事故先看一下

我从社区收集了三个不同团队踩过的坑，全是真事，名字隐去了。

**事故一**：某 SaaS 团队的 review Skill 加了一条"必须指出潜在的内存泄漏"。本意是让 review 更严格。结果第二天产研抱怨 review 噪音爆炸——AI 在每个 React 组件里都"指出"潜在的 useEffect 内存泄漏，包括那些根本不持有定时器/订阅的纯展示组件。CI 每次都触发"重大风险"评论，导致开发人员开始忽略 review 评论。

根因：description 改动激进，没有跑 eval。新规则让 false positive 率从 2% 升到 27%。

**事故二**：某金融团队的 deploy Skill 加了一个"在生产环境部署前自动跑全量 e2e"的步骤。改完测试了几次没问题就合了。某天周五下午一个紧急 hotfix 走这个 Skill，跑 e2e 跑了 47 分钟，期间用户在线上看到 bug 投诉。

根因：没有差异化测试策略。dev/staging 环境的全量 e2e 用时 5 分钟，生产环境因为数据量大要 47 分钟。Skill 改动只在 staging 验证就合了。

**事故三**：某团队同时改了 code-review、commit-message、explain-code 三个 Skill 的指令格式（把 emoji 严重度标记从 🔴🟡🔵 改成 P0/P1/P2 文本标记）。所有 Skill 都用了同一个共享 references 文件，改了之后影响范围超出预期，下游脚本（解析 Skill 输出做 Jira 自动建单的）全部挂掉。

根因：共享文件没有 owner，没有变更通知，没有 changelog。

这三类事故有一个共同特征：**没有 staging、没有 baseline 对比、没有回退路径**。下面分别给出工程方案。

## 版本号：用 frontmatter 的 metadata

Agent Skills 规范本身不定义版本字段，但 `metadata` 是开放给作者扩展用的。约定一个团队规范：

```yaml
---
name: code-review
description: "..."
metadata:
  version: "2.3.1"
  changelog: "references/CHANGELOG.md"
  owner: "@frontend-platform-team"
  baseline_pass_rate: 0.88
---
```

四个字段：

- **version**：SemVer。major.minor.patch
- **changelog**：相对路径，指向变更日志
- **owner**：哪个团队/个人负责。改这个 Skill 必须经过 owner review
- **baseline_pass_rate**：当前版本的 eval 基线值，第 19 章会展开。CI 用它做退化检测

SemVer 在 Skill 上的语义：

| 变更类型 | 例子 | 版本变化 |
|---------|------|----------|
| 新加一个 reference 文件 | 增加 `references/security-rules.md` | minor |
| 调整 description 触发词 | 增加 "代码评审" 同义词 | patch |
| 改输出格式（含义不变） | 把"严重度"改成"优先级" | patch |
| 增加/删除断言点 | 多检查 SQL 注入 | minor |
| 改 description 触发条件、改输出格式（破坏下游脚本） | 从 emoji 标记改成 P0/P1 文本 | **major** |
| 删除一类规则 | 不再检查 React 特定问题 | **major** |

major 变更必须走灰度发布，下面会讲。

## CHANGELOG 怎么写

每个 Skill 都有一个 `references/CHANGELOG.md`：

```markdown
# code-review Skill CHANGELOG

## 2.3.1 - 2026-03-15

修复：description 在"check 一下这段代码"这种短语下漏触发的问题
- 改动：description 里加上 "check" 关键词
- eval：pass_rate 0.88 → 0.89

## 2.3.0 - 2026-03-10

增加：检查 SQL 注入风险
- 改动：references/security-rules.md 增加 SQL injection 章节
- 涉及断言：security-sql-injection（3 个用例）
- eval：pass_rate 0.85 → 0.88

## 2.2.0 → 2.3.0 升级注意

无破坏性变更，下游脚本无需调整。

## 2.0.0 - 2026-02-01 ⚠️ Breaking Change

破坏性：输出格式从 emoji 严重度（🔴🟡🔵）改为文本标记（P0/P1/P2）
- 原因：emoji 在某些终端显示异常，下游解析也容易出问题
- 影响：所有解析 Skill 输出的脚本必须更新正则
- 迁移指南：references/migration-2.0.md
- 灰度：2026-01-20 ~ 2026-02-01，10% → 50% → 100%
```

写 CHANGELOG 不只是给读者看，更是给自己回滚的时候提供具体信息——出问题时 owner 5 分钟内能定位到"是 2.3.0 引入了哪条规则导致的"，不用一行行 git log。

## live change detection 的工程含义

Claude Code 内置一个机制：监听 `~/.claude/skills/`、项目 `.claude/skills/`、`--add-dir` 加入的 `.claude/skills/` 三个位置的 `SKILL.md` 文本变化。session 不需要重启，改完保存就生效。

```
你在 session 里跑着的 Claude Code
  ↓
你在另一个终端：vim ~/.claude/skills/code-review/SKILL.md，改完保存
  ↓
当前 session 在下一个 turn 就用新内容
```

这个机制对快速迭代很友好（特别是写 Skill 的时候），但在生产环境是双刃剑。如果团队成员通过 git pull 拉到新版本，他们的当前 session 会立刻切换，没有缓冲期。

实际工程纪律：

- **本地开发**：开开心心用 live change detection，改一行试一次
- **共享仓库**：不要靠 git pull 自动生效。新版本通过 Plugin marketplace（第 25 章）有版本管理地发布，用户主动 `/plugin update` 才升级
- **`.claude-plugin/plugin.json` 修改**（hooks、agents、mcp 配置）**不会 live 生效**，需要 `/reload-plugins`

## 灰度发布：在客户端怎么做

服务端服务的灰度发布有成熟工具链（feature flag、流量切分）。Skill 没有服务端，怎么灰度？

三种实操方式。

**方式一：通过 plugin marketplace 的版本通道**

在 marketplace 里同一个 plugin 维护两个版本通道：

```
your-plugin@stable    → 2.2.0
your-plugin@canary    → 2.3.0-rc.1
```

让一部分用户先订阅 canary：

```bash
/plugin install your-plugin@canary
```

观察一周，eval 数据 + 用户反馈都正常后，把 canary 内容 promote 到 stable。

适用：team 内部分发，能划分 early adopters / 普通用户两类人。

**方式二：用 paths 字段做按目录灰度**

frontmatter 的 `paths` 字段限定 Skill 只在某些路径激活：

```yaml
# 准备灰度的新版本
---
name: code-review
metadata:
  version: "2.3.0-canary"
paths: "packages/frontend/**"
---
```

旧版本继续覆盖其他路径：

```yaml
---
name: code-review-legacy
metadata:
  version: "2.2.0"
paths: "packages/backend/**,packages/services/**"
---
```

让前端项目先用新版本，其他项目继续旧版本。一周后，把 paths 限制去掉，让新版本接管全部。

适用：monorepo 场景，能按路径切割流量。

**方式三：disable-model-invocation + 手动调用**

灰度期把新版本设成 `disable-model-invocation: true`，AI 不会自动加载它。让 early adopters 通过 `/code-review-v2.3` 显式调用：

```yaml
---
name: code-review-v2.3
description: "..."
disable-model-invocation: true
metadata:
  version: "2.3.0-rc.1"
---
```

旧版本（不带 disable）继续正常工作。等 rc 验证完，把新版本的 disable-model-invocation 移除，旧版本归档。

适用：单人测试或小范围 alpha，能接受用户手动调用的成本。

## skillOverrides：客户端的开关

Claude Code 在 settings 层面提供了一个开关 `skillOverrides`，能控制单个 Skill 的可见性，**不需要改 SKILL.md**：

```json
// .claude/settings.local.json
{
  "skillOverrides": {
    "code-review-v2.3": "off",
    "legacy-deploy": "name-only"
  }
}
```

四种状态：

| 值 | AI 看到 | `/` 菜单 |
|----|---------|---------|
| `on`（默认） | 名字 + 描述 | 显示 |
| `name-only` | 只看到名字 | 显示 |
| `user-invocable-only` | 看不到 | 显示 |
| `off` | 看不到 | 不显示 |

什么时候用：

- 团队仓库里有 30 个 Skill，但你做后端，只关心 12 个。把另外 18 个设成 `name-only`，节省 description budget（第 5 章讲的那个 1% context 预算）
- 灰度期出问题了，紧急关闭新版本：在 `.claude/settings.local.json` 里把它设成 `off`，比改 SKILL.md 再 commit 快得多
- MCP Server 提供了一个你不想用的 Skill：因为 MCP 提供的 Skill 你改不了源文件，只能从客户端 override

## skillListingBudgetFraction：当 description 被截断时

随着 Skill 数量增长，会到一个临界点：所有 Skill 的 description 加起来超过预算（默认 1% 上下文，200K 模型就是 2000 token）。Claude Code 此时开始截断 description，截断行为遵循"最近用过的 Skill 优先保留完整"原则。

这件事的工程信号是：**新加的 Skill 没人能触发**。因为它们的 description 被截断了，AI 看到的关键词不够，判断"该用哪个"时直接跳过。

排查命令：`/doctor`。它会告诉你 budget 是否 overflow、哪些 Skill 受影响。

三种应对：

**调大预算**：

```json
{
  "skillListingBudgetFraction": 0.02  // 2%，200K 模型变 4000 token
}
```

或者用环境变量：

```bash
export SLASH_COMMAND_TOOL_CHAR_BUDGET=8000
```

**收紧低优先级 Skill 的描述**：把不太常用的 Skill 设成 `name-only`，腾出空间给关键 Skill。

**根本解法**：把超过几十个 Skill 的场景搬到远端 Skill Hub（第 23 章）。客户端只装 2 个 meta-tool，无论后端有 100 还是 10000 个 Skill 都不挤客户端预算。

## 退化检测：让 CI 拦住坏改动

光有版本号和 CHANGELOG 不够，得让 CI 拦住"看起来没事但实际退化"的改动。

回到第 19 章的 `benchmark.json`：

```json
{
  "version": "2.3.0",
  "skill_commit": "abc1234",
  "pass_rate": 0.88,
  "delta": 0.45,
  "total_assertions": 14,
  "passed_assertions": 12,
  "eval_details": [
    { "name": "simple-function", "pass_rate": 1.0 },
    { "name": "complex-pr", "pass_rate": 0.75 },
    { "name": "security-vuln", "pass_rate": 1.0 },
    { "name": "react-component", "pass_rate": 0.67 }
  ]
}
```

CI 流程（GitHub Actions 示例，完整版本在第 19 章）：

```yaml
- name: Run eval and compare with baseline
  run: |
    npx tsx scripts/eval-runner.ts \
      --skill .claude/skills/code-review \
      --output eval-results/summary.json

    NEW_RATE=$(jq -r '.results.with_skill.pass_rate' eval-results/summary.json)
    OLD_RATE=$(jq -r '.pass_rate' .claude/skills/code-review/benchmark.json)
    DIFF=$(echo "$NEW_RATE - $OLD_RATE" | bc)

    if (( $(echo "$DIFF < -0.05" | bc -l) )); then
      echo "::error::pass_rate 退化 $DIFF（$OLD_RATE → $NEW_RATE）"
      exit 1
    fi
```

阈值的选择：5% 是常用值。LLM 输出有随机性，同一个 Skill 同一个 prompt 跑两次 pass_rate 也可能差几个点。如果测试用例足够多（30+ 断言），可以收紧到 3%。

**关键纪律**：基线更新是显式操作。CI 不要自动覆盖 benchmark.json。每次基线提升必须经过：

1. 跑完 eval 确认 pass_rate 真的提升
2. 人工 review eval 结果，确认不是因为断言变弱了（meta-grader 在这里发挥作用）
3. 手动更新 benchmark.json，commit message 说明为什么

```bash
git commit -m "chore(skill): update code-review baseline 0.85 → 0.88

added SQL injection rules. eval pass_rate improved 0.85 → 0.88.
manually reviewed 4 new test cases, improvement is genuine."
```

## 回退：分两种情况

事故发生后回退，分两种场景。

**场景 1：plugin 分发的 Skill**

用 marketplace 的版本机制：

```bash
/plugin install your-plugin@2.2.0  # 锁定旧版本
```

或者 publisher 主动撤回有问题的版本（marketplace 系统层面的功能）。

**场景 2：项目内 `.claude/skills/` 的 Skill**

直接 git revert：

```bash
git revert <bad-commit-sha>
git push
```

团队成员的下一个 turn 就会切回旧版本（live change detection）。

**应急策略**：如果 CI 还没修好、你正在 oncall、必须立刻止血，最快的方式是在自己的 `.claude/settings.local.json` 里把那个 Skill 设成 `off`：

```json
{
  "skillOverrides": {
    "broken-skill": "off"
  }
}
```

这只影响你的本地环境，全团队的修复还是要走 git revert 或者 marketplace 回退。但能争取你接下来调试的几个小时。

## 共享 references 的更新规则

事故三的根因是共享文件没有版本管理。解决办法：

**规则一**：共享 references 有自己的 owner 和 CHANGELOG。

```
.claude/skills/_shared/
  references/
    security-rules.md
    naming-conventions.md
  CHANGELOG.md       ← 这里记所有共享文件的变更
  OWNERS.md          ← 标明每个文件的 owner
```

**规则二**：修改共享文件必须列出"我影响的所有 Skill"。在 PR 描述里：

```markdown
## Change

Updated `security-rules.md`, added section "SQL Injection Patterns".

## Affected Skills

- code-review (referenced by ref `[SQL Injection]`)
- security-audit (referenced by `references/checklist.md`)
- pre-commit-check (NEW reference, expected to use this section)

## Eval requirement

Must re-run eval for affected skills before merging.
```

**规则三**：每个引用共享文件的 Skill 在自己的 frontmatter 里声明：

```yaml
metadata:
  version: "2.3.0"
  depends_on:
    - "_shared/references/security-rules.md@1.2.0"
```

这样如果 shared 文件升级了 major 版本，对应 Skill 必须明确升级 depends_on 并跑 eval，不能装作没看见。

## 自动 compaction 与 Skill 内容生命周期

最后一个工程细节，跟"运行时"相关。

Claude Code 的 session 在上下文将满时会触发自动 compaction：把历史对话压缩成摘要，腾出新的 token。被调用过的 Skill 内容会被特殊对待——保留每个 Skill 最近一次调用时的内容前 5000 token，所有重挂载的 Skill 共享 25000 token 预算。

实际工程含义：

- **长 session 里**，如果你装了一堆 Skill，老的可能在 compaction 后被丢掉。这会让 AI 看起来"忘了"某个 Skill 的指令
- **重要 Skill 应该被重新调用**：如果在长 session 里发现 AI 不再遵守某条 Skill 规则，再调一次（手动 `/skill-name` 或者描述意图触发）就能恢复
- **Skill 内容应该是"标准指令"**：不要在 SKILL.md 里写"上一次你做了 X"这种历史相关内容，因为 compaction 之后会被截掉

这跟你管 SKILL.md 内容长度的纪律是一致的：第 8 章讲过 SKILL.md body 控制在 500 行以内，超过部分放 references/——这个 5000 token 上限是另一个支撑这条纪律的工程理由。

## 一份团队 Skill 更新 SOP

把这一章的内容浓缩成可执行清单，团队照着跑就行。

**改之前**：
- [ ] 在 issue tracker 开一个工单，说明改动目的
- [ ] 确认这次改动的版本号（patch/minor/major）
- [ ] 如果是 major，确定灰度方案（marketplace 版本通道 / paths 限制 / disable-model-invocation）

**改之中**：
- [ ] 在自己分支改 SKILL.md
- [ ] 更新 metadata.version
- [ ] 写 CHANGELOG entry
- [ ] 跑本地 eval，对比 baseline，确认不退化（或退化在可接受范围）

**改之后（PR）**：
- [ ] PR 描述里列出：版本号、改动概要、eval 结果、是否破坏性
- [ ] CI 自动跑 eval、和 benchmark.json 对比、PR 自动评论结果
- [ ] Owner review
- [ ] 合并

**合并后**：
- [ ] 如果 pass_rate 提升，手动更新 benchmark.json（独立 commit）
- [ ] major 版本走灰度发布
- [ ] 灰度结束后通知团队"新版本上线"
- [ ] 24 小时观察期，关注异常报告

**出事后**：
- [ ] 立即在自己环境 `skillOverrides: off` 止血
- [ ] git revert 或 marketplace 回退到上一稳定版本
- [ ] 写事故记录到 CHANGELOG（"撤回 X.Y.Z 因为 ..."）
- [ ] 修问题之后重新走灰度发布

这套 SOP 看起来繁琐，但当你管 50+ 个 Skill 时它就是底线。再往上是 100 个、1000 个，每个 Skill 都按这套走，团队才不会被自己生产的 Skill 拖垮。
