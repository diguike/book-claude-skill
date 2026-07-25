---
title: 实战——前端项目全流程 review Skill
feishu_url: "https://fivwvysqdz.feishu.cn/docx/HlGEd1T9WoE4A1xoX4hcfmYSn4e"
last_synced: "2026-06-03T14:13:32Z"
---

前面 25 章都是分散讲点。这一章把这些点编进一根完整的工程时间线：**一个真实的前端团队，从决定做 Skill 到 Skill 在生产稳定运行，每一步具体怎么走**。

主角是一个 8 人前端团队，做 SaaS 产品的核心面板，React 18 + TypeScript + Vite 栈，PR 每天 3-5 个，review 是质量瓶颈。Lead 决定做一个 code-review Skill 把团队规范固化下来。

这一章按这个团队的真实工程节奏推进。每个工程决策对应到前面的某一章。

## Day 1：决定做 Skill

最朴素的开端：周会上讨论"为什么我们 PR review 评论那么不一致"。

- 老张是 React 老兵，关注 hooks 用法和性能
- 小李是后端转前端，盯着类型安全和错误处理
- 阿明刚毕业，关注样式和 a11y

三个 reviewer，三套标准。新人 PR 走到不同人手里，得到的反馈完全不一样。开发者一脸困惑：到底什么算"好的代码"？

Lead 翻第 1 章和第 2 章的设计哲学，决定写一个 Skill 统一规范。两个原则：

**原则 1**：先列规范的"非协商项"（hard rules）和"团队偏好"（soft rules）。前者每次必出，后者按场景选择性指出。

**原则 2**：先做 v1 跑通流程，不追求一步到位。

## Day 2-3：v1-minimal

按第 4 章的"5 分钟入门"思路：

```bash
mkdir -p .claude/skills/code-review
```

`.claude/skills/code-review/SKILL.md`（v1）：

```yaml
---
name: code-review
description: "审查前端代码（React + TypeScript）。当用户说 review、看看这个 PR、check 代码、帮我审一下时使用。"
metadata:
  version: "0.1.0"
  owner: "@frontend-platform"
---

你是一个严格但友善的前端代码审查者。

## 关注点

1. **类型安全**：禁止 any、unknown 必须收窄、复杂类型用 interface 而非 inline
2. **React 安全**：禁止 dangerouslySetInnerHTML（除非有 DOMPurify 注释）
3. **Hooks 规则**：useEffect 必须有完整依赖数组、cleanup 函数处理订阅/定时器
4. **样式规范**：禁止 inline style、颜色用 design token、间距用 spacing scale
5. **a11y**：button 必须有 type、img 必须有 alt、表单必须有 label

## 输出格式

按文件分组。每个问题：

- 严重度：P0 (会出 bug / 安全问题) / P1 (会让 review 阻塞) / P2 (建议)
- 文件路径 + 行号
- 问题描述
- 修复建议（具体到代码层面）

最后给出总评（1-10 分）。
```

Lead 把这个 commit 到团队仓库 `.claude/skills/`。所有人 pull 之后下次启动 Claude Code 就会自动加载。

Day 3 团队成员各自试用了几个真实 PR。反馈：

- 老张：基本对，但漏了一些 React 性能相关的检查（不必要的 useMemo、过早优化）
- 小李：类型部分检查到位，但没识别出 Promise 链中的错误处理缺失
- 阿明：a11y 太基础，缺少 keyboard navigation 检查

Lead 把这些反馈记下来。

## Day 4-5：写 evals.json，建立基线

按第 19 章的工程化做法，先建评测体系再迭代。

`.claude/skills/code-review/evals.json`（v1）：

```json
{
  "skill_name": "code-review",
  "baseline_pass_rate": null,
  "evals": [
    {
      "id": "any-type",
      "name": "检测 any 类型滥用",
      "prompt": "review src/api/userService.ts",
      "workspace": "test-any-type",
      "assertions": [
        "指出 fetchUser 返回类型用了 any",
        "建议改成具体的 User interface",
        "不误报：fetch 内部的 catch err 是合理使用"
      ]
    },
    {
      "id": "missing-useeffect-deps",
      "name": "检测 useEffect 依赖缺失",
      "prompt": "review src/components/UserProfile.tsx",
      "workspace": "test-useeffect-deps",
      "assertions": [
        "指出 useEffect 缺少 userId 依赖",
        "说明潜在 bug：userId 变化时不会重新 fetch"
      ]
    },
    {
      "id": "xss-risk",
      "name": "检测 XSS 风险",
      "prompt": "review src/components/CommentBox.tsx",
      "workspace": "test-xss",
      "assertions": [
        "指出 dangerouslySetInnerHTML 的 XSS 风险",
        "建议使用 DOMPurify 或改写为安全方式",
        "评估为 P0 严重度"
      ]
    },
    {
      "id": "design-token",
      "name": "检测样式硬编码",
      "prompt": "review src/components/Button.tsx",
      "workspace": "test-design-token",
      "assertions": [
        "指出颜色 #3b82f6 应该用 token-blue-500",
        "指出 padding 16px 应该用 spacing-md"
      ]
    },
    {
      "id": "a11y-missing-alt",
      "name": "检测 a11y 缺失",
      "prompt": "review src/components/Avatar.tsx",
      "workspace": "test-a11y",
      "assertions": [
        "指出 img 缺少 alt 属性",
        "评估为 P1 严重度"
      ]
    }
  ]
}
```

为每个 eval 准备 `test-data/<workspace>/` 目录，里面放一份故意有问题的文件。比如 `test-data/test-any-type/src/api/userService.ts`：

```typescript
export async function fetchUser(id: string): Promise<any> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

跑一遍：

```bash
npx tsx scripts/eval-runner.ts \
  --skill .claude/skills/code-review \
  --evals .claude/skills/code-review/evals.json
```

结果：

```
with_skill:    13/15 通过 → pass_rate 0.87
without_skill:  4/15 通过 → pass_rate 0.27

Delta: +0.60
```

Skill 有效。但漏的两条：

- `xss-risk` 用例里 AI 没评 P0
- `a11y-missing-alt` 用例里 AI 评成了 P2 而不是 P1

把当前结果作为 baseline 提交：

```bash
# benchmark.json
{
  "version": "0.1.0",
  "skill_commit": "abc1234",
  "pass_rate": 0.87,
  "delta": 0.60,
  "total_assertions": 15,
  "passed_assertions": 13
}
```

## Day 6-9：把 Skill 变成多文件结构

v1 是单文件，规则全堆在 SKILL.md 里。随着规则增加，文件会膨胀到几百行。按第 8 章的"知识内外置"原则，把不同类规则拆到 references/ 下。

```
.claude/skills/code-review/
├── SKILL.md                    ← 主指令（< 100 行）
├── references/
│   ├── react-rules.md          ← React/Hooks 详细规则
│   ├── typescript-rules.md     ← 类型相关规则
│   ├── style-rules.md          ← 样式 token 规则
│   ├── a11y-rules.md           ← 无障碍规则
│   └── security-rules.md       ← 安全相关
├── evals.json
├── benchmark.json
└── test-data/
    ├── test-any-type/
    ├── test-useeffect-deps/
    └── ...
```

新的 SKILL.md：

```yaml
---
name: code-review
description: "审查前端代码（React + TypeScript）。当用户说 review、看看这个 PR、check 代码、帮我审一下时使用。"
metadata:
  version: "0.2.0"
  owner: "@frontend-platform"
  changelog: "references/CHANGELOG.md"
---

你是一个严格但友善的前端代码审查者。

## 工作流

1. 先读 `${CLAUDE_SKILL_DIR}/references/security-rules.md`，确认安全规则
2. 根据被审文件的类型，按需读取：
   - React 组件（.tsx）→ `references/react-rules.md` + `references/a11y-rules.md`
   - 工具函数 / hooks（.ts）→ `references/typescript-rules.md`
   - 样式相关 → `references/style-rules.md`
3. 逐文件逐行审查
4. 按下面格式输出

## 输出格式

按文件分组。每个问题：

- 严重度：P0 (bug / 安全) / P1 (review 阻塞) / P2 (建议)
- 文件路径 + 行号
- 问题描述（包括为什么这是问题）
- 具体修复建议（写出实际代码片段）

最后给出总评（1-10 分）。

## 严重度判定

- **P0**：会导致运行时错误、安全漏洞、数据丢失。例如 XSS、SQL 注入、未处理的 Promise rejection、useEffect 死循环
- **P1**：会被 review 拦下来。例如 any 类型、a11y 缺失（缺 alt、缺 label）、硬编码 design token、过期 API 调用
- **P2**：风格建议。例如命名能更好、可以提取公共函数、可以加注释
```

`references/react-rules.md`：

```markdown
# React 审查规则

## Hooks 依赖

useEffect / useMemo / useCallback 的依赖数组必须完整。AI 自己 hooks/exhaustive-deps 能查出 80%，剩下 20% 是 ref.current 这种你以为不需要依赖但需要的场景——遇到时显式说明。

判定：
- 依赖数组里漏了一个变量 → P0（会导致逻辑 bug）
- 依赖数组包含了不必要的对象/数组（每次渲染新引用）→ P1（性能问题）
- 依赖是 ref.current → 评论"通常 ref.current 不需要进依赖，但确认这里的语义"

## Cleanup 函数

包含订阅、定时器、event listener、AbortController 的 useEffect 必须有 cleanup 函数。

举例（缺 cleanup 的 P0 问题）：
```tsx
useEffect(() => {
  const timer = setInterval(() => fetch('/heartbeat'), 1000);
  // 没有 return () => clearInterval(timer)
}, []);
```

修复建议必须给出完整的 cleanup 代码。

## 过早优化

useMemo / useCallback 默认不需要。只在以下情况推荐：
- 传给 memo 的子组件作为 prop
- 依赖项包含昂贵的计算
- 被作为依赖项传给其他 hooks

如果代码里有 useMemo(() => x + 1, [x])，反向建议去掉：增加复杂度但无收益。
```

类似拆出其他几个 references 文件。

## Day 10：发现误报，迭代到 v0.3

Day 9 跑了一周后，有 reviewer 反馈："Skill 太啰嗦，简单的 utility function 也评了一长串。"

Lead 看了几个真实 case，发现问题：Skill 没有"代码规模感"。一个 10 行的 utility 和一个 200 行的复杂组件，AI 用了同一个详细度评论。

引入"按文件规模分级评审"的指令：

```markdown
# 增补到 SKILL.md 工作流

在审查前，先评估文件规模：

- **小文件**（< 30 行）：只指出 P0/P1 问题。不写"建议加注释"这种 P2 评论
- **中文件**（30-150 行）：P0/P1 全部，P2 选最重要的 1-2 个
- **大文件**（> 150 行）：全部级别，但按"组件边界"分块输出（不要一长串列表）
```

跑 eval，加 baseline_pass_rate 不变，但增加几个新用例测"小文件不被过度审查"：

```json
{
  "id": "small-file-not-overreviewed",
  "name": "小文件审查应该简短",
  "prompt": "review src/utils/formatDate.ts",
  "workspace": "test-small-file",
  "assertions": [
    "对这个 8 行的 utility 函数，输出不超过 200 字",
    "只列 P0/P1，不出现 P2 评论",
    "建议至少 1 个针对 NaN 输入处理的具体改动"
  ]
}
```

新一轮 eval：pass_rate 0.93，delta 0.65。更新 benchmark.json，bump version 到 0.3.0。

## Day 15-20：用 context: fork 隔离复杂 review

某次 review 一个大 PR（17 个文件、~800 行变更），AI 跑了 3 分钟才出结果，期间整个 session 上下文被占满，后续的对话 AI 都"思维混乱"。

按第 13 章的 `context: fork` 思路改：

```yaml
---
name: code-review-pr
description: "审查整个 PR（多文件）。当用户说 review PR / review this PR / 审查这个 PR 时使用。"
context: fork
agent: general-purpose
allowed-tools: "Bash(gh pr view *) Bash(gh pr diff *) Bash(gh pr checkout *) Read"
metadata:
  version: "0.4.0"
---

PR 审查模式。会在独立子代理上下文中运行，不污染主对话。

## 工作流

1. `gh pr view --json title,body,labels,files` 获取 PR 元数据
2. `gh pr diff` 获取完整 diff
3. 对每个修改的文件，按第 4 章的"按文件规模分级"标准做评审
4. 最后汇总 review 报告，按文件分组

## 报告结构

```
## Review Summary
PR #123 - 标题

总评：X/10（一句话评价）

## 关键阻断 (P0)
[列出最关键的几个 P0 问题]

## 重要建议 (P1)
[按文件分组]

## 风格建议 (P2)
[简短列表]
```

主 SKILL.md（`code-review`）保留，做单文件审查。新建 `code-review-pr.md` 做 PR 整体审查。两者命名不冲突。

第二次跑大 PR：3 秒完成（子代理跑完直接给汇总报告，主对话不被污染）。

## Day 25：加 hooks 自动跑 lint，避免重复评论

按第 12 章的 hooks 思路：很多 review 评论都在重复 ESLint / TypeScript 的检查（"你这个变量没用到"、"这里类型错了"）。这些纯机械检查应该在 review **之前**自动跑掉，让 Skill 专注真正需要人脑判断的部分。

`.claude/skills/code-review/hooks/hooks.json`（如果你把这个 Skill 装成 plugin 的话，否则在项目 settings.json 里配）：

```json
{
  "PreToolUse": [
    {
      "matcher": "Skill",
      "condition": "skillName == 'code-review' || skillName == 'code-review-pr'",
      "hooks": [
        {
          "type": "command",
          "command": "cd \"${CLAUDE_PROJECT_DIR}\" && npm run lint 2>&1 | tee /tmp/lint-output.txt"
        }
      ]
    }
  ]
}
```

在 SKILL.md 工作流里增加：

```markdown
0. 读 /tmp/lint-output.txt，知道哪些机械错误 ESLint 已经标了
1. 跳过 ESLint 已经覆盖的检查，专注语义和团队规范层面的问题
```

跑 eval：pass_rate 反而略降到 0.91——因为 Skill 现在跳过 ESLint 已经发现的问题，有些 eval 用例期望它指出这些。

解决：调整 eval 期望，"指出语义问题"而非"指出语法错误"。重写几个用例后，pass_rate 0.94，新 delta 0.68（因为 without_skill 不会跳过 ESLint 已查项，输出更冗杂）。

更新 benchmark.json，bump 到 0.5.0。

## Day 30：通过 plugin 分发到其他团队

公司其他三个前端团队也在用相同栈，听说这边的 review Skill 不错，想用。

按第 25 章的 plugin 分发思路：

1. 把 `.claude/skills/code-review/` 整体抽到独立 git 仓库 `frontend-review-plugin`
2. 添加 `.claude-plugin/plugin.json`：

```json
{
  "name": "frontend-review",
  "displayName": "Frontend Code Review",
  "version": "0.5.0",
  "description": "React + TypeScript code review skill with security and a11y rules",
  "author": { "name": "Frontend Platform Team" },
  "repository": "https://gitlab.company.com/platform/frontend-review-plugin"
}
```

3. 在公司内部 marketplace（也是一个 git 仓库）的 plugins/ 下加：

```json
{
  "name": "frontend-review",
  "path": "./plugins/frontend-review"
}
```

其他团队装：

```
/plugin marketplace add gitlab.company.com/platform/company-skills
/plugin install frontend-review@company-skills
```

他们装上之后看到的命令是 `/frontend-review:code-review`、`/frontend-review:code-review-pr`，命名空间清晰。

## Day 40：差异化扩展（不同团队的 a11y 要求不同）

A 团队是 to-B 控制台，对 a11y 要求严格（合规要求）。B 团队是营销页，a11y 要求宽松。

按第 9 章的"可插拔规则"思路，引入团队级 a11y 配置：

```
frontend-review/
├── SKILL.md
├── references/
│   ├── react-rules.md
│   ├── typescript-rules.md
│   ├── style-rules.md
│   └── a11y/
│       ├── README.md        ← 通用 a11y 入口
│       ├── strict.md        ← 严格模式（A 团队）
│       └── basic.md         ← 基础模式（B 团队）
└── ...
```

`SKILL.md` 工作流变更：

```markdown
2. 根据被审文件类型读 references：
   - React 组件（.tsx）：
     - 通用：references/react-rules.md
     - a11y：根据团队配置 references/a11y/<level>.md
       - 默认 basic
       - 如果项目 .claude/settings.json 里有 `a11yLevel: strict`，用 strict.md
```

`.claude/settings.json` 加：

```json
{
  "pluginConfigs": {
    "frontend-review@company-skills": {
      "options": {
        "a11yLevel": "strict"
      }
    }
  }
}
```

或者用 plugin manifest 的 `userConfig`（更优雅），让安装时引导式选择。第 25 章讲过的 `${user_config.a11yLevel}` 在 SKILL.md 里直接替换。

## Day 60：第一次重大事故

某次 plugin 升级到 0.6.0，引入了新的"必须检查 Promise.all 中错误隔离"规则。
B 团队（营销页）大部分页面都用 `await Promise.all([fetchA(), fetchB()])`，因为允许失败就整页失败。

升级后，B 团队所有 PR 的 review 都被打上一堆 P1 评论"建议使用 Promise.allSettled 隔离错误"。
Reviewer 一开始还认真改，后来发现这个建议在他们场景下根本不适用——B 团队故意要"全有或全无"语义。

紧急响应（按第 24 章的回退流程）：

1. **Day 60 16:00**：B 团队 lead 在 #skill-feedback 报告
2. **Day 60 16:10**：自己环境 `skillOverrides.frontend-review:code-review: off` 临时止血
3. **Day 60 16:30**：定位是 0.6.0 引入的 promise-rules.md 加了 "Promise.all → Promise.allSettled" 规则，触发条件过于宽泛
4. **Day 60 17:00**：marketplace 端推回 0.5.1 版本（撤回 0.6.0，把 plugin.json 的 version 改回 0.5.1）
5. **Day 60 17:05**：通知全员升级 `/plugin update frontend-review@company-skills` 切回 0.5.x
6. **Day 60 17:30**：发邮件复盘事故

复盘记录写进 `references/CHANGELOG.md`：

```markdown
## 0.6.0 - 2026-xx-xx （已撤回，不要使用）

撤回原因：新增的 Promise.all 检查规则误触发率过高
影响范围：B 团队（营销页）受影响最严重，所有 PR 评论被刷屏
回退到：0.5.1
后续动作：把这条规则改成可配置（userConfig.checkPromiseSeparation），默认 false
```

第 24 章的 SOP 这时候第一次发挥作用。整个回退 + 复盘 + 修复路径耗时 1.5 小时。

## Day 90：和 Skill Hub 集成

公司其他团队的 plugin 越来越多，Skill 数量上百。Lead 团队开始用第 23 章的 Skill Hub 做远端分发。

把 frontend-review 注册到 Hub：

```typescript
await skillHub.register({
  name: 'frontend-review',
  title: '前端 Code Review',
  description: 'React + TypeScript 代码审查',
  schema: { /* tool schema */ },
  category: 'code-review',
  tags: ['react', 'typescript', 'frontend', 'review'],
  synthetic_queries: [
    '帮我 review 这个 PR',
    'review src/components/Button.tsx',
    'check 一下这个组件',
    '看看这段 React 代码有没有问题',
    'audit my React PR',
    'review the new feature branch'
  ],
})
```

Hub 自动跑富化、算 embedding、入向量库。其他团队不需要 `/plugin install`，他们的 Claude Code 装着 `skill-hub` MCP Server，所有 Skill 都通过 meta-tool 动态召回。

## 完整时间线总结

| 时间 | 阶段 | 章节引用 | 关键改动 |
|------|------|---------|---------|
| Day 1 | 决策 | Ch1, Ch2 | 决定用 Skill 统一团队 review 规范 |
| Day 2-3 | v0.1 | Ch4 | 写最小 SKILL.md，几十行规则 |
| Day 4-5 | 评测 | Ch19 | 写 evals.json + 建 baseline 0.87 |
| Day 6-9 | v0.2 | Ch8 | 拆出 references/，规则分类 |
| Day 10 | v0.3 | Ch6 | 按文件规模分级评审，减少噪音 |
| Day 15-20 | v0.4 | Ch13 | context: fork 处理大 PR |
| Day 25 | v0.5 | Ch12 | 加 hooks 跑 lint，避免重复评论 |
| Day 30 | 分发 | Ch25 | 抽成 plugin，加 marketplace |
| Day 40 | v0.6 | Ch9 | 加入 a11y 严格/基础两种规则 |
| Day 60 | 事故回退 | Ch24 | 撤回 0.6.0，建立完整 SOP |
| Day 90 | 规模化 | Ch23 | 接入 Skill Hub 远端分发 |

## 这一章想说的事

90 天的真实节奏。每一步对应到一个具体的章节，但你不需要从第一天就把所有章节都用上。

工程是渐进的。Day 1 不需要懂 plugin 分发、不需要懂 Skill Hub、不需要懂 hooks——你只需要懂"为什么需要 Skill"。Day 30 不需要懂 Skill Hub——你需要的是怎么分发给三个团队。

错误也是渐进的。Day 60 那次事故，事前没人能想到 Promise.all 在不同业务场景下意义完全相反——你只有在已经积累了 1-3 个团队的真实使用之后，才能识别出这种隐含假设。

下一章是另一个完整时间线：后端 API 安全审计 Skill。和这一章不同，那个场景对**漏检**的容忍度极低——前端 review 漏了一个 a11y 是 P1，后端 API 漏了一个权限校验可能是 P0 安全事故。工程取舍因此不同。
