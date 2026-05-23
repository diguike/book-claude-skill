# Case 1: Skill 未触发

## 现象

用户说「帮我看看这个 PR」，期望触发 code-review skill，但 Claude 没有调用它，
而是直接用通用能力给出了一个笼统的回答。

## 环境

- Skill: code-review
- 用户语言: 中文
- Claude Code 版本: 1.x

## 复现频率

中文请求几乎 100% 不触发。英文 "review this PR" 可以触发。

## 初步判断

skill 的 description 只写了英文关键词 "code review"，
没有覆盖中文用户的常见表述。
