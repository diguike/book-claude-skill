---
name: my-skill
description: "做什么。当用户说'...'、'...'时使用。"
allowed-tools: "Bash(npx tsx *)"
---

## 你的任务

<!-- 用祈使句描述 AI 需要做什么 -->

## 后处理

任务完成后，运行统计脚本：

```
npx tsx ${CLAUDE_SKILL_DIR}/scripts/example.ts
```
