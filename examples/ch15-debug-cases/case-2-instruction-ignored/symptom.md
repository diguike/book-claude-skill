# Case 2: 安全规则被忽略

## 现象

code-review skill 正常触发了，但输出的 review 结果中完全没有安全相关的检查项。
SKILL.md 底部明确写了「必须检查 SQL 注入、XSS、硬编码密钥」。

## 环境

- Skill: code-review（早期版本）
- SKILL.md 总行数: 约 700 行
- 安全规则位置: 第 650-700 行

## 复现频率

约 60% 的情况下安全检查缺失。长对话中更容易复现。

## 初步判断

SKILL.md 过长，安全规则在文件末尾。
上下文压缩（compaction）时末尾内容被截断。
