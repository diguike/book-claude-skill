---
title: 让评测真正有用——从 evals.json 到 CI 流水线
feishu_url: "https://fivwvysqdz.feishu.cn/docx/Paj5dgpsxosVNaxngLJcZW1EnMb"
last_synced: "2026-06-03T14:13:32Z"
---

到这一章为止，code-review Skill 已经经过 9 个版本演进，从 10 行 SKILL.md 长到了带 references、scripts、hooks、subagent 的完整形态。每一步你都在改它，但都基于一个隐含假设：**"我改的方向是对的"**。

这个假设不可信。

第一版书系里有一个被反复提及的故事：某团队为 review Skill 加了 8 条新规则，跑了两周后回头数据，发现 review 评论里只有 12% 真正被开发者采纳。一半的"严重问题"是 false positive，另一半"中等问题"开发者根本看不懂，不知道怎么改。

之前 8 周做的所有"优化"，可能是负优化。

评测就是用来防这种事的。它的工程目的只有一个：**让"这次改动到底有没有让 Skill 变好"这个问题，有一个数据驱动的答案**。

这一章把评测从思维模型讲到 CI 流水线，端到端打通。不再是抽象方法论，每一步都对应到具体能跑的脚本和 JSON 配置。

## 一个反直觉的事实

写完一个 Skill，第一反应是"试一下，看看效果"。然后跟 AI 聊几次，输出看起来不错，就上线。

问题出在哪？**你只测了"有 Skill"的输出，从来没对比过"没 Skill"的输出**。

下面是一个真实数字：某团队写了一个"生成 commit message"的 Skill，跑了一个月，团队成员反馈"还挺好用"。某次出于好奇关掉 Skill 让 AI 直接写，结果发现：80% 的 commit message 跟有 Skill 时几乎一样。这个 Skill 几乎没创造增量价值——AI 本来就擅长写 commit message，加 SKILL.md 多余了。

**Skill 价值 ≠ 有 Skill 时输出的绝对质量**

**Skill 价值 = 有 Skill 时的表现 − 没有 Skill 时的表现**

这个差值，就是你创造的实际价值。**每次评测都要跑两组：with_skill 和 without_skill。**

举两个对比，把 delta 思维讲死：

**code-review Skill**：

- 没 Skill：通用审查，pass_rate = 0.40
- 有 Skill：按团队规范审查，pass_rate = 0.85
- **Delta = +0.45**，高价值

**commit-message Skill**：

- 没 Skill：pass_rate = 0.88
- 有 Skill：pass_rate = 0.91
- **Delta = +0.03**，AI 本来就擅长，Skill 不值得维护

只看绝对分，第二个 Skill 0.91 比第一个 0.85 高，看起来更好。但 delta 揭示真相：你的 review Skill 创造的价值是 commit Skill 的 15 倍。

## 三维指标，不只 pass_rate

光看 pass_rate 会掉进另一个陷阱。完整评测要看三个维度：

| 维度 | 指标 | 关心什么 |
|------|------|---------|
| 质量 | pass_rate | 断言通过率多少 |
| 成本 | tokens | 消耗多少 token |
| 效率 | time | 花了多少时间 |

两个真实场景：

**Skill A**：质量 0.40 → 0.85（+0.45），耗时 12s → 22s，token +30%。质量大幅提升，成本可接受——值得

**Skill B**：质量 0.88 → 0.90（+0.02），token 翻倍（Skill 指令太长、references 太多）。几乎没变化但成本翻倍——不值得

直觉上你会觉得"质量越高越好"。但 Skill B 这种为了多通过一条断言烧 5000 token 的情况，得认真想这笔账划不划算。Skill 不只有"做得好"一个维度。

## 5 分钟跑一次评测

理论讲到这里够了，下面跑一个最简单的评测，建立手感。

**场景**：公司要求所有源文件头部都有 license header。

**Skill**：`.claude/skills/file-header-check/SKILL.md`

```yaml
---
name: file-header-check
description: "检查源代码文件是否包含 license header。当用户说'检查 header'、'license 检查'、'文件头检查'时使用。"
---

检查指定目录下所有 .ts 和 .tsx 文件的头部，验证是否包含以下格式：

// Copyright (c) 2025 Acme Corp. All rights reserved.
// Licensed under the MIT License.

对于缺少 header 的文件：列出文件路径，并在文件头插入 header（在 import 语句之前）。
对于 header 格式不对的文件：列出文件路径和当前 header，给出修正建议。
```

**Evals**：`.claude/skills/file-header-check/evals.json`

```json
[
  {
    "name": "detect-missing-header",
    "description": "检测缺少 license header 的文件",
    "prompt": "检查 src/ 目录下的文件头",
    "workspace": "test-workspace-missing-header",
    "assertions": [
      "输出中包含 src/utils/format.ts",
      "输出中包含 src/components/Button.tsx",
      "输出中不包含 src/index.ts（该文件已有正确 header）"
    ]
  },
  {
    "name": "fix-wrong-year",
    "description": "检测并修正年份错误的 header",
    "prompt": "检查 src/ 目录下的文件头",
    "workspace": "test-workspace-wrong-year",
    "assertions": [
      "指出 src/api/client.ts 的 header 年份是 2023 而非 2025",
      "给出修正后的 header 内容"
    ]
  }
]
```

两个测试用例，5 条断言。

`workspace` 字段是新手最容易困惑的——它不是 SKILL.md 里的 path 限定，也不是 Claude Code 的概念，是 **evals runner 的私有字段**，告诉 runner 把当前工作目录 chdir 到 `<skill>/test-data/<workspace>` 再跑评测。这样不同用例可以隔离不同的测试场景（一个 workspace 测"缺 header"、一个测"年份错误"、一个测"格式错误"），每个用例有自己的预置文件。

**跑评测**（用 skill-creator 提供的 runner，第 20 章会展开内部实现）：

```bash
npx tsx .claude/scripts/eval-runner.ts \
  --skill .claude/skills/file-header-check \
  --evals .claude/skills/file-header-check/evals.json
```

**结果**：

没 Skill 时：

- AI 自己理解"文件头"是什么概念，但检查标准不确定。有时它查 license，有时它查 copyright，格式要求每次都不一样
- pass_rate：0.40（5 条断言通过了 2 条）
- 漏掉年份错误的文件

有 Skill 时：

- 按固定格式检查，找到所有缺失和错误的文件
- pass_rate：1.00（5 条断言全部通过）
- **Delta：+0.60**

Delta = 0.60。这个 Skill 显然有价值。AI 不是不会检查文件头，但它缺乏团队的具体标准。Skill 补上了这个缺失。

这就是评测的全部骨架：

1. 准备测试 workspace（包含已知问题的文件）
2. 定义断言（具体、可验证的预期结果）
3. 对比跑 with_skill vs without_skill
4. 看 delta，决定 Skill 值不值得

## evals.json 完整 Schema

上面是简化版。真实项目里 evals.json 长这样：

```json
{
  "skill_name": "code-review",
  "baseline_pass_rate": 0.85,
  "evals": [
    {
      "id": "complex-pr-001",
      "name": "审查涉及多文件的 PR",
      "description": "测试 Skill 能否处理跨文件的复杂 PR",
      "prompt": "review 当前 PR 的所有变更",
      "workspace": "test-complex-pr",
      "setup": {
        "command": "git checkout fixtures/complex-pr",
        "files": [
          "src/api/userService.ts",
          "src/hooks/useData.ts"
        ]
      },
      "assertions": [
        {
          "id": "covers-all-files",
          "text": "检查了所有变更文件，不遗漏",
          "type": "must"
        },
        {
          "id": "promise-rejection",
          "text": "指出 src/api/userService.ts 中的未处理 Promise rejection",
          "type": "must"
        },
        {
          "id": "useeffect-deps",
          "text": "指出 src/hooks/useData.ts 中 useEffect 缺少依赖数组",
          "type": "must"
        },
        {
          "id": "grouped-output",
          "text": "按文件分组输出，不是一整坨",
          "type": "should"
        }
      ],
      "timeout_ms": 120000
    }
  ]
}
```

每个字段的语义：

| 字段 | 必填 | 语义 |
|------|------|------|
| `skill_name` | 是 | Skill 名称，对应 `.claude/skills/<name>/` |
| `baseline_pass_rate` | 是 | 当前 baseline，CI 用它做退化检测 |
| `evals[].id` | 是 | 用例稳定 ID，CI 报告里引用它 |
| `evals[].name` | 是 | 人类可读名称 |
| `evals[].prompt` | 是 | 给 AI 的输入，模拟真实使用场景 |
| `evals[].workspace` | 是 | 测试数据目录（相对 Skill 根） |
| `evals[].setup` | 否 | 跑测试前的准备动作（切分支、创建文件等） |
| `evals[].assertions` | 是 | 断言列表 |
| `evals[].assertions[].type` | 否 | `must`（必须通过）/ `should`（应该通过，权重小） |
| `evals[].timeout_ms` | 否 | 单用例超时时间，默认 60 秒 |

`type: should` 是一个温柔的设计：有些断言"通过最好，不通过也不致命"。比如"输出按文件分组"——这是个组织偏好，不是错误。`should` 类型不计入硬性 pass_rate，只作为提示。

## 强断言 vs 弱断言

写 Skill 的人很容易陷入这个陷阱：写出一堆"永远绿"的弱断言，pass_rate 永远 0.95+，看起来 Skill 很好，实际什么也没测出来。

**弱断言**——无法客观判定：

- ❌ "输出包含代码审查结果" → AI 说任何跟 review 相关的话都通过
- ❌ "输出的建议是有用的" → 谁来判断有用？grader 也说不清
- ❌ "审查标准符合团队规范" → 团队规范是什么？哪一条？

**强断言**——可验证、可量化：

- ✅ "输出包含至少 3 个带严重度标记（P0/P1/P2）的审查意见"
- ✅ "检出了 src/api/userService.ts:42 的未处理 Promise rejection"
- ✅ "对每个问题给出至少 1 个具体修复建议（>= 20 字）"
- ✅ "输出中提到了 DOMPurify（针对该 XSS 风险的标准修复方式）"

强断言的特征是**能拿原文做证据**。grader 判通过时必须引用输出的具体内容："输出第 17 行包含 `DOMPurify`"——这才算有 evidence 的 pass。

写完一组断言，自己回头问每一条："**如果 AI 说了一段废话也能通过这条断言吗？**"能——这条是弱断言，删掉重写。

### "不误报"也是断言

很多人只测"AI 找到了什么"，忘了测"AI 没乱说什么"。

```json
{
  "name": "simple-function-review",
  "prompt": "review src/utils/formatCurrency.ts",
  "assertions": [
    "指出函数缺少对 NaN 输入的处理",
    "指出函数没有处理负数的显示格式",
    "不误报：函数命名符合 camelCase 规范"
  ]
}
```

第三条 "不误报"很关键。一个把所有代码都标红的 linter 没有价值。你要测的是 AI **既能找到真问题，也不会编造假问题**。

实战中 false positive 比 false negative 更恶劣——团队会因此屏蔽 review 评论，连真问题一起忽略。

## 评测的两个角色

跑完评测得到 AI 的输出，怎么判定每条断言通过没？这个工作叫 **grader**（评分员）。

grader 可以是 LLM 自动跑的，也可以是人工。大部分断言是客观的（输出里有没有某个文件名、有没有提到某个安全风险），LLM 完全胜任。少数主观判断的（"建议是否具体到可操作"），需要人工补一下。

### Grader 的 7 步流程

skill-creator 里的 grader 子代理把评测拆成严格的 7 步：

1. **读完整 transcript**——不只看最终输出，看 AI 的整个推理过程。如果 AI 走了弯路但碰巧得到正确答案，grader 要能发现这一点
2. **检查实际输出**——对照用户期望逐项核对。该有的有没有、不该有的有没有混进来
3. **评判每条断言**——Pass / Fail，必须给出具体 evidence。没 evidence 的 Pass 等于没评
4. **提取额外发现**——断言没覆盖到但 grader 注意到的问题。反馈给下一轮断言设计
5. **检查执行者备注**——AI 在执行过程中留下的备注（"这个 API 似乎已经废弃了"），grader 要纳入考量
6. **批判断言质量**——这条断言是不是太弱？是不是永远都会通过？是不是在测实现细节而非行为？
7. **写评测报告**——结构化输出，供后续聚合

第 6 步是整个评测设计的灵魂。如果 grader 不批判断言本身，你可能写了一堆永远绿灯的弱断言，自我感觉良好，实际什么都没测出来。常见的弱断言模式：

```
模式 ①：永真断言
  "输出包含文本" — 只要 AI 说了任何话就通过
  → 改成有具体内容要求的断言

模式 ②：格式依赖断言
  "第三行是 XXX" — 输出多加一行空行就挂了
  → 测的是格式而非语义，改成"输出中存在 XXX"

模式 ③：模糊断言
  "输出的建议是有用的"
  → grader 自己也说不清"有用"，改成可验证的具体标准
```

grader 标记出来这些之后，你在下一轮迭代时修正，重跑 eval。断言质量和 Skill 质量是同步提升的。

### 双角色：grader + meta-grader

只有 grader 还不够。grader 判定"输出符合断言"是一码事，但断言本身设计得好不好是另一码事。

**meta-grader**：专门评判断言质量的角色。

输入：当前 evals.json 全部断言。
输出：标记哪些断言太弱、太强、不可验证。

```
断言："输出包含代码审查结果"
meta-grader：太弱
理由：任何包含 review 字眼的输出都通过，对实际质量没区分度
建议：改成"输出包含至少 3 个带严重度标记的 review 意见，每个 >= 30 字符"
```

```
断言："输出的第三行必须是 src/utils/format.ts:1 - Missing license header"
meta-grader：太强
理由：格式稍变就挂，测的是 AI 格式精确度而非 Skill 价值
建议：改成"输出中包含 'src/utils/format.ts' 和 'Missing'"
```

写第一版断言时，你大概率 20-30% 是弱断言。meta-grader 第一次跑就能帮你重写一半。后面几轮中你的断言写作水平会快速提升，meta-grader 反馈越来越少。

### 盲比（comparator）

pass_rate 是客观指标，但有些质量维度断言表达不出来：输出的组织是否清晰？建议是否具体到可操作？语气是否符合团队风格？

盲比解决这个问题。

做法：把 with_skill 和 without_skill 的输出匿名呈现给评审者（人或 LLM），标成"输出 A"和"输出 B"。评审者不知道哪个加了 Skill。

| 维度 | 子项 | 评判标准 |
|------|------|---------|
| 内容 | 正确性 | 指出的问题是否真实存在 |
| 内容 | 完整性 | 是否覆盖所有应检查点 |
| 内容 | 准确性 | 文件路径、行号是否准确 |
| 结构 | 组织 | 问题是否分类清晰 |
| 结构 | 格式 | 是否易于阅读和后续处理 |
| 结构 | 可操作性 | 看完能不能直接改代码 |

评完再揭示来源。如果匿名状态下评审者一致选了"输出 A 更好"，揭示后发现 A 是 with_skill 的——Skill 有效。如果选的是 without_skill 的——你的 Skill 可能在帮倒忙。

盲比消除一个偏差：自己改过的东西总觉得更好。你花了两小时调 Skill 措辞，下意识觉得改完的输出明显更好。盲比让你诚实面对结果。

**分维度评分的工程价值**：改进 Skill 经常此消彼长。改 prompt 让 AI 更精确定位问题（内容维度提升），但输出变成密密麻麻的术语堆砌（结构维度下降）。单一总分掩盖这种退步，分维度评分把它暴露出来。

comparator 对每个维度分别给出 A/B 优劣判定和理由。最终汇总时，如果两个维度方向一致（A 在内容和结构上都更好），结论清晰；如果方向相反就要人工权衡——这个 Skill 的使用场景更看重正确性还是可读性？

### 模式分析（analyzer）

grader 和 comparator 看单轮 eval。跑了三五轮之后，你需要回答一个更高层的问题：**跨轮次有没有反复出现的模式？**

这是 analyzer 的工作。它读多轮 eval 的 summary.json 和 grader 报告，找：

- **顽固断言**：连续三轮失败的同一条断言。说明 SKILL.md 在某方向有结构性缺陷，小修小补解决不了
- **退步模式**：第 N 轮通过但 N+1 轮失败的断言。检查两轮之间改了什么
- **弱断言集中区**：grader 标记"太弱"的断言集中在某类用例上，说明你对这类场景预期不清晰
- **维度偏科**：内容维度持续提升但结构维度持续下降——你只关注了"说对"忽略了"说好"

analyzer 给方向，不给具体修改。具体怎么改是你的决策。

前两轮 eval 时 analyzer 价值不大（数据太少）。第三轮开始价值显现。如果你在第五轮还在跟同一个问题纠缠，大概率没跳出来看模式。

## 评测的目录结构

跑完一轮 eval 后产物应该有结构：

```
eval-results/
  iteration-1/
    eval-detect-missing-header/
      with_skill/
        outputs/
          transcript.json    # AI 完整对话
          result.md          # AI 最终输出
        grading.json         # 断言判定结果
      without_skill/
        outputs/
          transcript.json
          result.md
        grading.json
    eval-fix-wrong-year/
      with_skill/
        ...
      without_skill/
        ...
    summary.json             # 本轮汇总
  iteration-2/
    ...
```

`summary.json` 结构很简单：

```json
{
  "iteration": 1,
  "date": "2026-03-15",
  "skill_version": "abc1234",
  "results": {
    "with_skill":    { "total": 14, "passed": 12, "pass_rate": 0.86 },
    "without_skill": { "total": 14, "passed": 6,  "pass_rate": 0.43 },
    "delta": 0.43
  },
  "failed_assertions": [
    {
      "eval": "complex-pr",
      "assertion": "指出未处理的 Promise rejection",
      "reason": "AI 提到了错误处理但未定位到具体行号"
    }
  ]
}
```

为什么要这个结构？因为你会反复迭代。第一轮 pass_rate 0.60，改了再跑变 0.75，再改再跑到 0.90。每一轮结果都需要留存——你才能看到趋势，而不是每次都猜"上次好像是 0.7 来着"。

## 完整 evals.json 实战

把上面所有原则落地，给 code-review 写一份完整 evals.json：

```json
{
  "skill_name": "code-review",
  "baseline_pass_rate": 0.85,
  "evals": [
    {
      "id": "simple-function",
      "name": "审查一个简单工具函数",
      "prompt": "review src/utils/formatCurrency.ts",
      "workspace": "test-simple-function",
      "assertions": [
        "指出函数缺少对 NaN 输入的处理",
        "指出函数没有处理负数的显示格式",
        "不误报：函数命名符合 camelCase 规范"
      ]
    },
    {
      "id": "complex-pr",
      "name": "审查涉及多文件的 PR",
      "prompt": "review 当前 PR 的所有变更",
      "workspace": "test-complex-pr",
      "assertions": [
        "检查了所有变更文件，不遗漏",
        "指出 src/api/userService.ts 中的未处理 Promise rejection",
        "指出 src/hooks/useData.ts 中 useEffect 缺少依赖数组",
        "按文件分组输出，不是一整坨"
      ]
    },
    {
      "id": "security-vuln",
      "name": "审查包含安全漏洞的代码",
      "prompt": "review src/components/CommentBox.tsx",
      "workspace": "test-security-vuln",
      "assertions": [
        "指出 dangerouslySetInnerHTML 的 XSS 风险",
        "给出具体的修复方式（使用 DOMPurify）",
        "说明风险场景（用户可以注入恶意脚本）"
      ]
    },
    {
      "id": "react-component",
      "name": "审查一个 React 组件",
      "prompt": "review src/components/UserProfile.tsx",
      "workspace": "test-react-component",
      "assertions": [
        "指出组件中使用了 any 类型",
        "指出 useEffect 的清理函数缺失（存在内存泄漏风险）",
        "给出的类型建议是具体的接口定义，不是泛泛的'请加类型'"
      ]
    }
  ]
}
```

四个用例，覆盖四种典型场景：简单函数、复杂 PR、安全漏洞、React 组件。每个用例 3-4 条断言，总共 14 条。

## CI 集成：每次改 Skill 都自动跑评测

手动跑 eval 能解决问题，但靠不住。忙起来就忘，或者"改了个措辞应该没事吧"直接合并。

跟代码测试一样——自动化才是唯一可靠方案。

### GitHub Actions 配置

```yaml
# .github/workflows/skill-eval.yml
name: Skill Evaluation

on:
  pull_request:
    paths:
      - '.claude/skills/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Detect changed skills
        id: changed
        run: |
          SKILLS=$(git diff --name-only origin/main...HEAD \
            | grep '^\.claude/skills/' \
            | cut -d'/' -f3 \
            | sort -u)
          echo "skills=$SKILLS" >> "$GITHUB_OUTPUT"

      - name: Run evals for changed skills
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          for SKILL in ${{ steps.changed.outputs.skills }}; do
            SKILL_DIR=".claude/skills/$SKILL"
            EVAL_FILE="$SKILL_DIR/evals.json"
            [ ! -f "$EVAL_FILE" ] && continue

            echo "Running eval for $SKILL..."
            npx tsx .claude/scripts/eval-runner.ts \
              --skill "$SKILL_DIR" \
              --evals "$EVAL_FILE" \
              --output "eval-results/$SKILL/summary.json"
          done

      - name: Compare with baseline
        id: compare
        run: |
          REPORT=""
          EXIT_CODE=0
          for SKILL in ${{ steps.changed.outputs.skills }}; do
            SUMMARY="eval-results/$SKILL/summary.json"
            BASELINE=".claude/skills/$SKILL/benchmark.json"
            [ ! -f "$SUMMARY" ] && continue

            NEW_RATE=$(jq -r '.results.with_skill.pass_rate' "$SUMMARY")
            DELTA=$(jq -r '.results.delta' "$SUMMARY")

            if [ -f "$BASELINE" ]; then
              OLD_RATE=$(jq -r '.pass_rate' "$BASELINE")
              DIFF=$(echo "$NEW_RATE - $OLD_RATE" | bc)
              if (( $(echo "$DIFF < -0.05" | bc -l) )); then
                REPORT="$REPORT\n[!] **$SKILL**: pass_rate $OLD_RATE -> $NEW_RATE (退化 $DIFF)"
                EXIT_CODE=1
              else
                REPORT="$REPORT\n[v] **$SKILL**: pass_rate $OLD_RATE -> $NEW_RATE (delta: $DELTA)"
              fi
            else
              REPORT="$REPORT\n[?] **$SKILL**: pass_rate $NEW_RATE (无 baseline，首次评测)"
            fi
          done
          {
            echo "report<<EOF"
            echo -e "$REPORT"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"
          exit $EXIT_CODE

      - name: Comment on PR
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const report = `${{ steps.compare.outputs.report }}`;
            const body = `## Skill Eval Results\n\n${report}\n\n_Auto-generated by skill-eval workflow_`;
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner, repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.data.find(c => c.body.includes('Skill Eval Results'));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner, repo: context.repo.repo,
                comment_id: existing.id, body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner, repo: context.repo.repo,
                issue_number: context.issue.number, body,
              });
            }

      - name: Upload eval report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: eval-report
          path: eval-results/
          retention-days: 30
```

工作流做四件事：

1. 检测哪些 Skill 被改了
2. 对每个改了的 Skill 跑 eval（with_skill + without_skill）
3. 和 baseline 对比，检查有没有退化
4. 把结果评论到 PR 上 + 上传 artifact

触发条件是 `.claude/skills/**` 路径变更。改业务代码不触发，只有动了 Skill 才跑。

### 退化阈值 -0.05 怎么定的

配置里的关键数字是 `-0.05`。pass_rate 下降超过 5% 判定退化，CI 报错。

为什么不是 0？LLM 输出有随机性。同一个 Skill 同一个 prompt 跑两次结果不完全一样。允许 5% 波动是务实的。

如果测试用例够多（30+ 断言），可以收紧到 3%。用例太少（< 10 条），单条断言的随机波动就让 pass_rate 剧烈变化，5% 都不够，得放宽到 8%。

### self-hosted runner

如果你的项目在公司内网、不能访问 Anthropic API：

```yaml
jobs:
  eval:
    runs-on: self-hosted  # 跑在内网 runner 上
    ...
```

内网 runner 走公司 LLM 网关（参考 inferloop 系列的 LLM Gateway 一书）。其它步骤一致。这是大公司里最常见的部署形态。

## 基线管理

基线是评测的锚点。没基线你只知道"这次 pass_rate 是 0.85"，不知道是进步还是退步。

每个 Skill 目录下放一个 `benchmark.json`：

```json
{
  "version": "2025-04-01",
  "skill_commit": "abc1234",
  "pass_rate": 0.85,
  "delta": 0.40,
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

这个文件提交到 git，和 Skill 一起版本管理。CI 跑 eval 时拿它做对比。

### 基线更新流程

不是每次 eval 跑完都更新基线。更新基线意味着"我认可当前的表现水平"。

```
跑 eval -> 确认 pass_rate 提升 -> 人工 review 确认提升真实
-> 更新 benchmark.json -> commit 说明为什么更新
```

```bash
git add .claude/skills/code-review/benchmark.json
git commit -m "chore(skill): update code-review baseline 0.85 -> 0.88

Added performance check rules. eval pass_rate improved 0.85 -> 0.88.
Manually reviewed eval outputs, improvement is genuine."
```

**反模式：CI 自动更新基线**。这等于取消了基线的意义——永远和上一次比，永远不退化，但也永远不知道绝对水平在哪。

## 人工审查补位

自动 eval 抓客观问题：断言通过没有、格式对不对、有没有遗漏。

但有一类问题自动 eval 抓不到：**技术正确但没用**。

AI 审查一段代码，指出"这个函数的圈复杂度是 15"。技术上完全正确。但作为 review 意见，毫无意义——开发者需要知道的是"这个函数需要拆分，建议把验证逻辑提取到 `validateInput()` 中"。

人工审查就是补这个缺口。Review 最近 5 次 eval 的输出，找那些"断言通过但其实不够好"的地方。

反馈格式要具体可操作：

```
eval: complex-pr
问题：AI 指出了 3 个正确问题，但建议太笼统
具体："建议添加错误处理" -> 应该说 "在 fetchUser() 的 catch 块中，
建议将 error 上报到 Sentry 而不是只 console.log，参考 known-pitfalls.md 中的监控规范"
操作：在 SKILL.md 中加一条指令 —— "给出修复建议时，指出具体的修改方式和引用的团队规范"
```

## 完整团队评测流程

把这一章所有东西串起来：

```
 改 Skill
   │
   ▼
 本地跑 eval（推荐但可选）
   │
   ├─ pass_rate 退化 → 回去改
   │
   ▼
 提 PR
   │
   ▼
 CI 自动跑 eval ──→ 评论 PR
   │
   ├─ CI 失败 → 回去改
   │
   ▼
 Owner review
   │
   ├─ 看 eval report（artifact 下载）
   ├─ 看 Skill 变更的合理性
   ├─ 对照 checklist（第 18 章）
   │
   ▼
 合并到 main
   │
   ▼
 更新 baseline（如果 pass_rate 提升了）
   │
   ▼
 全团队生效
```

几个关键纪律：

- **本地 eval 可选但推荐**：CI 跑一次几分钟到十几分钟。如果你改了 Skill 直接提 PR 等 CI 反馈，来回几次就半天没了。本地先跑一遍能省大量时间
- **CI eval 强制**：本地 eval 可能因环境差异得到不同结果。CI 是标准化环境，所有人用同一模型配置
- **Owner review 不只看 eval 数据**：eval 通过只说明客观指标没退化。Owner 还要判断"这变更必要吗？会不会让 Skill 膨胀？新规则措辞够不够精确？"
- **基线更新是显式操作**：合并后，如果 pass_rate 提升，Owner 手动更新 benchmark.json 并提交。一个独立 commit，有记录可查

## 评测的停止条件

评测不是一次性的。改 Skill → 跑 eval → 看结果 → 再改 → 再跑。这个循环什么时候停？

三个信号：

- 连续两轮人工反馈为空（没有新改进点）
- pass_rate 连续两轮无显著提升（波动在 0.02 以内）
- delta 已足够大（比如 with_skill 比 without_skill 高 0.30+）

到这阶段 Skill 进入维护期。不需要持续迭代，业务变化时更新规则、跑一轮 eval 确认没退化即可。

## 把评测从负担变成杠杆

很多团队对评测的态度是"知道重要，但太麻烦没做"。这是把评测当成 to-do list 上的一项任务，做完打钩。

错。评测是杠杆。

没评测的 Skill 像没单元测试的代码——刚写完都觉得"我心里有数"，三个月后就是一坨没人敢动的东西。有了评测，你改 Skill 的成本和风险降一个数量级，迭代速度上来了，Skill 才真正能进化。

团队第一个 CI eval 不需要完善。从最关键的一两个 Skill 开始，跑起来再逐步完善。等团队尝到甜头——某次 PR 的 CI 评论提示"pass_rate 退化了 0.12"，reviewer 一看果然是新规则和旧规则冲突——以后就没人会质疑"这玩意有必要吗"。

下一章会讲 skill-creator 自带的 grader/comparator/analyzer 三个角色具体如何实现，那是这一章 7 步评测流程的引用实现。

---

> 本章来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/skill-guide](https://github.com/diguike/skill-guide)
