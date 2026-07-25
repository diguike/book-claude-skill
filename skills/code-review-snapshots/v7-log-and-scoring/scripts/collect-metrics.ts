// 执行方式: npx tsx collect-metrics.ts

/**
 * 解析审查结果，输出结构化统计。
 *
 * 用法：npx tsx collect-metrics.ts <review-output-file>
 * 输出：JSON 格式的统计数据
 */

import { readFileSync } from "fs";

interface ReviewMetrics {
  total: number;
  critical: number;
  warning: number;
  suggestion: number;
  filesReviewed: number;
  score: number;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npx tsx collect-metrics.ts <review-output-file>");
  process.exit(1);
}

const input = readFileSync(inputPath, "utf-8");

// 统计各严重度的问题数
const critical = (input.match(/🔴/g) || []).length;
const warning = (input.match(/🟡/g) || []).length;
const suggestion = (input.match(/🔵/g) || []).length;

// 统计审查的文件数（从表格中提取文件名）
const fileMatches = input.match(/\|\s*\d+\s*\|\s*(\S+\.\w+)/g) || [];
const uniqueFiles = new Set(
  fileMatches.map((m) => m.replace(/\|\s*\d+\s*\|\s*/, "").trim())
);

// 提取评分
const scoreMatch = input.match(/评分[：:]\s*(\d+)/);
const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

const metrics: ReviewMetrics = {
  total: critical + warning + suggestion,
  critical,
  warning,
  suggestion,
  filesReviewed: uniqueFiles.size,
  score,
};

console.log(JSON.stringify(metrics, null, 2));
