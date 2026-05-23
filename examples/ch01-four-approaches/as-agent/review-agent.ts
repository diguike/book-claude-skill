// 执行方式: npx tsx review-agent.ts

/**
 * Agent 方式：搭一个完整的审查 Agent 服务
 *
 * 需要：API 服务 + LLM 调用 + GitHub Webhook
 * 开发成本高，需要部署和维护。
 */

import Anthropic from "@anthropic-ai/sdk";

// 需要部署为 HTTP 服务
// 需要配置 GitHub Webhook
// 需要管理 API Key
// 需要处理并发和限流

const client = new Anthropic();

interface ReviewRequest {
  prNumber: number;
  diff: string;
  repository: string;
}

async function reviewPR(req: ReviewRequest) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `请审查以下 PR #${req.prNumber} 的代码变更：

${req.diff}

审查维度：Bug 风险、安全问题、可维护性、性能
严重度分级：Critical / Warning / Suggestion
给出 1-10 评分`,
      },
    ],
  });

  return response;
}

// 需要额外实现：
// - Express/Fastify HTTP 服务
// - GitHub Webhook 接收和验证
// - PR diff 获取
// - 审查结果评论回 PR
// - 错误处理和重试
// - 日志和监控
// - 部署（Docker + CI/CD）
// - API Key 管理

// 总代码量：500+ 行
// 维护成本：需要持续运维

console.log("这是一个示意文件，展示 Agent 方式的架构复杂度。");
console.log("实际实现需要 500+ 行代码和完整的部署流程。");
