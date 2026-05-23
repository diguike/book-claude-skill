# Conventional Commits Classification

## Commit Type → Changelog Category

| Type       | Category          | Include in changelog |
|------------|-------------------|----------------------|
| feat       | Features          | Yes                  |
| fix        | Bug Fixes         | Yes                  |
| perf       | Performance       | Yes                  |
| refactor   | Other             | Yes (minor)          |
| docs       | Other             | Only if user-facing  |
| style      | —                 | No                   |
| test       | —                 | No                   |
| build      | —                 | No                   |
| ci         | —                 | No                   |
| chore      | —                 | No                   |
| revert     | Bug Fixes         | Yes                  |

## Breaking Changes

A commit is a breaking change if:
1. The type suffix has `!`: `feat!: remove legacy API`
2. The body contains `BREAKING CHANGE: <description>`

Breaking changes ALWAYS go into the "Breaking Changes" section, regardless of type.

## Scope Extraction

The scope is the text in parentheses after the type: `feat(auth): add OAuth2`

- Scope becomes the **module** prefix in the changelog: `- **auth**: add OAuth2`
- If no scope, omit the bold prefix: `- add OAuth2`

## PR/Issue Linking

If commit message contains `#123`, append it as a link: `(#123)`

## Filtering Rules

Skip these commits entirely:
- Merge commits (`Merge branch ...`, `Merge pull request ...`)
- Type is `ci`, `build`, `style`, `test`, or `chore`
- Message starts with `wip` or `WIP`
- Message is `initial commit` or similar boilerplate
