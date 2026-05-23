# 安全审查规则

所有代码审查都必须检查以下安全问题。

## 1. XSS（跨站脚本）

检查用户输入是否被直接插入到 HTML 中。

- ❌ `element.innerHTML = userInput`
- ❌ `dangerouslySetInnerHTML={{ __html: userInput }}`
- ✅ `element.textContent = userInput`
- ✅ 使用 DOMPurify 清洗后再插入：`dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}`

在 React 中，JSX 默认会转义，但 `dangerouslySetInnerHTML` 和 `href="javascript:..."` 不会。

## 2. SQL 注入

检查是否有字符串拼接构造 SQL 语句。

- ❌ `` db.query(`SELECT * FROM users WHERE id = ${userId}`) ``
- ❌ `db.query('SELECT * FROM users WHERE name = "' + name + '"')`
- ✅ `db.query('SELECT * FROM users WHERE id = ?', [userId])`
- ✅ ORM 的参数化方法：`User.findOne({ where: { id: userId } })`

## 3. 敏感信息泄露

检查以下模式：
- 硬编码的 API Key、密码、Token
- 日志中打印了完整的用户信息（邮箱、手机号、身份证）
- 错误响应中返回了堆栈信息或内部路径
- `.env` 文件被提交到版本控制

## 4. 未授权访问

- API 端点是否有权限检查中间件
- 前端路由是否有权限守卫
- 数据查询是否限制了当前用户的范围（不能查到别人的数据）

## 5. CSRF（跨站请求伪造）

- 非 GET 请求是否验证了 CSRF Token
- 敏感操作是否有二次确认

## 6. 依赖安全

- 新增的 npm 包是否是知名的、活跃维护的
- 检查是否有已知漏洞的依赖版本
