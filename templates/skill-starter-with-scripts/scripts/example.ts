// 执行方式: npx tsx example.ts

/**
 * 示例脚本：从 stdin 或文件读取数据，输出结构化结果。
 *
 * 用法：
 *   npx tsx example.ts <input-file>
 *   echo "data" | npx tsx example.ts
 */

import { readFileSync } from "fs";

const input = readFileSync(process.argv[2] || "/dev/stdin", "utf-8");

// 在这里处理输入数据
const result = {
  timestamp: new Date().toISOString(),
  inputLength: input.length,
  lineCount: input.split("\n").length,
};

console.log(JSON.stringify(result, null, 2));
