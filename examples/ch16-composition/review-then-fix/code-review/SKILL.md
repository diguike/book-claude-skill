---
description: "Review code and output issues to a structured file for downstream processing. 代码审查并输出问题列表文件。"
---

# Code Review (Pipeline Output)

Review the specified files and write all found issues to `./review-issues.json`.

## Output Format

Write a JSON file at the project root:

```json
[
  {
    "file": "src/auth.ts",
    "line": 42,
    "severity": "error" | "warning",
    "category": "security" | "performance" | "style",
    "message": "SQL string concatenation — use parameterized queries"
  }
]
```

## Rules

1. Check for security issues (injection, hardcoded secrets, XSS)
2. Check for performance issues (N+1, unnecessary re-renders, missing indexes)
3. Check for style issues (naming, dead code, complexity)

## Important

- Write the file even if no issues found (output empty array `[]`)
- Do NOT fix the code — only report issues
- This skill is designed to be chained with `fix-issue` skill
