# 基础审查规则

每次审查都必须检查以下内容。

## 1. 错误处理

所有 async 函数必须有错误处理，因为我们的错误监控（Sentry）只能捕获被 catch 的异常，未包裹的 Promise rejection 会变成沉默失败。

- ❌ `const data = await fetchUser(id)` — 请求失败时整个函数静默中断
- ✅ `try { const data = await fetchUser(id) } catch (e) { logger.error('fetchUser failed', { id, error: e }) }`

## 2. 空值检查

访问嵌套属性前检查父级是否存在，因为 `Cannot read property of undefined` 是我们线上出现频率最高的错误。

- ❌ `const name = response.data.user.name`
- ✅ `const name = response.data?.user?.name ?? 'Unknown'`

## 3. 函数长度

单个函数不超过 50 行（不含空行和注释）。超过 50 行的函数通常意味着做了太多事，应该拆分。
这不是死规则——如果一个 60 行的 switch-case 逻辑清晰，不需要强行拆分。

## 4. 命名

- 变量名要表达意图，不要用 `data`、`temp`、`result` 这种万能名
- 布尔值用 `is`/`has`/`should` 前缀：`isLoading`、`hasPermission`
- 函数名用动词开头：`fetchUser`、`validateInput`、`formatDate`

## 5. 重复代码

同样的逻辑出现 3 次以上应该提取为函数。2 次的可以先容忍——过早抽象比重复更危险。

## 6. TODO 和临时代码

- 检查是否有 TODO 没有关联 issue 编号
- 检查是否有注释掉的代码块（应该删除，git 会记住历史）
- 检查是否有 `// HACK` 或 `// FIXME` 标记的临时方案
