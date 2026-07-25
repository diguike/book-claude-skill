// 执行方式: npx tsx score.ts

/**
 * 基于规则命中情况计算审查质量评分。
 *
 * 用法：npx tsx score.ts <metrics-json>
 * 输出：质量评分和评级
 */

interface Metrics {
  total: number;
  critical: number;
  warning: number;
  suggestion: number;
  filesReviewed: number;
  score: number;
  rulesHit: string[];
  selfScore?: {
    coverage: number;
    accuracy: number;
    depth: number;
  };
}

const metricsJson = process.argv[2];
if (!metricsJson) {
  console.error("Usage: npx tsx score.ts '<metrics-json>'");
  process.exit(1);
}

const metrics: Metrics = JSON.parse(metricsJson);

// 计算综合质量分
let qualityScore = 0;

// 1. 发现问题的丰富度（满分 30）
const issueRichness = Math.min(
  30,
  metrics.critical * 10 + metrics.warning * 5 + metrics.suggestion * 2
);
qualityScore += issueRichness;

// 2. 规则覆盖度（满分 30）
const totalRules = 8; // base, security, react, css-layout, multi-platform, theme-compat, accessibility, i18n
const ruleCoverage = (metrics.rulesHit.length / totalRules) * 30;
qualityScore += ruleCoverage;

// 3. 自评分（满分 40）
if (metrics.selfScore) {
  const selfAvg =
    (metrics.selfScore.coverage + metrics.selfScore.accuracy + metrics.selfScore.depth) / 3;
  qualityScore += selfAvg * 40;
}

// 评级
let grade: string;
if (qualityScore >= 80) grade = "A";
else if (qualityScore >= 60) grade = "B";
else if (qualityScore >= 40) grade = "C";
else grade = "D";

console.log(
  JSON.stringify(
    {
      qualityScore: Math.round(qualityScore),
      grade,
      breakdown: {
        issueRichness: Math.round(issueRichness),
        ruleCoverage: Math.round(ruleCoverage),
        selfScore: metrics.selfScore
          ? Math.round(
              ((metrics.selfScore.coverage +
                metrics.selfScore.accuracy +
                metrics.selfScore.depth) /
                3) *
                40
            )
          : 0,
      },
    },
    null,
    2
  )
);
