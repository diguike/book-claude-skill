# Go 审查参考知识

> 审查 Go 代码时参考这些常见陷阱和最佳实践。

## 常见陷阱

### 1. 错误忽略

Go 的错误必须显式处理，忽略错误是线上事故的常见根因。

```go
// ❌ 忽略了错误
data, _ := json.Marshal(user)

// ✅ 检查并处理
data, err := json.Marshal(user)
if err != nil {
    return fmt.Errorf("marshal user: %w", err)
}
```

### 2. goroutine 泄漏

启动 goroutine 后没有退出机制，会导致内存泄漏。

```go
// ❌ 没有退出条件
go func() {
    for msg := range ch {
        process(msg)
    }
}()

// ✅ 用 context 控制生命周期
go func() {
    for {
        select {
        case msg := <-ch:
            process(msg)
        case <-ctx.Done():
            return
        }
    }
}()
```

### 3. defer 在循环内

defer 在函数结束时才执行，在循环内使用会导致资源积压。

```go
// ❌ 文件句柄直到函数结束才关闭
for _, path := range paths {
    f, _ := os.Open(path)
    defer f.Close()
}

// ✅ 提取为函数
for _, path := range paths {
    processFile(path)
}
```

## 团队约定

- 错误信息以小写开头，不加句号
- 用 `fmt.Errorf("context: %w", err)` 包装错误
- 导出函数必须有 godoc 注释
