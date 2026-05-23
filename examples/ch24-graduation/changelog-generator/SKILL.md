---
description: "Generate a changelog from git commits using conventional commit format. 从 git 提交记录生成 CHANGELOG。"
---

# Changelog Generator

Generate a structured CHANGELOG.md from git commits between two tags or refs.

## Workflow

1. Determine the range:
   - If user specifies two refs, use them: `git log ref1..ref2`
   - If user specifies one ref, use `ref..HEAD`
   - If no ref, use last tag to HEAD: `git describe --tags --abbrev=0`..HEAD
2. Run `scripts/parse-commits.ts` to parse git log into structured data
3. Classify each commit using `rules/conventional-commits.md`
4. Group by category and sort by importance
5. Generate CHANGELOG.md in the format below

## Output Format

```markdown
# Changelog

## [version] - YYYY-MM-DD

### Breaking Changes
- **module**: description (#PR)

### Features
- **module**: description (#PR)

### Bug Fixes
- **module**: description (#PR)

### Performance
- **module**: description (#PR)

### Other
- **module**: description (#PR)
```

## Rules

- Follow classification in `rules/conventional-commits.md`
- Include PR/issue number if present in commit message
- Extract scope (module name) from conventional commit prefix: `feat(auth): ...` → scope is `auth`
- Skip merge commits and CI-only commits
- If a commit has `BREAKING CHANGE:` in body, always list under Breaking Changes

## Constraints

- Do not modify any source files — only generate/update CHANGELOG.md
- Preserve existing CHANGELOG.md content below the new section
- If no meaningful commits found, report "No changes to document"
