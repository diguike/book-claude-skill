// 执行方式: npx tsx append-log.ts

/**
 * 追加审查记录到 JSONL 日志文件。
 *
 * 用法：npx tsx append-log.ts <log-file> '<metrics-json>'
 */

import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const logPath = process.argv[2];
const metricsJson = process.argv[3];

if (!logPath || !metricsJson) {
  console.error("Usage: npx tsx append-log.ts <log-file> '<metrics-json>'");
  process.exit(1);
}

let metrics: Record<string, unknown>;
try {
  metrics = JSON.parse(metricsJson);
} catch {
  console.error("Invalid JSON:", metricsJson);
  process.exit(1);
}

const record = {
  timestamp: new Date().toISOString(),
  pr: process.env.PR_NUMBER || "unknown",
  ...metrics,
};

// 确保目录存在
mkdirSync(dirname(logPath), { recursive: true });

// 追加记录
appendFileSync(logPath, JSON.stringify(record) + "\n");
console.log(`Record appended to ${logPath}`);
