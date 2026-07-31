# go-zero TimeoutHandler 测试方案

## 1. 测试目标

验收 `rest/handler.TimeoutHandler` 完整超时控制行为，对齐 go-zero v1.7.3。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/zeromicro/go-zero
- 基准提交：`796dd5b6e2df35969a0c8716dd5f26b19e506ef8`（tag v1.7.3）
- 复杂度：中等偏上
- 模块：`rest/handler`

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `rest/handler/timeouthandler.go`：`TimeoutHandler`、`timeoutHandler.ServeHTTP`、`timeoutWriter` 缓冲写出
- 相关测试：`rest/handler/timeouthandler_test.go` 全文件用例

### 功能边界

- duration≤0 直通
- 普通请求：context 超时、并发执行 handler、超时写 503 + "Request Timeout"；client cancel → 499
- Websocket Upgrade / SSE Accept 跳过超时
- 超时后 Write 返回 ErrHandlerTimeout；panic 透传
- 正常完成时写回缓冲的 header/status/body

### 对照要点

隐藏测试对齐基准提交 `timeouthandler_test.go` 全部行为。

## 4. 问题现场构造方案（仅评测方可见）

1. 将 `(*timeoutHandler).ServeHTTP` 退化为直接 `h.handler.ServeHTTP(w, r)`（可保留类型与 TimeoutHandler 工厂，含 duration≤0 直通逻辑）
2. 可保留 `timeoutWriter` 等类型以免大删提示；或一并简化但勿留 TODO
3. 从问题现场删除 `timeouthandler_test.go` 中所有 `TestTimeout*` / 超时相关测试（或整文件移出），避免断言泄题
4. 不要注释「timeout disabled」

### 预期失败

评测方恢复 `timeouthandler_test.go` 后大量失败。

### 回归

其它 `rest/handler` 测试（auth、breaker、recover 等）应仍可通过。

## 5–7. 环境与命令

```bash
go test ./rest/handler -count=1
# 隐藏：恢复 timeouthandler_test.go 后
go test ./rest/handler -run 'Timeout|WithinTimeout|WithoutTimeout' -count=1
```

## 8–9. 公开 / 隐藏测试

公开：题面超时/499/SSE/WS 自然语言。  
隐藏：基准 `timeouthandler_test.go` 全文。

## 10–14. 类型 / 回归 / 审查 / 评分 / 失败

编译通过；回归其它 handler；审查是否漏 SSE/WS、499、panic；隐藏全过为通过。

## 15–17. 组织与不可泄露

问题现场无超时专属测试；不得泄露本 plan、符号清单、仓库 SHA（题面禁止）。
