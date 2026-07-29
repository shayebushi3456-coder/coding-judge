# go-zero httpx 自定义 Ok/Error 处理器 测试方案

## 1. 测试目标

验收 `SetOkHandler` / `SetErrorHandler` / `SetErrorHandlerCtx` 与 `OkJson`/`OkJsonCtx`/`Error`/`ErrorCtx` 的完整协作行为，对齐 go-zero v1.7.3 基准提交。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/zeromicro/go-zero
- 基准提交：`796dd5b6e2df35969a0c8716dd5f26b19e506ef8`（tag v1.7.3）
- 复杂度：中等
- 模块：`rest/httpx`

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `rest/httpx/responses.go`：
  - `SetOkHandler` / `SetErrorHandler` / `SetErrorHandlerCtx`
  - `OkJson` / `OkJsonCtx` 中对 `okHandler` 的调用
  - `Error` / `ErrorCtx` → `doHandleError` / `buildErrorHandler` 自定义分支
- 相关测试：`rest/httpx/responses_test.go` 中 `TestError`、`TestErrorCtx`、`TestOkJson`、`TestOkJsonCtx` 等（含自定义 handler 用例）

### 功能边界与复杂度

涉及可选回调、锁保护的全局 handler、JSON / 纯文本 / nil body 分支、gRPC 错误默认路径、以及 Ctx 与非 Ctx API 对齐。

### 与基准提交的行为对照要点

- 设置 OkHandler 后，OkJson/OkJsonCtx 写出包装后的 JSON
- 未设置时直接写出原值
- ErrorHandler 返回 (code, string|error|struct|nil) 的各类形态
- 未设置 ErrorHandler 时默认 400 / gRPC 映射；可选 fns 覆盖
- SetErrorHandler 与 SetErrorHandlerCtx 共享同一存储

## 4. 问题现场构造方案（仅评测方可见）

### 建议剥离范围

1. `OkJson` / `OkJsonCtx`：去掉对 `okHandler` 的读取与调用，始终 `WriteJson`/`WriteJsonCtx` 原值
2. `doHandleError`：忽略传入的 `handler`，始终走「无自定义 handler」的默认分支（fns / gRPC / BadRequest）
3. **保留** `SetOkHandler` / `SetErrorHandler` / `SetErrorHandlerCtx` 的存储实现与导出符号，避免无关编译失败，但使其对写出路径无效果
4. 从问题现场删除或裁剪 `responses_test.go` 中依赖自定义 handler 的用例子集（或整文件中相关 `t.Run`）；保留 `TestOk`、`TestStream`、`TestWriteJson` 等无关用例作为回归

### 建议保留

- `WriteJson` / `WriteJsonCtx` / `Ok` / `Stream`
- 锁与全局变量声明
- `Parse` / `ParseForm` 等请求侧 API

### 剥离后预期失败

- 自定义 Ok/Error handler 相关测试失败或缺失后由评测方注入后失败

### 剥离范围外应保持

- Stream、WriteJson、默认 Error（无 handler）行为

### 避免提示性残留

- 不要注释「handler disabled」「TODO wrap response」
- 题面不出现仓库/SHA/文件清单

## 5. 测试分层

- 公开：题面描述的 envelope / 自定义错误码行为
- 隐藏：基准提交 `responses_test.go` 中 Ok/Error handler 相关测试
- 回归：Stream、WriteJson、无 handler 的 Error

## 6. 环境准备

- Go 1.20+
- 在 `repo/` 根目录（go-zero module root）执行针对 `./rest/httpx` 的测试

## 7. 推荐执行命令

```bash
go test ./rest/httpx -count=1
# 隐藏（恢复完整 responses_test.go 后）：
go test ./rest/httpx -run 'TestOkJson|TestOkJsonCtx|TestError|TestErrorCtx' -count=1
```

## 8. 公开测试设计

自然语言：注册成功包装器后 JSON 被包装；注册错误处理器后状态码/body 按返回值变化；未注册时默认行为不变。

## 9. 隐藏测试设计

以基准提交 `rest/httpx/responses_test.go` 对应测试为 oracle。

## 10. 类型测试设计

编译通过即可。

## 11. 回归测试范围

`TestStream`、`TestWriteJson`、请求解析相关测试。

## 12. 代码审查检查点

- Ok 与 OkCtx 是否都调用 handler
- Error 与 ErrorCtx 是否共享 handler 语义
- nil body 是否只写状态码
- 是否误删 Set* 导出

## 13. 推荐评分标准

- 隐藏 Ok/Error handler 用例全过：通过
- 仅实现 Ok 或仅实现 Error：不通过
- 破坏 Stream/WriteJson：不通过

## 14. 失败判定条件

- 上述隐藏测试失败或无法编译

## 15. 测试组织建议

问题现场去掉自定义 handler 断言；评测时恢复基准测试文件。

## 16. 最小测试集建议

`TestOkJson`、`TestOkJsonCtx`、`TestError`、`TestErrorCtx`。

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan、隐藏测试原文、剥离说明、仓库 URL/SHA、必改符号清单
