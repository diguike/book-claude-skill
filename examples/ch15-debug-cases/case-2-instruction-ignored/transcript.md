# Case 2: 简化对话记录

## SKILL.md 结构（修复前）

```
行 1-50:    description + 基本指令
行 51-200:  输出格式规范（非常详细的模板）
行 201-400: 各种代码风格规则
行 401-500: 性能检查规则
行 501-650: 可访问性、国际化规则
行 651-700: 安全检查规则（SQL注入、XSS、密钥泄露）
```

## 用户输入

> review src/api/users.ts

## Claude 输出（节选）

> ## Review 结果
> 1. 命名不一致: getUserData 应改为 getUser
> 2. 缺少错误处理: 第 45 行 await 没有 try-catch
> 3. 性能: N+1 查询问题
>
> 总体评分: 7/10

## 缺失的内容

文件中第 32 行有明显的 SQL 拼接：
```ts
const sql = `SELECT * FROM users WHERE name = '${name}'`;
```

安全规则本应捕获这个问题，但 review 结果完全没有提到。

## 调查

对话在触发 skill 前已经有 15 轮交互，触发了 compaction。
compaction 后的 system prompt 中，SKILL.md 的内容被截断到约 500 行。
