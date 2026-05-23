# 附录 F：skill-creator 核心脚本速查

skill-creator（`github.com/anthropics/skills`）提供了一套完整的 Skill 开发工具链。以下是核心脚本的用途和调用方式。

## 脚本总览

| 脚本 | 用途 | 输入 | 输出 |
|------|------|------|------|
| `quick_validate.py` | 校验 SKILL.md 格式 | SKILL.md 路径 | 通过/失败 + 错误信息 |
| `run_eval.py` | 触发评测运行 | eval 配置 | with/without_skill 输出 |
| `aggregate_benchmark.py` | 聚合评测统计 | iteration 目录 | benchmark.json + benchmark.md |
| `run_loop.py` | Description 触发优化循环 | eval 查询集 + Skill 路径 | 优化后的 description |
| `improve_description.py` | 单次 description 改进 | 当前 description + 反馈 | 改进建议 |
| `generate_report.py` | 生成 HTML 报告 | benchmark 数据 | HTML 文件 |
| `package_skill.py` | 打包 Skill 为 .skill 文件 | Skill 目录 | ZIP 归档 |

## quick_validate.py

校验 SKILL.md 是否符合规范。

```bash
python -m scripts.quick_validate path/to/skill/
```

检查项：
- SKILL.md 存在且有 `---` 分隔符
- frontmatter 只含合法字段
- name 符合 kebab-case 规则（≤64 字符）
- description ≤ 1024 字符，无 `<>` 尖括号
- compatibility ≤ 500 字符（如有）

## run_loop.py

自动化 description 触发率优化。

```bash
python -m scripts.run_loop \
  --eval-set trigger-queries.json \
  --skill-path path/to/skill/ \
  --model claude-sonnet-4-6 \
  --max-iterations 5 \
  --verbose
```

流程：
1. 用当前 description 测试触发查询集
2. 分析误触发和漏触发
3. 生成改进后的 description
4. 重新测试
5. 重复直到达到 max-iterations 或准确率满意

## aggregate_benchmark.py

聚合 iteration 目录下的评测数据。

```bash
python -m scripts.aggregate_benchmark path/to/iteration-1/
```

输出 `benchmark.json`：
```json
{
  "run_summary": {
    "with_skill": {
      "pass_rate": { "mean": 0.83, "stddev": 0.06 },
      "time_seconds": { "mean": 45.0, "stddev": 12.0 },
      "tokens": { "mean": 3800, "stddev": 400 }
    },
    "without_skill": {
      "pass_rate": { "mean": 0.33, "stddev": 0.10 }
    },
    "delta": {
      "pass_rate": 0.50
    }
  }
}
```

## generate_review.py (eval-viewer)

生成交互式评审界面。

```bash
# 启动本地服务器
python eval-viewer/generate_review.py \
  workspace/iteration-1 \
  --skill-name "code-review" \
  --benchmark workspace/iteration-1/benchmark.json

# 对比前一轮迭代
python eval-viewer/generate_review.py \
  workspace/iteration-2 \
  --skill-name "code-review" \
  --benchmark workspace/iteration-2/benchmark.json \
  --previous-workspace workspace/iteration-1

# 导出静态 HTML
python eval-viewer/generate_review.py \
  workspace/iteration-1 \
  --static --output review.html
```

## package_skill.py

将 Skill 打包为可分发的 `.skill` 文件（ZIP 格式）。

```bash
python -m scripts.package_skill path/to/skill/ --output my-skill.skill
```

排除项：`__pycache__`、`node_modules`、`*.pyc`、`.DS_Store`、`evals/`

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
