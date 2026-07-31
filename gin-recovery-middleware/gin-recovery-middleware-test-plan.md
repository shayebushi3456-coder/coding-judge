# gin Recovery 中间件测试方案

## 1. 测试目标

验收 gin Recovery / CustomRecovery 整套 panic 恢复与日志行为，对齐 gin v1.10.0。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/gin-gonic/gin
- 基准提交：`75ccf94d605a05fe24817fc2f166f6f2959d5cea`（v1.10.0）
- 复杂度：中等偏上（整模块）
- 模块：根包 `recovery.go`

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `recovery.go`：`Recovery`、`CustomRecovery`、`RecoveryWithWriter`、`CustomRecoveryWithWriter`、`defaultHandleRecovery`、`stack` / `source` / `function` / `timeFormat`
- 相关测试：`recovery_test.go` 全文件
- 依赖同包 `logger.go` 中的 `reset` 颜色常量（勿删 logger）

### 功能边界

- recover panic；默认 `AbortWithStatus(500)`；可注入 `RecoveryFunc`
- broken pipe / connection reset：记 `c.Error` + `Abort`，不调用 handle 写状态
- 日志：脱敏 Authorization；debug 打印请求行；非 debug 不打印 GET path（见测试）
- Abort 后再 panic：保留已写状态码（如 400）
- `stack`/`source`/`function` 辅助格式化

### 对照要点

隐藏测试对齐基准 `recovery_test.go`。

## 4. 问题现场构造方案（仅评测方可见）

1. 删除 `CustomRecoveryWithWriter` 内 recover/日志/broken-pipe 实现，改为仅 `c.Next()`
2. 删除 `stack`、`source`、`function`、`timeFormat` 及 dunno 等辅助变量
3. 可保留导出工厂函数与 `RecoveryFunc`、`defaultHandleRecovery` 签名以免无关编译失败
4. `recovery_test.go` 换成占位测试；不留 TODO

### 预期失败

恢复完整 `recovery_test.go` 后 panic 会打挂测试进程或断言全挂。

### 回归

auth / binding / routing 等非 recovery 测试应可通过（注意：若其它集成测试依赖 Recovery，需排除或确认 Default 引擎行为）。

## 5–7. 环境与命令

```bash
cd repo
go test . -count=1
# 隐藏
go test . -run 'Panic|Recovery|Source|Function|CustomRecovery' -count=1
```

## 8–9. 公开 / 隐藏测试

公开：题面 recover、自定义 handle、脱敏、broken pipe 自然语言。  
隐藏：基准 `recovery_test.go` 全文。

## 10–14 / 15–17

审查脱敏、broken pipe、debug 日志差异；隐藏全过为通过。勿向题面泄露本 plan。
