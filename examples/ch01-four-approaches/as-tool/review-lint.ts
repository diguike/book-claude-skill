// 执行方式: npx tsx review-lint.ts

/**
 * Tool 方式：用脚本做代码审查
 *
 * 只能检查规则性问题，无法理解业务逻辑。
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

interface Issue {
  file: string;
  line: number;
  severity: "Critical" | "Warning" | "Suggestion";
  message: string;
}

function collectFiles(dir: string, exts: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (!entry.startsWith(".") && entry !== "node_modules") {
        files.push(...collectFiles(fullPath, exts));
      }
    } else if (exts.includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = readFileSync(filePath, "utf-8").split("\n");

  lines.forEach((line, i) => {
    // 检查 console.log
    if (line.includes("console.log")) {
      issues.push({
        file: filePath,
        line: i + 1,
        severity: "Warning",
        message: "遗留的 console.log",
      });
    }

    // 检查 any 类型
    if (/:\s*any\b/.test(line)) {
      issues.push({
        file: filePath,
        line: i + 1,
        severity: "Warning",
        message: "使用了 any 类型",
      });
    }

    // 检查硬编码密码
    if (/password\s*=\s*['"]/.test(line)) {
      issues.push({
        file: filePath,
        line: i + 1,
        severity: "Critical",
        message: "疑似硬编码密码",
      });
    }
  });

  return issues;
}

// 运行
const targetDir = process.argv[2] || ".";
const files = collectFiles(targetDir, [".ts", ".tsx", ".js", ".jsx"]);
const allIssues = files.flatMap(checkFile);

console.log(`检查了 ${files.length} 个文件，发现 ${allIssues.length} 个问题：\n`);
allIssues.forEach((issue) => {
  console.log(`[${issue.severity}] ${issue.file}:${issue.line} - ${issue.message}`);
});

// 问题：只能检查模式匹配的问题，无法理解：
// - 业务逻辑是否正确
// - 架构设计是否合理
// - 变量命名是否清晰（需要理解语义）
// - 边界条件是否处理完整
