---
title: 实战——后端 API 安全审计 Skill
feishu_url: "https://fivwvysqdz.feishu.cn/docx/OKmTdgI0vorfYuxLxXHcVwPrn7d"
last_synced: "2026-06-03T14:13:32Z"
---

第 26 章讲了一个前端团队的 90 天工程时间线。这一章讲一个性质完全不同的场景：**后端 API 的安全审计 Skill**。

性质不同在哪？前端 review 漏检一个 a11y 缺失，开发体验差一点，无大事。后端 API 漏检一个权限校验，可能是真实的生产安全事故——用户能看别人数据、能改别人的数据、敏感操作被绕过。

工程取舍因此变化：**对漏检（false negative）的容忍度极低，对误报（false positive）反而要忍**。这一章讲怎么按这个不同的取舍来设计 Skill。

主角是某金融 SaaS 团队，做后端账户管理系统。Express + TypeScript + Postgres，对外 REST API。安全合规是合规要求（SOC2、ISO 27001），每次 PR 必须人审 + 工具审。Lead 决定做一个 `api-security-audit` Skill 强化每个 API 的安全审查。

## 设计哲学：宁可误报，不可漏检

写这个 Skill 前先想清楚：

**用户场景**：reviewer 看了 PR 后跑一遍 `/api-security-audit`，让 Skill 找潜在安全问题。

**核心问题**：reviewer 会基于 Skill 输出做决策。漏报一条 → 安全问题进生产；误报一条 → reviewer 多花 1 分钟核查后驳回。

漏报的代价 >> 误报的代价。所以指令要写成：**穷尽检查，宁可指出可疑的，不可放过明确的**。

这跟前端 review 的"按文件规模分级"哲学是相反的：前端在乎 reviewer 的注意力预算（评论太多会被忽略），后端 API 安全在乎漏过任何一个真问题。

## v1：基础检查清单

`.claude/skills/api-security-audit/SKILL.md`：

```yaml
---
name: api-security-audit
description: "审计后端 API 的安全风险。当用户说'审 API 安全'、'audit API'、'check security'、'看看这个 API 安全不安全'、'review security'时使用。"
metadata:
  version: "0.1.0"
  owner: "@backend-security"
disable-model-invocation: false
allowed-tools: "Read Grep Bash(grep:*)"
---

你是一个后端 API 安全审计员。审计哲学：**宁可指出可疑的，不可放过明确的**。

## 必查项

对每个 API endpoint，检查以下 8 类问题。任何一类发现，按严重度评分。

### 1. 鉴权 (Auth)

- 是否有 middleware 校验 JWT / session？
- 是否对 admin / 普通用户做了区分？
- 是否区分了"已登录"和"已授权"？登录不等于有权限访问该资源

### 2. 授权 (AuthZ)

- 读资源时，是否校验当前用户是该资源的 owner（IDOR 风险）？
- 写资源时，同样校验
- 列表查询时，是否过滤了 user_id？（"我能看自己的订单"，但参数没限制就能看到所有人的）

### 3. 输入校验

- 所有用户输入（path param、query、body）都做了类型 + 范围 + 格式校验？
- 长字符串字段有没有最大长度限制？
- 数值字段有没有上下界？
- 文件上传有没有限制类型、大小、路径？

### 4. SQL / 注入

- 所有 SQL 都用参数化查询（不是字符串拼接）？
- 用 ORM 的话，是否避免了 raw query？
- NoSQL 注入：是否避免了把 user input 直接传给 query DSL？
- 命令注入：是否避免了 exec/spawn 拼接 user input？

### 5. 敏感数据

- 响应中是否泄露了不该返回的字段（password hash、internal_id、admin notes）？
- error message 是否泄露了实现细节（堆栈、SQL、内部路径）？
- 日志中是否打印了敏感信息（密码、token、信用卡）？

### 6. CSRF / CORS

- POST/PUT/DELETE 端点是否启用了 CSRF 保护？
- CORS 配置是否过于宽松（Access-Control-Allow-Origin: *）？
- 凭据 cookie 是否设了 SameSite / HttpOnly / Secure？

### 7. 速率限制 / DoS

- 用户认证端点（登录、忘记密码、注册）是否有 rate limit？
- 重计算端点（搜索、聚合）是否做了 timeout + result size limit？
- 用户可控的循环参数（limit=10000）有没有上限？

### 8. 业务流程安全

- 涉及金钱、权限变更、数据导出的操作是否要求二次确认或 step-up auth？
- 状态机变更是否校验前置状态（避免越过中间状态直接到 finished）？
- 重要操作是否记了审计日志？

## 输出格式

按 endpoint 分组，每个 endpoint 一段。每个发现的问题：

```
[P0/P1/P2] [类别] 一句话问题描述
位置: file.ts:42
风险: 一段话说明攻击场景或后果
代码片段:
  <可疑的代码片段>
修复:
  <具体的修复方式>
建议测试:
  <如何在测试中验证修复，比如发什么样的请求会被拒绝>
```

## 严重度判定

- **P0**：可被远程利用、影响数据安全或权限。例如 IDOR、SQL 注入、未鉴权的写操作、敏感字段泄露
- **P1**：需要特定条件触发，或影响有限。例如缺 rate limit、CORS 过宽、错误消息泄露实现细节
- **P2**：最佳实践层面的建议。例如可以加 audit log、可以加二次确认

## 关键原则

- **宁可指出可疑，不可放过明确**：如果一段代码看起来像是缺校验但不确定，标 P1 让 reviewer 确认，不要因为不确定就跳过
- **每个发现都要带"攻击场景"**：不只说"这是 IDOR"，还要写"攻击者发请求 GET /api/orders/123 即使 order 123 不属于他"
- **修复必须给具体代码**：不能只说"加权限校验"，要给出完整的 middleware / if 检查代码
```

这个 Skill 长很多（200+ 行）。后端安全的本质是穷举，必须把所有该查的列出来。SKILL.md 不超过 500 行的纪律在这种 Skill 上要放宽——这是规则集，不是叙事性指令。

## 准备测试用例：放真实的"漏洞"代码

按第 19 章的 evals.json：

```json
{
  "skill_name": "api-security-audit",
  "baseline_pass_rate": null,
  "evals": [
    {
      "id": "idor-get",
      "name": "IDOR：读资源不校验 owner",
      "prompt": "audit src/api/orders.ts",
      "workspace": "test-idor",
      "assertions": [
        "指出 GET /orders/:id 没有校验 order.user_id 是否等于 currentUser.id",
        "标记为 P0",
        "给出具体修复代码（if order.user_id !== req.user.id throw 404）",
        "说明攻击场景（攻击者枚举 ID 看别人订单）"
      ]
    },
    {
      "id": "sql-injection",
      "name": "SQL 注入：字符串拼接",
      "prompt": "audit src/api/search.ts",
      "workspace": "test-sql-injection",
      "assertions": [
        "指出 db.query 用了字符串拼接 user input",
        "标记为 P0",
        "建议改用参数化查询（$1, $2 占位符）",
        "说明攻击 payload 示例"
      ]
    },
    {
      "id": "sensitive-leak",
      "name": "响应泄露敏感字段",
      "prompt": "audit src/api/users.ts",
      "workspace": "test-sensitive-leak",
      "assertions": [
        "指出 GET /users/:id 响应包含 password_hash",
        "指出响应包含 internal_admin_notes",
        "标记为 P0",
        "建议使用 select 白名单或 DTO 转换"
      ]
    },
    {
      "id": "missing-rate-limit",
      "name": "登录端点缺 rate limit",
      "prompt": "audit src/api/auth.ts",
      "workspace": "test-rate-limit",
      "assertions": [
        "指出 POST /login 没有 rate limit",
        "标记为 P1",
        "建议使用 express-rate-limit 或类似中间件"
      ]
    },
    {
      "id": "csrf-missing",
      "name": "POST 端点没有 CSRF 保护",
      "prompt": "audit src/api/account.ts",
      "workspace": "test-csrf",
      "assertions": [
        "指出 POST /account/delete 缺 CSRF token",
        "标记为 P1（如果使用 SameSite cookie）或 P0（如果不是）"
      ]
    },
    {
      "id": "no-false-positive-safe",
      "name": "已经安全的代码不应该被误报",
      "prompt": "audit src/api/products.ts",
      "workspace": "test-safe-code",
      "assertions": [
        "不指出 GET /products/:id 有 IDOR 风险（products 是公开资源）",
        "不指出参数化查询有 SQL 注入风险",
        "如果有任何 P0/P1，必须是真实问题"
      ]
    }
  ]
}
```

最后一个 `no-false-positive-safe` 用例很关键——后端 Skill 不能"什么都标红"。要测它对**安全的代码**不误报。

跑评测：

```
with_skill:    17/19 通过 → pass_rate 0.89
without_skill:  8/19 通过 → pass_rate 0.42

Delta: +0.47
```

漏的两条：

- `csrf-missing` 没识别出 SameSite cookie 的关联（这是知识盲点）
- `no-false-positive-safe` 误报了 1 个（把"公开资源没有 owner 校验"也标了）

迭代：在 SKILL.md 里加"公开资源不需要 ownership 校验"的判断，CSRF 增加 SameSite cookie 的相关知识。

## 第二次迭代：补 OWASP Top 10 reference

后端安全的知识 base 应该有具体的、可引用的标准。把 OWASP Top 10 拆出来作为 reference：

```
.claude/skills/api-security-audit/
├── SKILL.md
├── references/
│   ├── owasp-top10.md            ← 2025 版 OWASP，每条带攻击例
│   ├── idor-patterns.md          ← IDOR 的 6 种常见模式 + 修复模板
│   ├── sql-injection-patterns.md ← 注入的 4 种模式 + ORM-specific
│   ├── auth-patterns.md          ← JWT / session / oauth 的常见漏洞
│   └── CHANGELOG.md
├── evals.json
├── benchmark.json
└── test-data/
```

`references/idor-patterns.md` 示例（节选）：

```markdown
# IDOR (Insecure Direct Object Reference) 模式

## 模式 1：URL 参数直接做查询

特征：endpoint 接受资源 ID，查询时不校验 ownership

漏洞代码：
```typescript
app.get('/api/orders/:id', auth(), async (req, res) => {
  const order = await db.orders.findById(req.params.id)
  res.json(order)
})
```

修复模板：
```typescript
app.get('/api/orders/:id', auth(), async (req, res) => {
  const order = await db.orders.findById(req.params.id)
  if (!order) throw new NotFoundError()
  if (order.user_id !== req.user.id) throw new NotFoundError() // 故意 404 不 403
  res.json(order)
})
```

为什么 404 而非 403？因为 403 暴露了"资源存在"这个信息，攻击者还能枚举哪些 ID 有效。

## 模式 2：列表查询不过滤

特征：列表查询接受过滤参数但不强制 user_id

漏洞代码：
```typescript
app.get('/api/orders', auth(), async (req, res) => {
  const orders = await db.orders.find({ status: req.query.status })
  res.json(orders)
})
```

修复：
```typescript
app.get('/api/orders', auth(), async (req, res) => {
  const orders = await db.orders.find({
    user_id: req.user.id,  // 强制
    status: req.query.status,
  })
  res.json(orders)
})
```

## 模式 3：批量 ID 更新

特征：用户传一组 ID 做批量操作，没有逐项校验

漏洞代码：
```typescript
app.post('/api/orders/cancel', auth(), async (req, res) => {
  await db.orders.updateMany(
    { id: { $in: req.body.order_ids } },
    { status: 'cancelled' },
  )
})
```

修复：必须在 query 里加 user_id 过滤
```typescript
await db.orders.updateMany(
  { id: { $in: req.body.order_ids }, user_id: req.user.id },
  { status: 'cancelled' },
)
```
```

类似拆出 SQL 注入、Auth 漏洞的 reference。

SKILL.md 工作流变成：

```markdown
1. 读 references/idor-patterns.md 了解 6 种 IDOR 模式
2. 读 references/sql-injection-patterns.md 了解注入模式
3. 读 references/auth-patterns.md 了解认证漏洞
4. 逐 endpoint 审计，对每个发现，引用对应的 reference 模式
```

引用 reference 是为了输出的可追溯性。reviewer 看到"这是 IDOR 模式 2"，能立刻去 reference 看完整解释。

## 集成现有安全工具：用 hooks 在 Skill 前跑 semgrep

按第 12 章的 hooks：纯静态分析能查的（npm audit、semgrep、bandit、CodeQL）应该自动跑，让 Skill 专注语义层面的检查。

在 plugin manifest 里：

```json
{
  "name": "api-security-audit",
  "version": "0.2.0",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

`hooks/hooks.json`：

```json
{
  "PreToolUse": [
    {
      "matcher": "Skill",
      "condition": "skillName == 'api-security-audit:api-security-audit'",
      "hooks": [
        {
          "type": "command",
          "command": "cd \"${CLAUDE_PROJECT_DIR}\" && semgrep --config=auto --json --output=/tmp/semgrep-result.json . 2>/dev/null; echo done"
        }
      ]
    }
  ]
}
```

SKILL.md 工作流增加：

```markdown
0. 读 /tmp/semgrep-result.json，知道 semgrep 已经标了哪些
   - 把 semgrep 的发现加入你的输出，但标注 "[semgrep]" 前缀
   - 重点关注 semgrep 漏掉的、需要业务逻辑理解的问题
```

跑 eval 验证 false negative 没增加。

## 一次真实事故：Skill 漏报了一个 IDOR

某次 PR 引入了一个新 endpoint `POST /api/orders/:id/refund`。Reviewer 跑 Skill 审计，Skill 输出 "无 P0/P1 问题"。Reviewer 信了，合并。

一周后，安全团队季度审计发现这个 endpoint 有 IDOR——攻击者能 refund 别人的订单（钱从对方 stripe 账号退到自己绑定的银行卡）。

事故复盘：

- **直接原因**：endpoint 有 auth() 中间件，但没校验 `order.user_id === req.user.id`。Skill 把"有 auth"当成"有授权"
- **Skill 设计缺陷**：第 1 类（auth）和第 2 类（authZ）的边界模糊，AI 看到 auth() 就 OK 了，没继续追授权
- **eval 盲区**：测试用例里没有"auth() 中间件存在但缺 IDOR 校验"这种**最常见的真实漏洞模式**

修复链：

1. **立即修这个 PR**：加 ownership 校验，发热补丁
2. **加新 eval 用例**：覆盖"auth 通过但 authZ 漏"
3. **修 SKILL.md**：把"auth ≠ authZ"作为第一条强调。在 references/auth-patterns.md 加入这个模式作为 #1
4. **跑回归 eval**：所有原有用例 + 新加的 4 个用例。pass_rate 暂时降到 0.85，因为 Skill 现在更挑剔，原来通过的几条断言现在需要更细的判定
5. **手动 review 25 个历史合并的 PR**：用 Skill v0.3 + 新规则，重新扫一遍最近 25 个 PR。发现 3 个潜在 IDOR（一个真问题、两个误报），真问题立即修复

这次事故的产出不只是修了一个 bug。它揭示了一个**类**的漏洞模式（auth ≠ authZ），加入了 reference 和 eval 之后，未来同类问题不会再被漏过。

## 自我检测：用 grader + meta-grader 持续优化

第 19 章讲过的 meta-grader 在这种 Skill 上格外有用。安全 review 的断言很容易写成"模糊断言"：

```
弱断言："指出 IDOR 风险"
问题：AI 提到任何跟 user_id 相关的话都能算通过
改进："指出 GET /orders/:id 中 order.user_id 没有和 req.user.id 对比，并给出加 if 检查的完整代码片段"
```

每个版本迭代前先跑 meta-grader：

```bash
npx tsx scripts/meta-grader.ts \
  --evals .claude/skills/api-security-audit/evals.json
```

输出可能是：

```
meta-grader 报告：

弱断言 (5)：
- idor-get / "指出 IDOR 风险" → 太模糊
- ...

不可验证断言 (2)：
- ... 

强断言 (12)：
- ...

建议改写：
[具体的改写建议]
```

把弱断言改完再跑 grader。这是后端安全 Skill 比前端 review 更需要的纪律——一个含混的断言可能让你以为 Skill 在工作，实际漏掉关键检查。

## 用 ULTRATHINK 处理复杂场景

Claude Code 支持 `ultrathink` 关键词触发更深度推理（在 SKILL.md 任意位置出现即生效）。对复杂的、需要"模拟攻击者思维"的安全审计场景特别有用。

在 SKILL.md 的工作流里增加：

```markdown
## 复杂场景下的深度审计

如果审计的是以下任一种 endpoint，请在分析前 ultrathink：

- 涉及金钱、退款、转账的写操作
- 涉及用户角色变更（提权、降权、邀请）
- 涉及账号关联（绑定第三方账号、合并账号）
- 涉及导出大量数据

ultrathink 时模拟以下角色：
1. 普通用户：会试图越权访问其他用户的资源
2. 注册多个测试账号的攻击者：会试图绕过 rate limit 和 anti-fraud
3. 内部威胁：低权限员工会试图提权
```

`ultrathink` 关键词让模型用更高 effort 推理。耗时和 token 多一些，对关键场景值得。

## 第三次迭代：把规则做成 plugin 给其他后端团队

公司有 5 个后端团队（账户、订单、支付、库存、通知）。账户团队（这一章主角）做完 Skill 后，其他团队也要。

但每个团队的栈不同：
- 账户：Express + Postgres
- 订单：NestJS + MySQL
- 支付：Fastify + Redis
- 库存：Go + Postgres（这个用不了）
- 通知：Python + FastAPI

Express 的几个团队（账户、订单、支付）可以直接复用，但要 generalize：

```yaml
# plugin.json
{
  "name": "backend-api-security",
  "version": "1.0.0",
  "userConfig": {
    "framework": {
      "type": "string",
      "title": "Backend framework",
      "description": "Your backend framework (affects pattern matching)",
      "default": "express"
    },
    "db_type": {
      "type": "string",
      "title": "Database type",
      "default": "postgres"
    }
  }
}
```

SKILL.md 里通过 `${user_config.framework}` 加载对应 framework 的具体 patterns：

```markdown
1. 根据 framework 配置（当前: ${user_config.framework}），读对应的 reference：
   - express → references/express-patterns.md
   - nestjs → references/nestjs-patterns.md
   - fastify → references/fastify-patterns.md
```

通知团队（Python + FastAPI）需要专门写一组，但 7-8 类核心安全检查的清单是通用的——只是 syntax 不同。后续迭代会加 `python-fastapi-patterns.md`。

## 与前端 review Skill 的工程哲学对比

写完两个 Skill 后，对比一下两个工程取舍的差异：

| 维度 | 前端 review | 后端 API 安全 |
|------|------------|--------------|
| 主要风险 | 漏检（噪音多） | 漏检（安全事故） |
| 漏检的代价 | 体验下降 | 真实损失 |
| 误报的代价 | reviewer 体验差，可能被忽略 | reviewer 多花 1 分钟核查 |
| 优化方向 | 减少噪音、按规模分级 | 穷尽检查、宁可指出可疑 |
| Skill body 长度 | 短，按规模动态加载 references | 长，所有规则必现 |
| eval baseline 阈值 | pass_rate > 0.85 即可上线 | 必须 > 0.92，且 false negative <= 1% |
| 触发方式 | 自动（description 匹配） | 半自动（建议作为 PR 必跑步骤） |
| 失效场景 | 文件太大被漏跑 | 没人记得跑（hooks 自动触发） |

这两个对比说明一件事：**Skill 的设计取舍由业务场景决定，没有"通用最佳实践"**。

下一章是毕业项目——综合应用前面所有章节的知识，从 0 设计一个生产级 Skill。看了前两章，你会知道毕业项目的关键不是"会写所有功能"，而是"在你的场景下做对工程取舍"。
