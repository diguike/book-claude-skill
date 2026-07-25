// 执行方式: npx tsx parse-commits.ts
/**
 * parse-commits.ts
 *
 * Parse git log output into structured commit objects.
 * Usage: npx tsx parse-commits.ts [from-ref] [to-ref]
 *
 * Output: JSON array of parsed commits to stdout
 */

import { execSync } from "child_process";

interface ParsedCommit {
  hash: string;
  author: string;
  date: string;
  type: string;
  scope: string | null;
  subject: string;
  body: string;
  breaking: boolean;
  prNumber: string | null;
}

function getRange(args: string[]): string {
  if (args.length >= 2) return `${args[0]}..${args[1]}`;
  if (args.length === 1) return `${args[0]}..HEAD`;

  // Default: last tag to HEAD
  try {
    const lastTag = execSync("git describe --tags --abbrev=0", {
      encoding: "utf-8",
    }).trim();
    return `${lastTag}..HEAD`;
  } catch {
    // No tags — use all commits
    return "HEAD";
  }
}

function parseConventionalCommit(
  message: string
): Pick<ParsedCommit, "type" | "scope" | "subject" | "breaking"> {
  // Pattern: type(scope)!: subject
  const match = message.match(
    /^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)/
  );

  if (!match) {
    return { type: "other", scope: null, subject: message, breaking: false };
  }

  return {
    type: match[1],
    scope: match[2] || null,
    subject: match[4].trim(),
    breaking: match[3] === "!",
  };
}

function extractPrNumber(text: string): string | null {
  const match = text.match(/#(\d+)/);
  return match ? match[1] : null;
}

function main() {
  const args = process.argv.slice(2);
  const range = getRange(args);

  const format = "%H%n%an%n%aI%n%s%n%b%n---END---";
  const log = execSync(
    `git log ${range} --format="${format}" --no-merges`,
    { encoding: "utf-8" }
  );

  const commits: ParsedCommit[] = [];
  const entries = log.split("---END---\n").filter((e) => e.trim());

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    if (lines.length < 4) continue;

    const [hash, author, date, subject, ...bodyLines] = lines;
    const body = bodyLines.join("\n").trim();
    const parsed = parseConventionalCommit(subject);
    const breaking =
      parsed.breaking || body.includes("BREAKING CHANGE:");

    commits.push({
      hash: hash.substring(0, 8),
      author,
      date,
      ...parsed,
      body,
      breaking,
      prNumber: extractPrNumber(subject) || extractPrNumber(body),
    });
  }

  console.log(JSON.stringify(commits, null, 2));
}

main();
