# 基础审查规则

每次审查都必须检查以下内容。

## 1. 错误处理

所有 async 函数必须有错误处理，未处理的 Promise rejection 会变成沉默失败。

- ❌ `const data = await fetchUser(id)` — 请求失败时整个函数静默中断
- ✅ `try { const data = await fetchUser(id) } catch (e) { logger.error('fetchUser failed', { id, error: e }) }`

## 2. 空值检查

访问嵌套属性前检查父级是否存在。

- ❌ `const name = response.data.user.name`
- ✅ `const name = response.data?.user?.name ?? 'Unknown'`

## 3. 函数长度

单个函数不超过 50 行（不含空行和注释）。超过 50 行的函数通常意味着做了太多事，应该拆分。

## 4. 命名

- 变量名要表达意图，不要用 `data`、`temp`、`result` 这种万能名
- 布尔值用 `is`/`has`/`should` 前缀
- 函数名用动词开头：`fetchUser`、`validateInput`

## 5. 重复代码

同样的逻辑出现 3 次以上应该提取为函数。2 次的可以先容忍——过早抽象比重复更危险。
