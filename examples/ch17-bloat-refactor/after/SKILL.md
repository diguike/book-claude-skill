---
description: "Code review with security, performance, and style checks. 代码审查：安全、性能、风格。"
---

# Code Review

Review changed files and report issues by severity.

## Workflow

1. Run `git diff --name-only HEAD~1` to collect changed files
2. For each file, read the content and diff
3. Apply rules in order (stop-on-error for security):
   - `rules/security.md` — MUST pass, any error blocks deployment
   - `rules/performance.md` — warnings and errors
   - `rules/style.md` — warnings only
4. Generate structured report (see output format below)
5. Log metrics: run `scripts/append-log.ts` with the results

## Output Format

```markdown
# Review: [branch-name]

## Summary
- Files: X | Issues: Y (E errors, W warnings)

## Security (rules/security.md)
| File | Line | Issue |
|------|------|-------|

## Performance (rules/performance.md)
| File | Line | Issue |
|------|------|-------|

## Style (rules/style.md)
| File | Line | Issue |
|------|------|-------|
```

## Configuration

Skip patterns: `*.test.ts`, `*.spec.ts`, `*.d.ts`, `*.min.js`
Max file size: 10000 lines (skip larger files)

## Constraints

- Do NOT auto-fix code — only report issues
- Do NOT send notifications — that is the CI pipeline's job
- Do NOT generate trend reports inline — use `scripts/trend-report.ts` separately
- Keep the report under 200 lines; link to files instead of quoting large blocks

## Rules

Rules are loaded from `rules/` directory:
- `rules/security.md` — injection, XSS, secrets, auth bypass
- `rules/performance.md` — N+1, bundle size, memory leaks, framework-specific
- `rules/style.md` — naming, complexity, dead code, formatting

## References

Loaded conditionally based on file types in the changeset:
- `references/react.md` — when .tsx/.jsx files are present
- `references/vue.md` — when .vue files are present
- `references/typescript-strict.md` — when tsconfig strict mode is enabled
- `references/api-design.md` — when files in src/api/ or src/routes/ are changed

## Scripts

- `scripts/collect-metrics.ts` — extract metrics from review results
- `scripts/append-log.ts` — append metrics to data/review-log.jsonl
- `scripts/trend-report.ts` — generate trend report (run separately)
- `scripts/score.ts` — calculate review score from issues

## What Was Removed (vs the bloated version)

The original 300+ line SKILL.md included:
- Inline security rules (→ moved to `rules/security.md`)
- Inline performance rules (→ moved to `rules/performance.md`)
- Inline style rules (→ moved to `rules/style.md`)
- Auto-fix logic (→ removed; separate skill responsibility)
- Deploy notification (→ removed; CI pipeline responsibility)
- Trend report generation (→ moved to `scripts/trend-report.ts`)
- Detailed code examples for every rule (→ moved to `references/`)

Result: 300+ lines → ~150 lines. Each concern in its own file.
