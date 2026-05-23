# 延伸案例：后端 API 审查 Skill

全书的主线案例 `code-review` 偏前端（React + TypeScript）。如果你是后端开发者（Go/Python/Java/Node.js），这个 `api-review` 展示了同样的方法论如何应用于后端场景。

## 和 code-review 的对比

| 维度 | code-review（前端） | api-review（后端） |
|------|---------------------|-------------------|
| 审查重点 | 组件设计、Hooks、渲染性能 | 接口设计、SQL 注入、N+1 查询 |
| 规则示例 | React 组件规范、CSS 布局 | RESTful 设计、错误格式、分页 |
| 动态上下文 | `gh pr diff` | 同样用 `gh pr diff` |
| 团队知识 | Zustand 迁移决策、Auth SDK 陷阱 | ORM 使用约定、缓存策略、限流配置 |

## 学到什么

Skill 的框架是通用的——frontmatter、规则路由、脚本后处理、评测体系都一样。变的只是 rules/ 和 references/ 里的领域知识。

如果你的团队同时有前端和后端，可以用同一个 SKILL.md 做流程编排，通过规则路由加载不同的规则包：

```markdown
根据代码类型加载规则：
- .tsx/.jsx → rules/react.md
- .go → rules/go-api.md
- .py → rules/python-api.md
- controller/handler/router 文件 → rules/api-design.md
```

这就是第 10 章"插件化规则体系"在跨技术栈团队中的实际应用。
