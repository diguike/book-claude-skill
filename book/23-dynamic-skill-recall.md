---
title: 动态 Skill 召回——万级 Skill Hub 与 Tool RAG
feishu_url: "https://fivwvysqdz.feishu.cn/docx/EjTUdl9ZWoDfjyxRXGacJbIyn0f"
last_synced: "2026-06-03T14:13:32Z"
---

到目前为止，这本书所有的 Skill 都是"装在客户端"的：放在 `~/.claude/skills/`、`.claude/skills/`、或者随插件一起进来。Skill 数量在几个到几十个之间时，这个模型完美——每个 Skill 的 description 进 Claude Code 启动时的 system prompt，AI 看得到，能选对。

但有一天你会撞上一个数字：**一千个**，或者**一万个**。

这不是想象。一个中型公司的内部能力清单——OA、Jira、邮件、日历、HRSaaS、CMDB、BI、监控、CI/CD、客户系统、订单系统、库存系统……每个系统里又有十几个细分操作。把这些封装成 Skill，万级是基线，不是上限。

第 24 章会讲怎么管理这种规模下的 Skill 更新。这一章先回答更基础的问题：**AI 在万级 Skill 里，怎么找到当前用得上的那几个？**

## 数学不允许全量加载

把所有 Skill 的 description 塞进 Claude Code 启动时的上下文，这件事在数量到 250 左右就会撞墙。

第 5 章讲过 description 的设计：每个 Skill 大约 150-300 个字符的描述，加 name 大约 50 个 token。Claude Code 默认给 skill listing 1% 的上下文预算（参数叫 `skillListingBudgetFraction`，第 24 章会展开）。200K 上下文窗口的 1% 是 2000 个 token，能装 30-40 个完整 description。

超过这个数字之后，Claude Code 会做两件事：
1. 把低频 Skill 的 description 截短或 drop 掉，只留 name
2. 你装了 5000 个 Skill 也无所谓，只有最近用过、当前路径匹配的少数几个会被完整列出来

到了 5000-10000 这个量级，这套机制就完全不够了。`/doctor` 会持续告诉你 budget overflow。继续往上加，等于在做无用功——AI 看不见。

清华 ToolLLM（ICLR 2024）在 16464 个 API 上做过实验：把全部工具描述塞进 prompt 的 baseline，模型选对工具的准确率只有 13.62%。引入检索之后，准确率涨到 43.13%，token 消耗反而降了 49%。

这两个数字告诉你一件事：**到了万级，"全装"不只是装不下，而是装下了模型也选不准。降低召回范围，反而提升准确率。**

## Tool RAG，不是普通 RAG

把"Skill 检索"理解成"对 description 做向量搜索"是入门思路，但它会让你低估这件事的工程复杂度。

普通 RAG 的目标是**信息获取**：找到和问题相关的段落，作为参考材料喂给模型，模型读完再回答。错了顶多答得不准。

Tool RAG 的目标是**能力路由**：找到能"执行"用户意图的那个函数。模型不是参考它，是要真的调用它，产生真实的副作用（发出一封邮件、写入一条数据库记录、触发一次部署）。错了，邮件就发错给人了。

两者的差异落到工程上：

| 维度 | 普通 RAG | Tool RAG |
|------|---------|----------|
| 检索目标 | 文本段落 | 可执行函数 |
| 结果用途 | 模型参考 | 模型调用 |
| 错误代价 | 答案不准 | 执行错操作 |
| Schema 约束 | 无 | 严格的参数类型校验 |
| 注入量目标 | 可以多段 | 越少越好（噪声会让 AI 选错） |

所以 Tool RAG 的精度要求比普通 RAG 高一个量级。同样是 0.85 的 recall@5，普通 RAG 是"用户读到的 5 段里有 1 段无关，没事"，Tool RAG 是"返回的 5 个工具里有 1 个是错的，模型有 20% 概率挑那个去执行"。

## 两个硬约束

Skill Hub 所有的设计决策都绕着两堵墙转。

**Context 容量墙**：主流模型上下文窗口 128K-200K。每个 Skill 的完整 Schema（name + description + 参数定义）平均 300-500 token。即使整个 context 全给 Skill，也只能装 300-400 个。

10000 个 Skill 的场景，意味着你必须在注入前过滤掉 97% 以上。

**延迟墙**：Agent 每轮对话目标响应在秒级。Skill 检索作为其中一个环节，预算 100-200ms。超过这个值用户能明显感到卡顿。

后面所有的方案都是在这两堵墙之间找平衡。

## 三阶段流水线

Skill Hub 的核心是一个三阶段检索：

```
用户请求（自然语言）
        │
        ▼
┌─────────────────────┐
│  Stage 1: 向量召回   │  ~5-50ms
│  query → embedding  │
│  → HNSW 向量搜索    │
│  → top-k 候选 Skill │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Stage 2: LLM 重排  │  ~200ms（按需触发）
│  候选分数过于接近时  │
│  用小模型精细排序    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Stage 3: Schema 注入 │
│  把选中 Skill 的完整 │
│  Schema 注入 context │
│  → AI 调用执行       │
└─────────────────────┘
```

大多数请求只走 Stage 1 + Stage 3，端到端 50ms 以内。Stage 2 是兜底——当向量分数太接近、难以区分时，用小模型再精排一遍。代价是把延迟推到 300ms+，所以要节制触发。

## 词汇鸿沟：Schema 不能直接喂 Embedding

最常见的错误做法是把 JSON Schema 直接转成向量：

```json
// Schema 原文
{
  "name": "calendar_event_create",
  "parameters": {
    "summary": { "type": "string" },
    "start_time": { "type": "integer" },
    "attendees": { "type": "array" }
  }
}
```

这段文本对 embedding 模型来说接近乱码。它满是机器标识符、类型声明、结构噪声，自然语言语义密度极低。

用户问"帮我约一个明天下午三点的会"。这句话的向量和上面那段 Schema 的向量距离会非常远。召回失败。

解决方案是**语义富化**：入库时为每个 Skill 生成多样化的自然语言描述，用这些描述（而非 Schema）算 embedding。

```typescript
interface SkillDocument {
  // 原始字段
  id: string
  name: string               // "calendar_event_create"
  title: string              // "创建日历事件"
  description: string        // 官方描述
  schema: object             // 完整 JSON Schema

  // 富化字段（关键）
  synthetic_queries: string[] // LLM 生成的假设用法
  key_topics: string[]        // 关键主题词
  usage_examples: object[]    // 调用示例

  // 向量字段
  embedding: number[]        // 由富化文本生成
  hash: string               // SHA-256，用于增量更新
}
```

`synthetic_queries` 是关键，给 `calendar_event_create` 举例：

```json
[
  "帮我安排一个会议",
  "约明天下午三点开会",
  "在日历上新增一个事件",
  "创建周例会，邀请团队成员",
  "schedule a meeting for tomorrow",
  "add a new calendar event with attendees"
]
```

这些查询描述用户**想做什么**，不是 API **是什么**。这正是 embedding 模型擅长处理的语言形式。

## TDWA 加权向量

ScaleMCP 论文（2025）提出的 Tool Document Weighted Average：不同字段分别算 embedding，再按权重加权平均。

```python
def build_skill_embedding(skill: SkillDocument) -> list[float]:
    weights = {
        "synthetic_queries": 0.45,  # 最高权重：贴近用户意图
        "description":       0.25,  # 官方描述
        "title":             0.20,  # 技能名称
        "key_topics":        0.10,  # 主题词
    }

    embeddings = {}
    for field, weight in weights.items():
        text = extract_text(skill, field)
        embeddings[field] = embed(text)

    # 加权平均
    final = sum(
        embeddings[f] * w
        for f, w in weights.items()
    )
    return normalize(final)
```

比起把所有文本拼起来一起算 embedding，TDWA 让 synthetic_queries 字段在向量空间里获得了更大权重，召回准确率显著提升。直觉上这是合理的——用户意图最接近 synthetic_queries 的语言形式。

## 数据库 Schema

用 Postgres + pgvector：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  schema      JSONB NOT NULL,

  category    TEXT NOT NULL,
  tags        TEXT[] DEFAULT '{}',

  version     TEXT DEFAULT '1.0.0',
  author      TEXT,
  is_active   BOOLEAN DEFAULT true,

  -- 增量同步的 hash
  hash        TEXT NOT NULL,

  -- 富化字段
  synthetic_queries  TEXT[],
  key_topics         TEXT[],
  usage_examples     JSONB,

  -- 向量
  embedding   vector(1536),

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- HNSW 索引：支持增量插入，查询 3-5ms
CREATE INDEX idx_skills_embedding
  ON skills USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_skills_category ON skills (category);
CREATE INDEX idx_skills_tags     ON skills USING GIN (tags);
CREATE INDEX idx_skills_active   ON skills (is_active) WHERE is_active = true;
```

两个索引选择需要说一下：

- **HNSW vs IVFFlat**：HNSW（Hierarchical Navigable Small World）支持增量插入，不需要预先知道数据量。IVFFlat 需要先跑 `CLUSTER` 才能获得好性能，对频繁更新的场景不合适。
- **GIN for tags**：tags 是数组字段，GIN 索引支持 `@>`（包含）和 `&&`（相交）操作符，BTREE 不支持。

## 检索服务核心代码

```typescript
interface RetrievalRequest {
  query: string
  category?: string
  tags?: string[]
  limit?: number
  threshold?: number
}

interface RetrievedSkill {
  id: string
  name: string
  title: string
  description: string
  schema: object
  score: number
}

class SkillRetriever {
  constructor(
    private db: Pool,
    private redis: Redis,
    private embedder: Embedder,
  ) {}

  async retrieve(req: RetrievalRequest): Promise<RetrievedSkill[]> {
    // ① Redis 缓存（命中 ~1ms）
    const cacheKey = this.buildCacheKey(req)
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // ② Query embedding（5-50ms）
    const embedding = await this.embedder.embed(req.query)

    // ③ pgvector HNSW 搜索（3-5ms）
    const categoryFilter = req.category ? `AND category = $3` : ''
    const tagsFilter     = req.tags?.length ? `AND tags @> $4` : ''

    const sql = `
      SELECT
        id, name, title, description, schema,
        1 - (embedding <=> $1::vector) AS score
      FROM skills
      WHERE is_active = true
        AND 1 - (embedding <=> $1::vector) > $2
        ${categoryFilter}
        ${tagsFilter}
      ORDER BY embedding <=> $1::vector
      LIMIT ${req.limit ?? 10}
    `

    const params: unknown[] = [
      vectorToString(embedding),
      req.threshold ?? 0.70,
      ...(req.category ? [req.category] : []),
      ...(req.tags?.length ? [req.tags] : []),
    ]

    const result = await this.db.query(sql, params)
    let skills = result.rows as RetrievedSkill[]

    // ④ 可选 LLM 重排
    if (this.shouldRerank(skills)) {
      skills = await this.llmRerank(req.query, skills)
    }

    // ⑤ 写缓存
    await this.redis.setex(cacheKey, 60, JSON.stringify(skills))

    return skills
  }

  // 重排触发条件：结果 > 5 个，且最高分和最低分差距 < 0.05
  private shouldRerank(skills: RetrievedSkill[]): boolean {
    if (skills.length <= 5) return false
    const spread = skills[0].score - skills[skills.length - 1].score
    return spread < 0.05
  }

  // 用 gpt-4o-mini 从候选中精选 top-3
  private async llmRerank(
    query: string,
    candidates: RetrievedSkill[],
  ): Promise<RetrievedSkill[]> {
    const prompt = `
User intent: "${query}"

Candidate skills (ordered by embedding similarity):
${candidates.map((s, i) => `${i + 1}. ${s.name}: ${s.description}`).join('\n')}

Return the indices (1-based) of the top 3 most relevant skills as JSON.
Example: { "indices": [2, 5, 1] }
`
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 50,
    })

    const { indices } = JSON.parse(response.choices[0].message.content!)
    return indices.map((i: number) => candidates[i - 1]).filter(Boolean)
  }

  private buildCacheKey(req: RetrievalRequest): string {
    const key = `skill:search:${req.query}:${req.category ?? ''}:${(req.tags ?? []).join(',')}:${req.limit ?? 10}`
    return createHash('sha256').update(key).digest('hex').slice(0, 16)
  }
}
```

## Embedding 模型选型

延迟上限主要被 embedding 计算决定。

| 模型 | 部署方式 | 延迟 | 费用 | 中文效果 | 适合 |
|------|---------|------|------|---------|------|
| text-embedding-3-small | OpenAI API | ~50ms | $0.02/1M token | 良好 | 开发/中小规模 |
| text-embedding-3-large | OpenAI API | ~60ms | $0.13/1M token | 优秀 | 高精度场景 |
| BGE-M3 | 本地 ONNX | ~5ms | 服务器成本 | 优秀 | 生产/大规模 |
| Voyage-3-large | Voyage API | ~40ms | $0.18/1M token | 优秀 | 最高精度 |

推荐路径：
- 早期验证：text-embedding-3-small，零运维
- 生产上线：本地化 BGE-M3，消除对外部 API 的依赖，延迟从 50ms 降到 5ms

延迟拆解：

```
理想路径（Redis 命中）：
  ~1ms   Redis get
  ────────────
  ≈ 1ms  ✅

常规路径（OpenAI embedding）：
  ~1ms   Redis miss
  ~50ms  OpenAI text-embedding-3-small
  ~5ms   pgvector HNSW 搜索（10K skills）
  ~3ms   序列化
  ────────────
  ≈ 59ms ✅

优化路径（本地 BGE-M3）：
  ~1ms   Redis miss
  ~5ms   本地 ONNX embedding
  ~5ms   pgvector HNSW 搜索
  ~2ms   序列化
  ────────────
  ≈ 13ms ✅

LLM 重排触发时：
  上述基础 + ~200-400ms LLM
  ≈ 300ms ⚠️（仅偶尔触发）
```

## 通过 MCP 接进 AI 客户端

到目前为止 Skill Hub 是一个后端服务。要让 Claude Code、Cursor 等客户端用上，需要一个协议层。

MCP（Model Context Protocol）是 Anthropic 开发、捐赠给 Linux 基金会的开放协议，已被 OpenAI、Google DeepMind 等支持，是当前 AI 工具调用的事实标准。

但 MCP 本身有一个限制：`tools/list` 接口返回服务器上的**全量**工具列表，没有语义搜索参数。万级 Skill 场景下你不可能每次返回全部。

正确的架构：**在 MCP Server 内部暴露一个 `search_available_skills` meta-tool**，AI 先用它搜索相关 Skill，再调用真正的 Skill。

```
Agent 连接 MCP Server，看到的 tool 列表（不是 10000 个！）：
[
  search_available_skills,   // meta-tool：搜索 Skill
  execute_skill,             // 执行指定 Skill
]

实际调用流程：
Step 1: search_available_skills({ query: "发邮件给张三" })
     ← [{ name: "send_email", schema: {...} }, ...]

Step 2: execute_skill({
          skill_name: "send_email",
          params: { to: "zhangsan@...", subject: "...", body: "..." }
        })
     ← { success: true, message_id: "xxx" }
```

MCP Server 的实现（Hono + Cloudflare Workers）：

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

function createMCPServer(skillHub: SkillHubClient): Server {
  const server = new Server(
    { name: 'skill-hub', version: '1.0.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_available_skills',
        description:
          'Search for available skills by describing what you want to accomplish. ' +
          'Always call this BEFORE executing any unfamiliar operation. ' +
          'Returns matching skills with their exact call signatures.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Describe what you want to do' },
            category: { type: 'string', description: 'Optional category filter' },
            limit: { type: 'number', description: 'Max results (default: 5)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'execute_skill',
        description: 'Execute a specific skill by name. Get the skill name from search_available_skills first.',
        inputSchema: {
          type: 'object',
          properties: {
            skill_name: { type: 'string' },
            params: { type: 'object' },
          },
          required: ['skill_name', 'params'],
        },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (name === 'search_available_skills') {
      const skills = await skillHub.search({
        query: args.query as string,
        category: args.category as string | undefined,
        limit: (args.limit as number | undefined) ?? 5,
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            found: skills.length,
            skills: skills.map(s => ({
              name: s.name,
              title: s.title,
              description: s.description,
              relevance_score: s.score,
              schema: s.schema,
            })),
          }, null, 2),
        }],
      }
    }

    if (name === 'execute_skill') {
      const result = await skillHub.execute({
        skill_name: args.skill_name as string,
        params: args.params as Record<string, unknown>,
      })
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  return server
}
```

客户端配置（Claude Code）：

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "skill-hub": {
      "type": "http",
      "url": "https://skill-hub.your-domain.workers.dev/mcp"
    }
  }
}
```

配完之后，Claude Code 看到的工具只有两个：搜索和执行。无论后端有 100 还是 10000 个 Skill，对 AI 来说工具表都不增长。

## meta-tool 的 description 怎么写

`search_available_skills` 的 description 写得好不好，直接决定 AI 知不知道"我应该先来这里搜"。

反例：

```typescript
name: 'search_skills',
description: 'Search for skills'
```

这种描述模糊，模型不知道什么时候要用它，什么时候不用。

正例：

```typescript
name: 'search_available_skills',
description: `Search for available skills when you need to:
- Perform an action (send email, create calendar event, query database...)
- Interact with external systems (Lark, GitHub, Slack, databases...)
- Execute a workflow or automation

Always call this tool BEFORE executing any unfamiliar operation.
Returns matching skills with their exact call signatures.`
```

明确告诉模型："要做事之前先来这里搜"。AI 看到这种描述，会形成稳定的行为模式：用户一说"帮我做 X"，先 search，再 execute。

## 增量同步：SHA-256 + LISTEN/NOTIFY

活跃的 Skill Hub 每天都在变。新 Skill 上线、旧 Skill 改参数、某些 Skill 下线。

如果每次变更都全量重建索引，10000 个 Skill × 50ms 一次 embedding = 8 分钟（还没算并发限制）。需要增量同步：**只对真正发生内容变化的 Skill 重新算 embedding。**

判断变化的简洁办法是对核心内容算 SHA-256 hash：

```typescript
function computeSkillHash(skill: Omit<Skill, 'embedding' | 'hash'>): string {
  const content = JSON.stringify({
    title: skill.title,
    description: skill.description,
    schema: skill.schema,
    synthetic_queries: skill.synthetic_queries?.sort(),  // 排序确保顺序无关
    key_topics: skill.key_topics?.sort(),
  })
  return createHash('sha256').update(content).digest('hex')
}

async function upsertSkill(input: SkillInput): Promise<void> {
  const newHash = computeSkillHash(input)

  const existing = await db.query(
    'SELECT hash FROM skills WHERE name = $1',
    [input.name],
  )

  const hashChanged = !existing.rows.length || existing.rows[0].hash !== newHash

  if (!hashChanged) {
    // hash 一样：只更新非 embedding 字段（version、is_active 等）
    await db.query(
      'UPDATE skills SET version = $1, updated_at = now() WHERE name = $2',
      [input.version, input.name],
    )
    return
  }

  // hash 变了：重新算 embedding
  const embeddingText = buildEmbeddingText(input)
  const embedding = await embedder.embed(embeddingText)

  await db.query(`
    INSERT INTO skills (name, title, description, schema, category, tags,
                        synthetic_queries, key_topics, embedding, hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (name) DO UPDATE SET
      title             = EXCLUDED.title,
      description       = EXCLUDED.description,
      schema            = EXCLUDED.schema,
      synthetic_queries = EXCLUDED.synthetic_queries,
      key_topics        = EXCLUDED.key_topics,
      embedding         = EXCLUDED.embedding,
      hash              = EXCLUDED.hash,
      updated_at        = now()
  `, [
    input.name, input.title, input.description,
    JSON.stringify(input.schema), input.category,
    input.tags, input.synthetic_queries, input.key_topics,
    vectorToString(embedding), newHash,
  ])
}
```

不需要轮询。Postgres 原生的 `LISTEN/NOTIFY` 能实时触发：

```sql
CREATE OR REPLACE FUNCTION notify_skill_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'skill_changes',
    json_build_object(
      'skill_id',  NEW.id,
      'operation', TG_OP,
      'name',      NEW.name
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skill_change_trigger
  AFTER INSERT OR UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION notify_skill_change();
```

监听端：

```typescript
async function startIndexingWorker(): Promise<void> {
  const listener = new pg.Client(DATABASE_URL)
  await listener.connect()
  await listener.query('LISTEN skill_changes')

  listener.on('notification', async (msg) => {
    const payload = JSON.parse(msg.payload!)
    console.log(`[Indexing] Skill changed: ${payload.name} (${payload.operation})`)
    rebuildEmbedding(payload.skill_id).catch(console.error)
  })

  setInterval(() => listener.query('SELECT 1'), 30_000)
}
```

到此为止，从 Skill 入库到向量索引就绪是一个完整闭环：作者 push → 上游服务 upsert → trigger 发通知 → indexing worker 重建 → 客户端下次搜索时拿到新结果。

## 自动化富化

让 Skill 作者手写 `synthetic_queries` 不现实——人懒，且不擅长想用户会怎么问。用 LLM 自动生成：

```typescript
async function enrichSkill(raw: RawSkillInput): Promise<EnrichedSkillInput> {
  const prompt = `
You are a skill documentation specialist. Given a tool/skill definition, generate:
1. 8-10 natural language queries that users might type when they need this skill
2. 5-8 key topic words for categorization
3. 2-3 concrete usage examples with parameters

Tool definition:
Name: ${raw.name}
Description: ${raw.description}
Parameters: ${JSON.stringify(raw.schema.properties, null, 2)}

Respond in JSON format:
{
  "synthetic_queries": [...],
  "key_topics": [...],
  "usage_examples": [
    { "description": "...", "params": { ... } }
  ]
}

Requirements:
- synthetic_queries should be in both Chinese and English
- Cover edge cases and alternative phrasings
- Be specific about what the user wants to achieve, not what the API does
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const enrichment = JSON.parse(response.choices[0].message.content!)

  return {
    ...raw,
    synthetic_queries: enrichment.synthetic_queries,
    key_topics: enrichment.key_topics,
    usage_examples: enrichment.usage_examples,
  }
}
```

新 Skill 入库时跑一遍，作者只需要写好原始的 description 和 schema，富化文本自动生成。

## 评测：召回质量怎么量化

上线前你需要一组测试集，回答"对于 X 类型的查询，我的 Skill Hub 召回率多少？"。

```typescript
interface TestCase {
  query: string
  expected_skill: string  // 期望排第一的 Skill
}

const testCases: TestCase[] = [
  { query: '发邮件给张三', expected_skill: 'send_email' },
  { query: '约明天下午三点开会', expected_skill: 'calendar_event_create' },
  { query: 'query the user table in production db', expected_skill: 'database_query_execute' },
  // ... 100+ 个用例
]

async function evaluateRecall(retriever: SkillRetriever) {
  let hit1 = 0, hit5 = 0

  for (const tc of testCases) {
    const results = await retriever.retrieve({ query: tc.query, limit: 5 })
    const names = results.map(r => r.name)

    if (names[0] === tc.expected_skill) hit1++
    if (names.includes(tc.expected_skill)) hit5++
  }

  console.log(`recall@1: ${(hit1 / testCases.length * 100).toFixed(1)}%`)
  console.log(`recall@5: ${(hit5 / testCases.length * 100).toFixed(1)}%`)
}
```

健康参考值：

| 指标 | 说明 | 健康阈值 |
|------|------|---------|
| recall@5 | 相关 Skill 在 top-5 中的比例 | > 85% |
| recall@1 | 正确 Skill 排第一的比例 | > 65% |
| p50_latency | 50 百分位检索延迟 | < 20ms |
| p99_latency | 99 百分位延迟 | < 200ms |
| cache_hit_rate | Redis 命中率 | > 40% |
| rerank_rate | LLM 重排触发率 | < 15% |

如果某类查询召回率持续偏低，去检查那批 Skill 的 `synthetic_queries`——多半是和用户实际用语脱节，补几条能立刻见效。如果重排触发率超过 30%，说明 embedding 区分度不够，得换模型或者补 `synthetic_queries`。

## 部署架构（Cloudflare Workers）

生产环境推荐的部署形态：

```
┌───────────────────────────────────────────────────┐
│           Cloudflare 边缘网络                       │
│                                                   │
│  ┌─────────────────┐    ┌──────────────────────┐  │
│  │  MCP Worker      │    │  REST API Worker     │  │
│  │  /mcp endpoint   │    │  /skills/* endpoints │  │
│  └────────┬────────┘    └──────────┬───────────┘  │
│           │                        │               │
│           └──────────┬─────────────┘               │
│                      │                             │
│                      ▼                             │
│  ┌───────────────────────────────────────────┐    │
│  │  Retriever Worker                          │    │
│  │  - Embedding（Workers AI 跑 BGE-M3）       │    │
│  │  - 缓存（KV）                              │    │
│  │  - Postgres（通过 Hyperdrive 走连接池）   │    │
│  └───────────────────────────────────────────┘    │
└───────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Postgres + pgvector│
              │   (Supabase / Neon)  │
              └─────────────────────┘
```

三个关键组件：

- **Workers AI**：直接在 Worker 进程里跑 BGE 系列 embedding 模型，无外部 API 调用，延迟 ~10ms
- **Hyperdrive**：Worker 到 Postgres 的连接池代理，把跨大陆 RTT 从 ~100ms 降到 ~10ms
- **KV**：全球边缘缓存，替代 Redis，查询 < 5ms

`wrangler.toml`：

```toml
name = "skill-hub"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[[hyperdrive]]
binding = "DB"
id = "your-hyperdrive-id"
```

Workers AI 跑 embedding：

```typescript
class WorkersAIEmbedder {
  constructor(private ai: Ai) {}

  async embed(text: string): Promise<number[]> {
    const result = await this.ai.run('@cf/baai/bge-large-en-v1.5', {
      text: [text],
    })
    return result.data[0]
  }
}
```

部署：

```bash
git clone https://github.com/your-org/skill-hub-template
cd skill-hub-template

npm install
psql $DATABASE_URL < schema.sql

npx wrangler kv:namespace create "CACHE"
npx wrangler hyperdrive create skill-hub-db --connection-string $DATABASE_URL

# 把上面输出的 id 填到 wrangler.toml
npx wrangler deploy
```

## 端到端例子

把上面所有组件串起来看一次完整调用：

1. **作者**：写一个 send_lark_message Skill，注册到 Skill Hub。Hub 内部跑 enrichSkill 生成 `synthetic_queries`（"发飞书消息"、"通知同事"、"send a lark im 给 zhangsan"……），算 hash，没冲突，算 embedding，写入 Postgres，触发 LISTEN/NOTIFY，indexing worker 确认完成
2. **用户**：在 Claude Code 里说"帮我告诉张三明天的会改到下午"
3. **AI**：发现自己不知道怎么"告诉张三"，但看到了 search_available_skills meta-tool，调用 `search_available_skills({ query: "告诉张三某事" })`
4. **MCP Server**：转发到 Skill Hub `/search`，Hub 命中 Redis（之前有用户问过类似 query），1ms 返回 top-5：send_lark_message、send_email、create_calendar_invite、…
5. **AI**：从 top-5 里选出 send_lark_message（schema 里能看到参数 `receiver_name` + `text`），调用 `execute_skill({ skill_name: "send_lark_message", params: { receiver_name: "张三", text: "明天的会改到下午" } })`
6. **MCP Server**：转发到 Skill Hub `/execute`，Skill Hub 调用真正的飞书 API，返回成功
7. **用户**：看到"已发送给张三"

整个过程对用户无感，对 AI 透明（它只看到 2 个 meta-tool，不是 10000 个），对 Skill 作者简单（写 description + schema，富化和向量化自动跑）。

## 这一章之后

到这里你已经能把 Skill 系统从"几十个客户端本地 Skill"演化到"万级远程 Skill"。但还有一个问题：**这 10000 个 Skill 本身怎么更新？**

某个 Skill 的指令改了一行，要不要全量重跑 eval？灰度怎么做？回退靠什么？Claude Code 进程内的 Skill 又怎么做到不重启就生效？这就是下一章的内容。
