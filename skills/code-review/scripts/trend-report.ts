// 执行方式: npx tsx trend-report.ts

/**
 * 读取审查日志，生成质量趋势报告。
 *
 * 用法：npx tsx trend-report.ts [log-file]
 * 默认读取 data/review-metrics.jsonl
 */

import { readFileSync, existsSync } from "fs";

interface ReviewRecord {
  timestamp: string;
  pr: string;
  total: number;
  critical: number;
  warning: number;
  suggestion: number;
  score: number;
  selfScore?: {
    coverage: number;
    accuracy: number;
    depth: number;
  };
}

const logPath = process.argv[2] || "data/review-metrics.jsonl";

if (!existsSync(logPath)) {
  console.log("暂无审查记录。运行几次 code-review 后再查看趋势。");
  process.exit(0);
}

const lines = readFileSync(logPath, "utf-8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as ReviewRecord);

if (lines.length === 0) {
  console.log("暂无审查记录。");
  process.exit(0);
}

// 最近 N 次的统计
const recent = lines.slice(-20);
const avgScore = recent.reduce((s, r) => s + r.score, 0) / recent.length;

const avgSelfScore = {
  coverage:
    recent.reduce((s, r) => s + (r.selfScore?.coverage || 0), 0) / recent.length,
  accuracy:
    recent.reduce((s, r) => s + (r.selfScore?.accuracy || 0), 0) / recent.length,
  depth:
    recent.reduce((s, r) => s + (r.selfScore?.depth || 0), 0) / recent.length,
};

const avgIssues = recent.reduce((s, r) => s + r.total, 0) / recent.length;
const avgCritical = recent.reduce((s, r) => s + r.critical, 0) / recent.length;

console.log(`=== 审查质量趋势（最近 ${recent.length} 次） ===`);
console.log();
console.log(`总审查次数: ${lines.length}`);
console.log(`平均评分: ${avgScore.toFixed(1)} / 10`);
console.log(`平均发现问题: ${avgIssues.toFixed(1)} 个`);
console.log(`  其中 Critical: ${avgCritical.toFixed(1)} 个`);
console.log();
console.log(`自评分（平均）:`);
console.log(`  覆盖率: ${(avgSelfScore.coverage * 100).toFixed(0)}%`);
console.log(`  准确率: ${(avgSelfScore.accuracy * 100).toFixed(0)}%`);
console.log(`  深度:   ${(avgSelfScore.depth * 100).toFixed(0)}%`);

// 退化检测
if (recent.length >= 10) {
  const last5 = recent.slice(-5);
  const prev5 = recent.slice(-10, -5);
  const last5Avg = last5.reduce((s, r) => s + r.score, 0) / 5;
  const prev5Avg = prev5.reduce((s, r) => s + r.score, 0) / 5;
  const drop = prev5Avg - last5Avg;

  if (drop > 1) {
    console.log();
    console.log(
      `⚠️  警告：最近 5 次评分（${last5Avg.toFixed(1)}）比之前 5 次（${prev5Avg.toFixed(1)}）下降了 ${drop.toFixed(1)} 分`
    );
    console.log(`   建议检查最近的 Skill 修改是否引入了退化。`);
  }
}
