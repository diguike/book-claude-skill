# Case 3: References 总量过大导致不稳定

## 现象

code-review skill 有时给出高质量的框架特定建议（如 React hooks 使用问题），
有时完全忽略框架相关的检查，只给出通用建议。

## 环境

- Skill: code-review
- references/ 目录下 8 个文件，合计约 2000 行
- 每次 review 时所有 references 都被加载

## 复现频率

短对话中表现稳定。对话超过 10 轮后，框架特定检查开始丢失。

## 初步判断

references/ 文件总量太大，加上对话历史后超出有效上下文窗口，
模型无法充分利用所有参考信息。
