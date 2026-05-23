---
description: "All-in-one code review, auto-fix, deploy notification, logging, security audit, performance analysis, and style enforcement. 全能代码审查工具。"
---

# Super Code Review Pro Max

This skill performs comprehensive code review, automatically fixes issues, sends deploy notifications, logs metrics, runs security audit, analyzes performance, and enforces style rules.

## Step 1: Collect Changed Files

Use `git diff` to collect all changed files. Parse the diff output to extract:
- Added files
- Modified files
- Deleted files

For each file, read the full content and the diff hunks.

## Step 2: Security Audit

### SQL Injection
Check for string concatenation in SQL queries. Look for patterns like:
- `"SELECT * FROM " + table`
- `` `SELECT * FROM ${table}` ``
- `"SELECT * FROM users WHERE id = '" + id + "'"`

The fix is to use parameterized queries:
```ts
// BAD
const sql = `SELECT * FROM users WHERE id = '${id}'`;

// GOOD
const sql = 'SELECT * FROM users WHERE id = ?';
db.query(sql, [id]);
```

### XSS Prevention
Check for unescaped user input in HTML output. Look for:
- `innerHTML = userInput`
- `document.write(userInput)`
- `dangerouslySetInnerHTML={{ __html: userInput }}`
- Template literals in HTML without escaping

The fix is to always escape or use safe APIs:
```ts
// BAD
element.innerHTML = userInput;

// GOOD
element.textContent = userInput;
```

### Hardcoded Secrets
Check for hardcoded API keys, passwords, and tokens. Patterns:
- `password = "..."` or `password = '...'`
- `apiKey = "..."` or `api_key = "..."`
- `token = "..."` or `secret = "..."`
- `Authorization: Bearer <literal-string>`

Also check for:
- AWS access keys (AKIA...)
- Private keys (-----BEGIN RSA PRIVATE KEY-----)
- JWT tokens (eyJ...)

The fix is to use environment variables:
```ts
// BAD
const apiKey = "sk-1234567890";

// GOOD
const apiKey = process.env.API_KEY;
```

### Path Traversal
Check for user-controlled file paths:
- `fs.readFile(userInput)`
- `path.join(base, userInput)` without validation

### CSRF
Check for missing CSRF tokens in forms and API endpoints.

### Authentication Bypass
Check for endpoints missing auth middleware.

## Step 3: Performance Analysis

### N+1 Queries
Look for database queries inside loops:
```ts
// BAD
for (const user of users) {
  const orders = await db.query('SELECT * FROM orders WHERE user_id = ?', [user.id]);
}

// GOOD
const orders = await db.query('SELECT * FROM orders WHERE user_id IN (?)', [userIds]);
```

### Bundle Size
Check for importing entire libraries when only one function is needed:
```ts
// BAD
import _ from 'lodash';
_.get(obj, 'path');

// GOOD
import get from 'lodash/get';
get(obj, 'path');
```

### Memory Leaks
Check for:
- Event listeners not removed in cleanup
- setInterval without clearInterval
- Database connections not closed
- File handles not closed
- Streams not destroyed

### React Performance
- Missing React.memo on expensive components
- Inline objects/functions in JSX props
- Missing useCallback for event handlers passed to children
- Missing useMemo for expensive computations
- useEffect with missing or incorrect dependencies

### Vue Performance
- Computed properties with side effects
- Missing v-once for static content
- Large reactive objects that should use shallowRef
- v-if and v-for on the same element

### General Performance
- Synchronous I/O operations
- Unnecessary awaits in sequence (should be Promise.all)
- Regular expressions with catastrophic backtracking
- O(n^2) algorithms where O(n log n) is possible

## Step 4: Style Enforcement

### Naming Conventions
- Variables and functions: camelCase
- Classes and components: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case for utilities, PascalCase for components
- Database columns: snake_case
- CSS classes: kebab-case or BEM

### Code Complexity
- Functions should be under 50 lines
- Files should be under 300 lines
- Cyclomatic complexity should be under 10
- Nesting depth should be under 4 levels

### Comments
- Public APIs must have JSDoc comments
- Complex algorithms must have explanatory comments
- TODO comments must have assignee and deadline
- Remove commented-out code

### Dead Code
- Unused imports
- Unused variables
- Unreachable code after return/throw
- Unused function parameters (prefix with _)

### Formatting
- Consistent indentation (2 spaces)
- Consistent quotes (single quotes)
- Trailing commas in multiline
- Semicolons (consistent use)
- Max line length 100 characters

## Step 5: Auto-Fix

After identifying issues, automatically fix the following categories:
- Unused imports → remove them
- Missing semicolons → add them
- Inconsistent quotes → normalize to single quotes
- Simple SQL injection → convert to parameterized queries
- console.log statements → remove or convert to logger

For each fix:
1. Create a backup of the original file
2. Apply the fix
3. Run the project's linter to verify
4. If linter fails, revert the fix

## Step 6: Generate Report

Output a structured report:

```markdown
# Code Review Report

## Summary
- Files reviewed: X
- Issues found: Y
- Auto-fixed: Z
- Manual review needed: W

## Security Issues
...

## Performance Issues
...

## Style Issues
...

## Auto-Fixed Issues
...
```

## Step 7: Log Metrics

After review, log the following metrics to `data/review-log.jsonl`:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "files_reviewed": 5,
  "issues_found": 12,
  "issues_fixed": 8,
  "severity_breakdown": { "error": 3, "warning": 9 },
  "category_breakdown": { "security": 2, "performance": 4, "style": 6 },
  "review_duration_ms": 15000
}
```

Calculate running averages and trend data. If the issue count is trending up over the last 5 reviews, add a warning to the report.

## Step 8: Deploy Notification

If the review passes (no error-severity issues), prepare a deploy notification:

```json
{
  "channel": "#deployments",
  "message": "Code review passed for PR #123. Ready to deploy.",
  "reviewer": "code-review-skill",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

If running in CI, post the notification to Slack via webhook:
```bash
curl -X POST "$SLACK_WEBHOOK_URL" -H 'Content-Type: application/json' -d @notification.json
```

## Step 9: Trend Report

Generate a trend report from the last 10 reviews:
- Average issues per review
- Most common issue categories
- Files with most issues
- Improvement rate over time

Format as a markdown table and append to the review report.

## Configuration

- `MAX_FILE_SIZE`: Skip files larger than 10000 lines
- `SKIP_PATTERNS`: ["*.test.ts", "*.spec.ts", "*.d.ts", "*.min.js"]
- `AUTO_FIX`: true/false (default: false)
- `NOTIFICATION_WEBHOOK`: Slack webhook URL
- `LOG_DIR`: Directory for review logs (default: data/)
- `SEVERITY_THRESHOLD`: Minimum severity to report (default: warning)
- `MAX_ISSUES`: Stop after finding this many issues (default: 50)

## Error Handling

If any step fails:
1. Log the error to data/error-log.jsonl
2. Continue with remaining steps
3. Include error summary in the report
4. If critical (security check failed), abort and notify

## Caveats

- This skill requires git to be installed
- Auto-fix may break code — always review the changes
- Deploy notification requires SLACK_WEBHOOK_URL env var
- Trend report needs at least 3 previous reviews to be meaningful
- Performance analysis may have false positives
- Security audit is not a replacement for professional penetration testing
