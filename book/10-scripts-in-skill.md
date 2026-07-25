---
title: 在 Skill 中编写脚本
feishu_url: "https://fivwvysqdz.feishu.cn/docx/KLJMd7G7Fovvs9x9mDJcrWKFn6b"
last_synced: "2026-06-03T14:13:32Z"
---


AI 很擅长理解代码、发现逻辑漏洞、提出修复建议。但让它数数？"本次审查发现 3 个 Critical、5 个 Warning"——它有时会数成 4 个 Critical。不是它不认真，是统计计数这种确定性计算本来就不是语言模型的强项。

还有一类情况：你让 Skill 每次审查后把结果追加到日志文件。AI 可以做，但每次它都会生成一段差不多的 `appendFileSync` 代码，然后用 Bash 工具执行。三次五次没问题，二十次之后你会发现它偶尔改了一下字段名，偶尔换了一下日期格式。产出物不稳定。

经验法则：当你发现 AI 每次运行都在重复生成类似的辅助代码，说明该把这段逻辑抽成脚本了。

## 何时用脚本 vs 让 AI 来

| 场景 | 用脚本 | 让 AI 来 | 理由 |
|------|--------|---------|------|
| 统计数字（问题数、行数） | ✅ | | 确定性，不出错 |
| 解析固定格式（JSON/CSV） | ✅ | | 格式处理脚本更可靠 |
| 文件读写（追加日志） | ✅ | | 不需要理解力 |
| 判断代码质量 | | ✅ | 需要理解语义 |
| 生成修复建议 | | ✅ | 需要创造力 |

分界线很清楚：需要"理解"的交给 AI，需要"精确"的交给脚本。

## 技术栈选择：统一用 TypeScript

本书的脚本统一用 TypeScript，通过 tsx 直接执行：

```bash
npx tsx scripts/collect-metrics.ts
```

理由：大部分前端和 Node.js 项目本身就是 TypeScript，团队不需要切换语言。TypeScript 的类型系统还能帮你在脚本里定义清晰的数据结构，减少字段拼写错误这类低级问题。

### 运行前提

`npx tsx` 不是开箱即用的，确保运行环境满足：

- **Node.js 版本 ≥ 20**：tsx 依赖较新的 Node ESM 支持。检查：`node --version`。低于 20 升级（用 nvm 装最方便）
- **`npx` 可用**：随 npm 一起装。检查：`npx --version`
- **项目里没有强制 tsx 作为 devDependency 的必要**：`npx tsx` 第一次跑会自动下载到 npm 缓存，之后直接用。但 CI 环境每次都重装会慢，CI 项目可以把 tsx 加进 devDependencies：

  ```json
  // package.json
  {
    "devDependencies": {
      "tsx": "^4.0.0",
      "typescript": "^5.0.0"
    }
  }
  ```

- **不需要 tsconfig.json**：tsx 默认配置就能运行简单脚本。如果你的脚本要引用项目的别名（`@/utils/foo`），需要 tsconfig.json 的 `paths` 配合

如果你的 Skill 跑在 devcontainer、CI 容器、Lambda runtime 等没有 Node 的环境里：

- **Devcontainer / CI**：base image 选 `node:20` 或更新版本
- **Lambda / Cloudflare Workers**：原生不支持 tsx。要么把 TypeScript 提前编译成 JavaScript，要么换 Python（用 Python 子集写脚本）
- **完全没 Node 的环境**：换 Python 或 shell 脚本。Skill 的脚本可以用任何能跑的语言，TypeScript 只是本书的默认选择

在 SKILL.md 中调用脚本有两种方式。一是在指令中直接写明：

```markdown
审查完成后，运行 `npx tsx ${CLAUDE_SKILL_DIR}/scripts/collect-metrics.ts <文件>` 生成统计。
```

二是在 frontmatter 中预授权，让 AI 能自主执行：

```yaml
allowed-tools: "Bash(npx tsx *)"
```

`${CLAUDE_SKILL_DIR}` 是平台提供的环境变量，指向当前 Skill 的根目录。用它来定位脚本路径，不管用户在哪个目录下触发 Skill，脚本都能找到。

## 实战：为 code-review 编写两个脚本

### scripts/collect-metrics.ts — 统计审查指标

这个脚本接收审查结果文本，解析出结构化的指标数据：

```typescript
// 执行方式: npx tsx collect-metrics.ts <review-output-file>
import { readFileSync } from 'fs';

interface ReviewMetrics {
  total: number;
  critical: number;
  warning: number;
  suggestion: number;
  filesReviewed: number;
  score: number;
}

const input = readFileSync(process.argv[2] || '/dev/stdin', 'utf-8');

const metrics: ReviewMetrics = {
  total: 0,
  critical: (input.match(/🔴/g) || []).length,
  warning: (input.match(/🟡/g) || []).length,
  suggestion: (input.match(/🔵/g) || []).length,
  filesReviewed: (input.match(/###\s+\S+\.\w+/g) || []).length,
  score: parseInt(input.match(/评分[：:]\s*(\d+)/)?.[1] || '0'),
};
metrics.total = metrics.critical + metrics.warning + metrics.suggestion;

console.log(JSON.stringify(metrics, null, 2));
```

它做的事很简单：用正则匹配严重度图标来计数，用正则提取评分。这些事让脚本做，100 次执行 100 次结果一致。让 AI 数图标，它偶尔会把表格外的 emoji 也算进去。

### scripts/append-log.ts — 追加审查日志

每次审查后把指标追加到 JSONL 文件，并自动 git commit：

```typescript
// 执行方式: npx tsx append-log.ts <log-file> '<metrics-json>'
import { appendFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { dirname } from 'path';

const logPath = process.argv[2] || 'data/review-metrics.jsonl';
const metricsJson = process.argv[3];

if (!metricsJson) {
  console.error('Usage: append-log.ts <logPath> <metricsJSON>');
  process.exit(1);
}

const record = {
  timestamp: new Date().toISOString(),
  pr: process.env.PR_NUMBER || 'unknown',
  ...JSON.parse(metricsJson),
};

mkdirSync(dirname(logPath), { recursive: true });
appendFileSync(logPath, JSON.stringify(record) + '\n');

try {
  execSync(`git add ${logPath} && git commit -m "chore: append review log for PR #${record.pr}"`);
  console.log('Review log committed.');
} catch {
  console.log('Review log saved (not in git repo or nothing to commit).');
}
```

为什么让脚本而不是 AI 来做 git commit？因为 commit message 的格式需要固定（方便过滤和统计），而 AI 每次写的 commit message 都不太一样。

## 在 SKILL.md 中串联脚本

脚本写好了，还得告诉 AI 什么时候用。在 SKILL.md 的指令中加入后处理步骤：

```markdown
## 审查后处理

审查完成后，依次执行以下步骤：
1. 将审查结果保存到临时文件 `/tmp/review-output.md`
2. 运行 `npx tsx ${CLAUDE_SKILL_DIR}/scripts/collect-metrics.ts /tmp/review-output.md` 生成统计
3. 运行 `npx tsx ${CLAUDE_SKILL_DIR}/scripts/append-log.ts data/review-metrics.jsonl '<统计JSON>'` 记录日志
4. 在审查结果末尾附上统计摘要
```

注意这里是"指令"而不是"自动执行"。AI 读到这些指令后会按步骤调用 Bash 工具来运行脚本。它可能偶尔忘记——这个问题第 13 章用 hooks 来解决。

## code-review v6 目录结构

```
.claude/skills/code-review/
├── SKILL.md
├── rules/
│   ├── base.md
│   ├── react.md
│   └── security.md
└── scripts/
    ├── collect-metrics.ts
    └── append-log.ts
```

和 v5 相比，多了 `scripts/` 目录。Skill 从"一份提示词"进化成了"提示词 + 规则库 + 脚本"的组合体。AI 负责理解和判断，脚本负责精确和稳定，各司其职。

---

> 本章来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
