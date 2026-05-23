# 附录 H：evals.json 完整 Schema

## Schema 定义

```json
{
  "skill_name": "string — Skill 名称，与 SKILL.md 中的 name 一致",
  "evals": [
    {
      "id": "number — 唯一标识，从 1 开始递增",
      "prompt": "string — 模拟用户的自然语言请求",
      "expected_output": "string — 人类可读的预期结果描述",
      "files": "string[] — (可选) 测试所需的输入文件路径列表",
      "assertions": [
        {
          "text": "string — 可验证的断言陈述",
          "passed": "boolean | null — 评测结果，初始为 null",
          "evidence": "string — 判定依据，引用输出中的具体内容"
        }
      ]
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skill_name` | string | 是 | 必须与 SKILL.md frontmatter 中的 `name` 完全一致 |
| `evals[].id` | number | 是 | 从 1 开始递增，不可重复 |
| `evals[].prompt` | string | 是 | 写得像真实用户会说的话，避免"测试味" |
| `evals[].expected_output` | string | 是 | 给人看的预期描述，不参与自动判定 |
| `evals[].files` | string[] | 否 | 相对于 workspace 的路径，测试前需确认文件存在 |
| `evals[].assertions` | object[] | 是 | 至少 1 条，建议 3-5 条覆盖不同维度 |
| `assertions[].text` | string | 是 | 必须能判定 true/false，不能模糊 |
| `assertions[].passed` | boolean \| null | 是 | 初始写 `null`，评测后填入结果 |
| `assertions[].evidence` | string | 是 | 评测后填入，引用输出中的具体片段 |

## 完整示例

```json
{
  "skill_name": "code-review",
  "evals": [
    {
      "id": 1,
      "prompt": "帮我 review 这个 PR，重点看安全问题",
      "expected_output": "输出结构化的 review 报告，包含安全类发现",
      "files": ["tests/fixtures/vulnerable-app.py"],
      "assertions": [
        {
          "text": "报告中至少包含 3 个安全相关发现",
          "passed": null,
          "evidence": ""
        },
        {
          "text": "检出第 42 行的 SQL 注入风险",
          "passed": null,
          "evidence": ""
        },
        {
          "text": "每个发现都标注了严重等级（High/Medium/Low）",
          "passed": null,
          "evidence": ""
        },
        {
          "text": "输出是有效的 Markdown 格式",
          "passed": null,
          "evidence": ""
        }
      ]
    },
    {
      "id": 2,
      "prompt": "review 一下这段代码的性能问题",
      "expected_output": "识别出 N+1 查询和未索引字段",
      "files": ["tests/fixtures/slow-query.ts"],
      "assertions": [
        {
          "text": "指出了循环内的数据库查询（N+1 问题）",
          "passed": null,
          "evidence": ""
        },
        {
          "text": "建议了具体的优化方案而非泛泛建议",
          "passed": null,
          "evidence": ""
        }
      ]
    }
  ]
}
```

## Assertion 写作指南

### 强断言 vs 弱断言

| 类型 | 示例 | 问题 |
|------|------|------|
| 强：可数 | "至少 3 个问题" | -- |
| 强：可查 | "检出第 42 行的 SQL 注入" | -- |
| 强：可验 | "输出是有效 JSON" | -- |
| 弱：模糊 | "输出有用" | 无法客观判定 |
| 弱：过严 | "必须包含 'Total Revenue: $1,234' 原文" | 绑定特定措辞，脆性高 |

### 关键原则

1. **passed 初始为 null** -- 先写断言再跑评测。如果边跑边写，容易陷入"事后诸葛"，断言会不自觉地贴合输出而非检验输出。

2. **evidence 必须引用具体内容** -- "看起来通过了"不是 evidence。正确写法：`"evidence": "输出第 3 段包含 'Line 42: cursor.execute(f\"SELECT * FROM users WHERE id={uid}\")' 并标注为 SQL Injection"`。

3. **覆盖多个维度** -- 一条 eval 的 assertions 应覆盖：格式正确性、内容完整性、关键细节命中。单一维度的断言组无法有效区分"好"和"凑合"。

## 相关文件

评测流程会产生以下文件，均位于 Skill 的 `evals/` 目录下：

| 文件 | 用途 | 生成时机 |
|------|------|---------|
| `evals.json` | 测试用例与断言定义 | 手动编写 |
| `grading.json` | 每条 assertion 的判定结果 | 评测完成后自动生成 |
| `benchmark.json` | 聚合统计（pass_rate、平均分） | 多轮评测后汇总 |
| `timing.json` | 每条 eval 的执行耗时 | 评测完成后自动生成 |
| `feedback.json` | 人工反馈与修正 | 手动填写 |

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
