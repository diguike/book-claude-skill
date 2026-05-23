# API Design Conventions

## RESTful 资源命名

### URL 用名词复数，不用动词
```
GET    /api/users          # 列表
POST   /api/users          # 创建
GET    /api/users/:id      # 详情
PUT    /api/users/:id      # 全量更新
PATCH  /api/users/:id      # 部分更新
DELETE /api/users/:id      # 删除
```

### 嵌套资源不超过两层
```
GET /api/users/:id/orders          # OK
GET /api/users/:id/orders/:oid     # OK
GET /api/users/:id/orders/:oid/items/:iid  # 太深，改用顶级资源
GET /api/order-items/:iid          # 更好
```

### 动作类操作用子资源或自定义动词
```
POST /api/users/:id/activate       # 无法用 CRUD 表达的操作
POST /api/reports/generate         # 触发异步任务
```

## 统一响应格式

### 成功响应
```json
{
  "data": { "id": 1, "name": "Alice" },
  "meta": { "requestId": "abc-123" }
}
```

### 列表响应
```json
{
  "data": [{ "id": 1 }, { "id": 2 }],
  "pagination": { "page": 1, "pageSize": 20, "total": 57 },
  "meta": { "requestId": "abc-123" }
}
```

### 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "邮箱格式不正确",
    "details": [
      { "field": "email", "rule": "email", "message": "must be a valid email" }
    ]
  },
  "meta": { "requestId": "abc-123" }
}
```

## HTTP 状态码

| 码   | 场景                         |
|------|------------------------------|
| 200  | 成功返回数据                 |
| 201  | 创建成功                     |
| 204  | 删除成功，无返回体           |
| 400  | 请求参数校验失败             |
| 401  | 未认证                       |
| 403  | 已认证但无权限               |
| 404  | 资源不存在                   |
| 409  | 冲突（如重复创建）           |
| 422  | 业务规则校验失败             |
| 429  | 请求频率超限                 |
| 500  | 服务器内部错误               |

## 分页

### 偏移分页（简单场景）
```
GET /api/users?page=2&pageSize=20
```

### 游标分页（大数据量、实时数据）
```
GET /api/users?cursor=eyJpZCI6MTAwfQ&limit=20
```
游标分页避免了 OFFSET 的性能问题，且不会因插入新数据导致跳过或重复。

## 版本控制

### URL 前缀（推荐）
```
/api/v1/users
/api/v2/users
```

### Header 方式（适合公共 API）
```
Accept: application/vnd.myapp.v2+json
```

## 安全检查清单

- 所有写操作必须鉴权
- 列表接口限制 pageSize 最大值（如 100）
- 敏感字段（密码、token）不出现在响应中
- 批量操作限制单次数量
- 用 rate limiting 防滥用
- 日志不记录请求体中的敏感字段
