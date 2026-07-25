---
title: 用 Plugin 分发 Skill
feishu_url: "https://fivwvysqdz.feishu.cn/docx/VWHIdcXsSoPxlsxICaPcX0ednVc"
last_synced: "2026-06-03T14:13:32Z"
---

到目前为止，分发 Skill 这件事我都没认真讲过。前面默认你在做一件事——把 SKILL.md 写好、git commit、推送、其他成员 git pull。这套对项目内部的 Skill 够用，对一两个 Skill 的开源分享也够用。

但有一天你会撞到这些情况：

- 你写了一个 code-review Skill，想让公司内 30 个团队都能用，但没人愿意手动 clone 你的仓库再复制到 `~/.claude/skills/`
- 你的 Skill 依赖一个 MCP Server（用来查公司内部组件库）。光复制 SKILL.md 不够，MCP Server 配置也要装上
- 你想跟着 Skill 一起分发几个 Subagent、几个 Hook（比如 commit 前自动跑 lint）
- 升级一个新版本，30 个团队怎么同步更新？哪个团队还在用旧版本？怎么回退？

这些问题，分散的 SKILL.md 解决不了。它们是 plugin 解决的问题。

这一章讲怎么把你已经写好的 Skill 升级成 plugin，发到 marketplace，让别人一句话装上。第 24 章讲过的版本管理、灰度、回退在这里有了真正的载体。

## Plugin 的工程定位

第 3 章给过一句话定义：plugin 是 Claude Code 的"运输容器"。它本身不增加新能力，但能把多种能力（Skill、Subagent、Hook、MCP Server、output style、LSP、监控）打包在一个目录里，让用户一次安装、一次升级、一次卸载。

工程意义有三层：

**第一层：一次安装多种东西**。你的 Skill 调用 MCP Server，MCP Server 需要 npx 装包。光给用户 SKILL.md 不够，得让 MCP 配置也装到位。Plugin 把这两件事打包。

**第二层：版本化**。Plugin 有 SemVer 版本号，能 pin，能升级，能回退。比起"复制最新的 main 分支文件夹"，有质的区别。

**第三层：命名空间**。Plugin 里的 Skill 自动加上 `plugin-name:skill-name` 命名空间，不会和用户本地 Skill 冲突。两个 plugin 都提供 `code-review`，互不打架。

## 把现有 Skill 升级成 Plugin

最小成本的路径：你已经有一个 `.claude/skills/code-review/` 目录，怎么变成 plugin？

**方法一：单 Skill plugin**（最简）

直接在 Skill 目录里加一个 `.claude-plugin/plugin.json`：

```
code-review/
├── .claude-plugin/
│   └── plugin.json
├── SKILL.md
├── references/
└── scripts/
```

`plugin.json`：

```json
{
  "name": "code-review",
  "displayName": "Code Review Skill",
  "version": "2.3.0",
  "description": "Team code review skill with security and React conventions",
  "author": { "name": "Frontend Platform Team" },
  "repository": "https://github.com/your-org/code-review-skill",
  "license": "MIT"
}
```

完事。这个目录已经是一个 plugin。Claude Code 2.1.142+ 会自动识别：根目录的 `SKILL.md` 就是这个 plugin 的核心 Skill，命令名取 frontmatter 的 `name`。

**方法二：多 Skill plugin**（推荐）

如果你想分发一组配套的 Skill，建一个 plugin 容器：

```
frontend-platform/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── code-review/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── component-generator/
│   │   └── SKILL.md
│   └── changelog-writer/
│       └── SKILL.md
├── agents/
│   └── security-reviewer.md
├── hooks/
│   └── hooks.json
├── .mcp.json
└── CHANGELOG.md
```

`plugin.json`：

```json
{
  "name": "frontend-platform",
  "displayName": "Frontend Platform",
  "version": "1.0.0",
  "description": "Frontend team Skills, Subagents, Hooks and MCP integrations",
  "author": { "name": "Frontend Platform Team", "email": "fe-platform@company.com" }
}
```

`hooks/hooks.json`：

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "\"${CLAUDE_PLUGIN_ROOT}\"/scripts/format-on-save.sh"
        }
      ]
    }
  ]
}
```

`.mcp.json`：

```json
{
  "mcpServers": {
    "internal-components": {
      "command": "npx",
      "args": ["@your-org/components-mcp"],
      "env": {
        "API_TOKEN": "${user_config.api_token}"
      }
    }
  }
}
```

装这个 plugin 的人，一次性得到了 3 个 Skill、1 个 Subagent、1 个 hook、1 个 MCP Server。

## 命名空间的工程含义

装完上面的 plugin 后，用户在 Claude Code 里看到的命令名是带前缀的：

```
/frontend-platform:code-review
/frontend-platform:component-generator
/frontend-platform:changelog-writer
```

这个命名空间是平台自动加的，作用是：

- **不冲突**：用户本地有自己的 `code-review` Skill，plugin 提供的也叫 `code-review`，两者共存
- **可识别来源**：从命令名就能看出"这是 frontend-platform plugin 提供的"
- **可路径访问**：在 settings 里限定权限 `Skill(frontend-platform:*)` 一次性管所有

对用户来说，每次都打 `/frontend-platform:code-review` 太长。两个解决办法：

1. 在 settings.json 里加 alias（虽然不能彻底替代命名空间，但能省字）
2. Plugin 作者把命令名设计短一点。用 `fp:review` 而不是 `frontend-platform:code-review`，但要权衡 plugin 名的可识别性

我个人的经验：plugin 名宁可长，让命令短。`frontend-platform` 一眼看出来源比 `fp` 强得多。

## userConfig：让用户在装的时候配置参数

上面 `.mcp.json` 里的 `${user_config.api_token}` 不是凭空来的。在 plugin manifest 里声明：

```json
{
  "name": "frontend-platform",
  "version": "1.0.0",
  "userConfig": {
    "api_token": {
      "type": "string",
      "title": "Internal API Token",
      "description": "Get yours from https://internal-platform.your-org.com/tokens",
      "sensitive": true,
      "required": true
    },
    "default_branch": {
      "type": "string",
      "title": "Default branch name",
      "description": "Branch to compare PR diffs against",
      "default": "main"
    }
  }
}
```

`/plugin install` 安装这个 plugin 时，Claude Code 弹出对话框让用户填这两个字段。填完之后：

- 非 sensitive 字段存到 `settings.json` 的 `pluginConfigs[plugin-id].options`
- sensitive 字段（API token）存到系统 keychain，不会明文存到磁盘

后续 plugin 内部所有地方都能用 `${user_config.api_token}` 引用，包括 MCP 配置、hook 命令、Skill 内容、监控命令。

这个机制解决了"团队 Skill 用到内部 token / endpoint"的部署难题。以前的做法是每个开发者自己改 settings.json 加 token，错配率高。现在装 plugin 时引导式输入，错配率显著降低。

## Marketplace：分发的载体

到目前为止，plugin 还只是一个 git 仓库。让它能被 `/plugin install xxx` 一行安装，需要 marketplace。

### 公开 marketplace

Anthropic 维护的 [anthropics/skills](https://github.com/anthropics/skills) 仓库本身就是一个 marketplace。注册它：

```
/plugin marketplace add anthropics/skills
```

之后从这个 marketplace 装 plugin：

```
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```

`@anthropic-agent-skills` 这部分就是 marketplace 标识符（marketplace name），来自 marketplace 仓库的 `.claude-plugin/marketplace.json`。

### 自建公司 marketplace

公司内部有 50 个 plugin？建一个内部 marketplace：

```
company-skills-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   ├── frontend-platform/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   └── ...
│   ├── backend-platform/
│   │   └── ...
│   └── data-platform/
│       └── ...
```

`marketplace.json` 大致结构：

```json
{
  "name": "company-skills",
  "displayName": "Company Skills Marketplace",
  "description": "Internal AI Skill plugins",
  "plugins": [
    {
      "name": "frontend-platform",
      "path": "./plugins/frontend-platform"
    },
    {
      "name": "backend-platform",
      "path": "./plugins/backend-platform"
    },
    {
      "name": "data-platform",
      "path": "./plugins/data-platform"
    }
  ]
}
```

把这个仓库 push 到内部 Gitlab，团队成员注册：

```
/plugin marketplace add gitlab.company.com/platform/company-skills
```

然后装：

```
/plugin install frontend-platform@company-skills
/plugin install data-platform@company-skills
```

一行命令，整套 Skill + Subagent + Hook + MCP 配置就位。

## 版本管理：plugin.json 里的 version 字段

`plugin.json` 里的 `version` 字段决定升级行为：

```json
{
  "version": "2.3.0"
}
```

- **设了 version**：用户只在你 bump version 字段（commit + tag）时才收到更新
- **没设 version**：每次 git commit SHA 变都被视为新版本，用户会持续收到更新

生产 plugin 必须设 version。否则灰度发布、回退、变更通知都失去基线。

`/plugin update` 是用户主动行为，不会被动升级。这是和 web 应用最大的区别——用户保持当前版本不动，直到他自己决定升级。这给了 plugin 作者更多的自由度（可以中断性更新），也给了用户更多的稳定性（不会突然某天工作流被改）。

### Pin 到特定版本

用户想 pin 到一个稳定版本：

```
/plugin install frontend-platform@company-skills@2.2.0
```

后续即使 marketplace 推了 2.3.0，这个用户也不升级，除非他自己 `/plugin update` 或者重装。

适合的场景：
- CI 环境，必须用经过验证的版本
- 关键业务 Skill，团队在做兼容性 review 期间锁住版本
- 出问题后回退

## 一个真实的发布工作流

把上面所有东西串起来，看一次完整发布。

**Day 1：开发**

```bash
# 在 marketplace 仓库的 plugins/frontend-platform 下开发
cd company-skills-marketplace/plugins/frontend-platform/

# 改 SKILL.md，跑本地 eval，确认 pass_rate 提升
npx tsx scripts/eval-runner.ts --skill ./skills/code-review

# 更新 version
# plugin.json: "version": "2.3.0-rc.1"
# CHANGELOG.md: 写本次改动

git add . && git commit -m "code-review 2.3.0-rc.1: add SQL injection checks"
git push
```

**Day 2-7：灰度**

发邮件通知 early adopters：

> 各位 fe-platform 用户，code-review 有新版本 2.3.0-rc.1，新增 SQL 注入检查规则。本周想试用的同学：
>
> ```
> /plugin install frontend-platform@company-skills@2.3.0-rc.1
> ```
>
> 反馈渠道：#skill-feedback

观察一周。如果反馈良好、CI eval 持续绿、没有用户报告 false positive，进入下一步。如果有人反馈"误报太多"，回到 Day 1 修改后重发 rc.2。

**Day 8：正式发布**

```bash
# bump 到正式版本
# plugin.json: "version": "2.3.0"
# CHANGELOG.md: 移除 rc 标记

git add . && git commit -m "release: frontend-platform 2.3.0"
git tag plugins/frontend-platform/v2.3.0
git push --tags
```

发邮件通知全员：

> 各位，code-review 2.3.0 已发布。升级：`/plugin update frontend-platform@company-skills`

**Day 10：出事故，紧急回退**

某用户报告 2.3.0 在 monorepo 跨 package 场景下挂掉，紧急回退所有人到 2.2.0：

```bash
# 方式 1：marketplace 端撤回
# 把 plugin.json 改回 "version": "2.2.0"，commit + push
# 用户下次 /plugin update 自动回到 2.2.0

# 方式 2：通知用户手动 pin
```

通知里告诉所有人：

> code-review 2.3.0 在 monorepo 跨 package 场景下会误报。紧急回退到 2.2.0，请运行：
>
> ```
> /plugin install frontend-platform@company-skills@2.2.0
> ```
>
> 修好后会发 2.3.1，届时再升级。

## 安装作用域

`/plugin install` 有四个作用域，对应不同分发场景：

| 作用域 | settings 文件 | 适合 |
|--------|--------------|------|
| `user` | `~/.claude/settings.json` | 个人跨项目复用，默认作用域 |
| `project` | `.claude/settings.json` | 团队共享，提交到 git |
| `local` | `.claude/settings.local.json` | 项目内但个人化，gitignored |
| `managed` | 组织托管设置 | 企业级强制下发，只读 |

`project` scope 的实践细节：把 plugin 安装信息 commit 到项目仓库的 `.claude/settings.json`，新人 clone 仓库、进入项目，Claude Code 第一次启动时自动提示安装这些 plugin。同步成本接近零。

`managed` scope 是企业级最关键的选择——IT 团队把 plugin 配置写到 enterprise managed settings 里，所有员工的 Claude Code 启动时自动装上，员工自己不能卸载。安全策略、合规检查 Skill 都该走这条路径。

## defaultEnabled: false 与 "安装但不启用"

```json
{
  "name": "expensive-skill",
  "version": "1.0.0",
  "defaultEnabled": false
}
```

设了之后，plugin 装上是 disabled 状态，用户必须 `claude plugin enable expensive-skill` 才生效。

适合的场景：
- 调用付费 API 的 Skill（用户应该明确选择启用）
- 需要外部凭证的 Skill（启用前要先配 userConfig）
- 实验性功能，希望用户先看 readme 再启用

这是工程上很贴心的设计。用户能批量安装一组 plugin，但有选择地启用其中一部分。

## 跨 plugin 的依赖

某些 plugin 依赖另一个 plugin。比如 `secrets-vault` 提供 MCP Server 让 Skill 读密钥，多个 plugin 都要用它。manifest 声明：

```json
{
  "name": "deploy-tools",
  "version": "1.0.0",
  "dependencies": [
    "helper-lib",
    { "name": "secrets-vault", "version": "~2.1.0" }
  ]
}
```

`~2.1.0` 是 SemVer 范围，匹配 2.1.x 但不匹配 2.2.0。

装 `deploy-tools` 时，Claude Code 自动装 `helper-lib` 和 `secrets-vault@~2.1.0`。两者也被自动启用。

这套机制让大型 plugin 生态有了组合能力。一个公司可以发 10 个独立 plugin，每个职责单一，团队按需装组合。

## 共享代码：${CLAUDE_PLUGIN_ROOT} 和 ${CLAUDE_PLUGIN_DATA}

Plugin 安装后，整个目录被复制到 `~/.claude/plugins/cache/<plugin-id>/`，路径会变。所有 plugin 内引用文件必须用环境变量：

- `${CLAUDE_PLUGIN_ROOT}`：plugin 的安装路径，每次升级会变
- `${CLAUDE_PLUGIN_DATA}`：plugin 的持久化数据目录，升级也保留

典型用法：

```yaml
# SKILL.md 里引用同 plugin 的脚本
---
name: deploy-skill
description: "..."
allowed-tools: "Bash(${CLAUDE_PLUGIN_ROOT}/scripts/deploy.sh)"
---

部署前先跑 ${CLAUDE_PLUGIN_ROOT}/scripts/preflight.sh 做预检。
```

```json
// .mcp.json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      "env": {
        "DATA_DIR": "${CLAUDE_PLUGIN_DATA}"
      }
    }
  }
}
```

`${CLAUDE_PLUGIN_DATA}` 对需要持久化数据的 MCP Server 特别有用——node_modules、缓存、生成的索引文件都该放这里，plugin 升级时不丢。

## 适合用 plugin 的几个真实判断

不是所有 Skill 都该做成 plugin。一份判断清单：

**做成 plugin**：

- ✓ 要给 5+ 团队/项目分发
- ✓ 跟着 MCP Server / Subagent / Hook 一起分发
- ✓ 想要版本管理（pin、回退、灰度）
- ✓ 需要用户在安装时配置参数（userConfig）
- ✓ 想用 enterprise managed settings 强制下发

**不做成 plugin**：

- ✗ 只在一个项目内用的 Skill，commit 到 `.claude/skills/` 更简单
- ✗ 个人 productivity Skill，放 `~/.claude/skills/` 即可
- ✗ 一次性试验/原型，写完几天就删

## 这一章的位置

到第 22 章为止，你已经知道怎么写、怎么团队协作、怎么治理、怎么评测一个 Skill。
第 23 章解决万级规模下的检索问题。
第 24 章解决迭代过程中的版本、灰度、回退问题。
这一章把上面的产出装进可分发的容器。

至此 Skill 的"工程化"层面基本走完。接下来三章（26-28）回到正向场景，把这些工程能力综合应用到三个完整案例上。
