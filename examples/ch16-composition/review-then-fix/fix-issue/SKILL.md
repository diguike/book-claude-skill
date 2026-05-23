---
description: "Read review-issues.json and apply fixes to the codebase. 读取问题列表并自动修复代码。"
---

# Fix Issue (Pipeline Consumer)

Read `./review-issues.json` and apply fixes for each reported issue.

## Workflow

1. Read `./review-issues.json` — if missing, tell user to run code-review first
2. Sort issues by severity: error first, then warning
3. For each issue:
   a. Open the file at the specified line
   b. Apply the minimal fix
   c. Add a comment explaining the change if non-obvious
4. After all fixes, delete `./review-issues.json`

## Constraints

- Only fix issues listed in the file — do not add new findings
- If a fix would change public API, skip it and note in output
- Preserve existing code style (indentation, quotes, semicolons)

## Output

Summarize what was fixed:
```
Fixed 3/5 issues:
  ✓ src/auth.ts:42 — parameterized SQL query
  ✓ src/api.ts:15 — added error handling
  ✓ src/utils.ts:8 — removed unused import
  ✗ src/types.ts:20 — skipped (public API change)
  ✗ src/config.ts:3 — skipped (needs manual review)
```
