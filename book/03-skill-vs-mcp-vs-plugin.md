---
title: Skill 与 MCP、Plugin、Agent 的边界
feishu_url: "https://fivwvysqdz.feishu.cn/docx/TqKrdJTc6oTv3QxI1Yxc7jJcn5b"
last_synced: "2026-06-03T14:13:32Z"
---

写 Skill 之前，必须先回答一个问题：为什么这件事要做成 Skill，而不是 MCP Server、不是 Claude 插件、不是独立的 Agent 服务？

这四个东西经常被混着讲，但工程语义完全不一样。选错了边界，要么是把 30 行的指令做成一个跑在云上的微服务，要么是把一个本应有独立服务能力的工具塞进 Markdown 文件里。

这一章给你一棵决策树。

## 四者各是什么

先把四个概念的工程实体讲清楚，不绕弯子。

**Skill**：一个文件夹，至少包含一个 `SKILL.md`。AI 在合适的场景下加载这个文件夹里的指令、脚本和资源。运行在 AI 的进程内，没有独立服务，分发靠 git。

**MCP Server**：一个独立进程（本地 stdio 或远程 HTTP）。实现了 Model Context Protocol，对外暴露 `tools/list`、`tools/call`、`resources/read` 等接口。AI 客户端通过 MCP 协议调用它。是一个有自己生命周期的服务。

**Claude 插件（Plugin）**：一个打包格式，里面可以包含 Skill、Subagent、Hook、MCP Server 配置、output style 等。装一次，所有 component 一起就位。靠 plugin marketplace 分发，类似 VS Code 插件市场。

**Agent 服务**：一个独立的后端系统，跑自己的循环（接到任务 → 规划 → 调工具 → 反思 → 输出）。和上面三者不同，它本身就是一个 AI agent，能被外部系统调用，能长跑、有自己的状态机。Hermes、AgentFlow、AutoGPT 都属于这一类。

## 一张对比表

| 维度 | Skill | MCP Server | Claude 插件 | Agent 服务 |
|------|-------|------------|------------|-----------|
| 运行位置 | AI 进程内 | 独立进程 | 客户端内（含 MCP 配置时进程外） | 独立服务器 |
| 是否需要后端 | 否 | 是 | 否 | 是 |
| 持有状态 | 否（每次重新加载） | 可以 | 否 | 是（有自己的内存/数据库） |
| 分发方式 | git / Plugin marketplace | npm / pip / docker / Plugin | Plugin marketplace | 自己部署 |
| 跨平台 | Agent Skills 规范，30+ 客户端 | MCP 规范，多客户端 | Claude 生态 | 自己定义 API |
| 加载粒度 | 进程启动 + 动态加载 | 连接时 list 全量 tools | 装好后所有 component 一起进 | 不进 AI 上下文，外部调用 |
| 最适合做什么 | 把领域知识和规范固化成可重复执行的"活文档" | 把一个有独立生命周期的服务接给 AI（数据库、第三方 API、内部系统） | 把一组配套的 Skill+Subagent+Hook+MCP 配置打包，一键安装 | 长跑的自动化流水线、对外开放的 AI 能力 |

## 三个真实场景

**场景 1：团队 code review 规范**

需求是把团队的代码评审规范固化下来，每次 PR 都按统一标准跑一遍。

→ **Skill**。规范的本质是"一段在合适场景被加载的指令"，没有独立运行的需求。规范文件随仓库走，谁 clone 谁有，新人入职即用。

如果做成 MCP Server，你得部署一个进程让它跑着等调用——但它本来就只在 review 时被加载一次，部署成本和持续维护远超 Markdown 文件。

**场景 2：内部 Jira 集成**

需求是让 AI 能查询 Jira 任务、更新状态、读评论。

→ **MCP Server**。Jira 是一个独立系统，访问需要 OAuth token、做速率控制、维护连接。这些都是服务能力，不是文档能讲完的事。MCP Server 内部可以有自己的 token 缓存、错误重试、并发控制，AI 只需要通过协议调用 `jira_search_issues({...})` 这种工具。

如果做成 Skill，所有 Jira 调用逻辑就要写进 SKILL.md 的指令里，让 AI 自己拼 HTTP 请求——脆弱、慢、没有连接复用。

**场景 3：前端工程化全套**

需求是给团队所有前端项目提供一套完整能力：代码审查 Skill、组件生成 Subagent、commit 钩子、加上一个用于查内部组件库的 MCP Server。

→ **Claude 插件**。这是一个 bundle 场景。把上面四样打包成一个插件，团队成员从 marketplace 装一次，所有 component 同时生效。升级、回滚、版本管理也走 marketplace 统一的机制。

如果让用户挨个装四样东西，每个都得单独配置，谁离职带走一份，团队成员之间状态分裂。

**场景 4：智能客服系统**

需求是接到用户咨询后，自动检索知识库、生成回答、必要时升级到人工。要求 7×24 运行，能并发处理上万会话。

→ **Agent 服务**。这是一个有自己生命周期的系统，要持有会话状态、要做意图分类、要管会话超时、要和工单系统打通。它本身就是 agent，不是 AI 客户端的扩展。

如果做成 Skill，那需要用户先打开 Claude Code，然后把客户咨询贴进去——这显然行不通。

## 决策树

按四个问题往下问：

```
                需求的本质是什么？
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   一段指令/规范    一个被调的工具   一个长跑的系统
        │              │              │
        ▼              ▼              ▼
      Skill        需要独立            Agent 服务
                   生命周期吗?         （另起项目）
                   │
              ┌────┴────┐
             否        是
              │         │
              ▼         ▼
        还是 Skill    MCP Server


        如果上面有多个产物
        要打包给团队/客户?
              │
              ▼
        装进 Claude 插件
        （插件本身不是新能力，
         是上面三种的运输容器）
```

**第一个问题**：本质是"规则/指令/知识"还是"工具/服务/系统"？

- 答"规则/指令/知识"——大概率是 Skill
- 答"工具/服务/系统"——往下看

**第二个问题**（工具向）：这个工具需要独立生命周期吗？比如连接池、token 缓存、速率限制、复杂状态。

- 不需要——还是 Skill。一段把命令告诉 AI 让它自己跑的指令就够了
- 需要——MCP Server

**第三个问题**：是否需要不依赖任何 AI 客户端独立运行？

- 是——Agent 服务。比如收发邮件、消费 MQ、定时任务
- 否——回到 Skill 或 MCP

**第四个问题**：上面的产物是否要作为一组配套能力打包分发？

- 是——做成 Claude 插件，把多个 Skill、Subagent、MCP 配置打包
- 否——分别独立交付

## 何时一起用

四者不是互斥关系，组合使用反而是常态。

一个真实的内部平台可能长这样：

- **Agent 服务**：跑在 K8s 上的智能助手，对接钉钉/飞书
- **MCP Server**：Agent 内部通过 MCP 接公司的 OA、Jira、GitLab 等系统
- **Skill**：MCP 调用的具体规则（"查 Jira 时只搜本周更新的"）、回复格式、安全策略，写在 SKILL.md 里
- **Claude 插件**：上面所有 Skill + MCP 配置打包，开发者本地也能装一份，开发时和线上 Agent 行为一致

这是工程上最干净的拆法：状态去 Agent 服务、外部集成去 MCP Server、规则知识去 Skill、分发整合去 Plugin。每一层只做自己最擅长的事。

## 选型反模式

把这几个坑记下来，能省一大半弯路：

**反模式 1**：把 Jira 集成做成 Skill。让 AI 在 SKILL.md 指令里自己拼 HTTP 请求、自己处理 token 刷新，结果一次 review 要做十几次 API 调用，每次都重新认证。这种 → 走 MCP Server。

**反模式 2**：把团队 review 规范做成 MCP Server。开个进程让它跑着，每次 review 时 AI 通过 MCP 调一下"获取 review 规则"。这个进程除了返回一段静态文本什么都不干。这种 → 走 Skill。

**反模式 3**：发布给团队的工具只有一个 Skill。然后写一份文档教大家"把这个目录复制到 `~/.claude/skills/`下"。每次升级所有人手动 pull。这种 → 用 Plugin marketplace。

**反模式 4**：把 Agent 服务做成 Skill。让用户每次需要这个能力都得打开 Claude Code、贴进 prompt。这种 → 独立部署 Agent 服务，对外提供 API/Webhook。

## 这本书的边界

这本书只写 Skill。MCP、Plugin、Agent 服务都有自己的工程范畴：

- MCP 的实现细节、协议升级、跨进程通信，可以读 Anthropic 的 MCP 官方文档和社区 SDK
- Claude 插件的打包发布机制，第 25 章会从"用 Plugin 分发 Skill"的角度讲到核心部分
- Agent 服务的完整工程实践，可以读这套书系里的另一本《百万级 AI Agent 平台架构》

接下来的章节，默认你已经答完了上面四个问题，确认要写的就是 Skill。
