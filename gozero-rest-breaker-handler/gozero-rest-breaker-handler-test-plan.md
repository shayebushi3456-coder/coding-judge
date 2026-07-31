# go-zero BreakerHandler 测试方案

## 1. 测试目标

验收 `rest/handler.BreakerHandler` 熔断中间件完整行为，对齐 go-zero v1.7.3。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/zeromicro/go-zero
- 基准提交：`796dd5b6e2df35969a0c8716dd5f26b19e506ef8`（tag v1.7.3）
- 复杂度：中等
- 模块：`rest/handler` 熔断中间件

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `rest/handler/breakerhandler.go`：`BreakerHandler`
- 相关测试：`rest/handler/breakerhandler_test.go`
- 接线：`rest/engine.go` 会 Append `BreakerHandler`（勿改接线，仅抠实现）

### 功能边界

- `breaker.NewBreaker(WithName(method+"://"+path))`
- `Allow` 失败 → `metrics.AddDrop()`、打日志、写 503、不进入下游
- 成功则用 `response.NewWithCodeResponseWriter` 包一层；结束后 `Code < 500` → `Accept`，否则 `Reject`（含状态码文案）
- 大量 4xx 不应打开熔断；大量 5xx 后应大量 503

### 对照要点

隐藏测试对齐基准 `breakerhandler_test.go`（Accept / Fail / 4XX / Reject）。

## 4. 问题现场构造方案（仅评测方可见）

1. 将 `BreakerHandler` 退化为直通 `next.ServeHTTP(w, r)`（可保留函数签名与未使用参数）
2. 删除 breaker / promise / CodeResponseWriter 相关逻辑；不留 TODO
3. `breakerhandler_test.go` 换成占位测试，避免断言泄题

### 预期失败

恢复完整测试后：Reject 用例失败（无 503），行为与直通无异。

### 回归

其它 handler 测试应可通过。

## 5–7. 环境与命令

```bash
cd repo
go test ./rest/handler -count=1
# 隐藏
go test ./rest/handler -run Breaker -count=1
```

## 8–9. 公开 / 隐藏测试

公开：题面熔断、4xx/5xx、503、metrics 自然语言。  
隐藏：基准 `breakerhandler_test.go` 全文。

## 10–14 / 15–17

编译通过；审查 Accept/Reject 阈值与命名；隐藏全过为通过。勿向题面泄露 SHA / 符号清单。
