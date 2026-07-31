# go-zero CryptionHandler 测试方案

## 1. 测试目标

验收 `rest/handler` 下整套请求体解密 + 响应体加密中间件（含自定义 ResponseWriter），对齐 go-zero v1.7.3。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/zeromicro/go-zero
- 基准提交：`796dd5b6e2df35969a0c8716dd5f26b19e506ef8`（tag v1.7.3）
- 复杂度：中等偏上（整模块）
- 模块：`rest/handler` 加解密中间件

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `rest/handler/cryptionhandler.go`：`CryptionHandler`、`LimitCryptionHandler`、`decryptBody`、`cryptionResponseWriter`（缓冲写、flush 加密、Hijack/Flush）
- 相关测试：`rest/handler/cryptionhandler_test.go` 全文件
- 下游接线：`contentsecurityhandler.go` 会调用 `LimitCryptionHandler`（问题现场须保留同名导出以免无关编译失败）

### 功能边界

- GET / ContentLength≤0：不解请求体，但仍加密非空响应
- POST：base64 → `codec.EcbDecrypt` → 替换 `r.Body`
- 超限 / 坏密文 / 坏密钥 → 400（不进入业务）
- 响应：缓冲 `Write`，`defer flush` 做 `EcbEncrypt` + base64；空缓冲不写
- 坏密钥导致加密失败 → 500
- `WriteHeader` 透传；支持 `http.Flusher` / `http.Hijacker`
- 默认上限 `maxBytes = 1<<20`；`LimitCryptionHandler` 可改上限

### 对照要点

隐藏测试对齐基准 `cryptionhandler_test.go` 全部行为（含 half-write / bad writer 日志路径）。

## 4. 问题现场构造方案（仅评测方可见）

1. 将 `cryptionhandler.go` 整模块实现删除，仅保留 `CryptionHandler` / `LimitCryptionHandler` 直通壳（`next.ServeHTTP`），以及 `maxBytes` 常量以免符号漂移过大
2. 删除 `decryptBody`、`cryptionResponseWriter` 及全部辅助方法
3. 将 `cryptionhandler_test.go` 替换为无行为占位测试，避免断言泄题
4. 不留 TODO /「encryption removed」类注释
5. 勿改动 `contentsecurityhandler.go` 的调用点

### 预期失败

评测方恢复完整 `cryptionhandler_test.go` 后大量失败（响应明文、请求体未解密、缺 400/500 等）。

### 回归

其它 `rest/handler` 测试（timeout、breaker、auth 等）应仍可通过；`contentsecurity` 相关测试若依赖真实加解密可能失败——评测时以 cryption 专属测试为隐藏验收主线，回归以不含 cryption 的 handler 包测试为准。

## 5–7. 环境与命令

```bash
cd repo
go test ./rest/handler -count=1
# 隐藏：恢复基准 cryptionhandler_test.go 后
go test ./rest/handler -run Cryption -count=1
```

## 8–9. 公开 / 隐藏测试

公开：题面加解密、错误码、Flush/Hijack 自然语言。  
隐藏：基准 `cryptionhandler_test.go` 全文。

## 10–14. 类型 / 回归 / 审查 / 评分 / 失败

编译通过；审查是否漏响应加密、超限 400、空 body 路径、Hijack；隐藏全过为通过。

## 15–17. 组织与不可泄露

问题现场无 cryption 专属断言测试；不得泄露本 plan、符号清单、仓库 SHA（题面禁止）。
