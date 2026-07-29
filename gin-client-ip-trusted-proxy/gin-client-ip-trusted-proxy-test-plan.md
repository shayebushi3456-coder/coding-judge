# gin ClientIP 受信代理 测试方案

## 1. 测试目标

验收 `Context.ClientIP` 在受信代理、转发头解析、TrustedPlatform / AppEngine 平台头等场景下的完整行为，对齐 gin v1.10.0 基准提交。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/gin-gonic/gin
- 基准提交：`75ccf94d605a05fe24817fc2f166f6f2959d5cea`（tag `v1.10.0`）
- 语言：Go

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `context.go`：`(*Context).ClientIP`
- `gin.go`：`(*Engine).validateHeader`、`(*Engine).isTrustedProxy`、`SetTrustedProxies` / `prepareTrustedCIDRs`
- 相关测试：`context_test.go` 中 `TestContextClientIP` + `resetContextForClientIPTests`

### 功能边界与复杂度

- TrustedPlatform / AppEngine 平台头优先
- RemoteAddr 受信判断（CIDR）
- X-Forwarded-For 反向扫描 + 非受信截断
- 非法头 / 无端口 RemoteAddr 回退
- 跨 `context.go` + `gin.go`，运行时行为 + 配置 API（中等）

### 与基准提交的行为对照要点

完整 `ClientIP` 在受信代理场景下会调用 `validateHeader` 解析转发链；`validateHeader` 从后往前找第一个非受信或链头 IP。

## 4. 问题现场构造方案（仅评测方可见）

### 建议剥离范围

1. 将 `ClientIP` 退化为仅解析 `RemoteIP()` 并返回（去掉平台头与转发头逻辑）
2. 将 `validateHeader` 改为恒返回 `("", false)`，避免残留完整解析 oracle
3. 从问题现场删除 `TestContextClientIP` 与 `resetContextForClientIPTests`（避免断言泄题）
4. 清理因剥离产生的未使用 import（如 `log`）

### 建议保留

- `RemoteIP`、`SetTrustedProxies`、`isTrustedProxy`、`prepareTrustedCIDRs`、默认 CIDR
- `ClientIP` 方法签名与导出
- `ForwardedByClientIP`、`RemoteIPHeaders`、`TrustedPlatform` 配置字段

### 剥离后预期失败范围

- 评测方恢复/注入的 `TestContextClientIP` 大量失败（仅剩「等于 RemoteAddr IP」的部分可能碰巧通过）

### 剥离范围外应保持

- 路由、Bind、渲染、`SetTrustedProxies` 自身单测仍可通过

### 避免提示性残留

- 不留 TODO；`validateHeader` 空实现不要注释「已禁用」
- 不在题面点名 `validateHeader`

## 5. 测试分层

- 公开：题面描述的行为
- 隐藏：基准提交中的 `TestContextClientIP` 全文
- 回归：`go test` 中与 ClientIP 无关的包级测试

## 6. 环境准备

```bash
git clone https://github.com/gin-gonic/gin.git
cd gin
git checkout 75ccf94d605a05fe24817fc2f166f6f2959d5cea
# 按第 4 节构造问题现场
```

## 7. 推荐执行命令

```bash
go test . -run TestContextClientIP -count=1
go test . -count=1   # 回归（评测方可在注入隐藏测试后跑）
```

## 8. 公开测试设计

题面级：受信代理 + XFF/X-Real-IP、平台头、非法头回退、无端口 RemoteAddr 为空。

## 9. 隐藏测试设计（对齐基准提交完整行为）

从基准提交恢复 `context_test.go` 中 `TestContextClientIP` 与 `resetContextForClientIPTests` 原样作为隐藏测试 oracle。

关键断言摘要（完整以基准文件为准）：

- 默认受信下 XFF 取链中客户端 IP
- `SetTrustedProxies([]string{})` / `nil` 时退回 RemoteAddr
- 仅信任 RemoteAddr 时解析 XFF 得到上游客户端
- CIDR 受信、hostname 解析失败、XFF 非 IP → 回退 RemoteAddr
- TrustedPlatform / AppEngine / Cloudflare / FlyIO 平台头优先
- RemoteAddr 无端口 → 空字符串

## 10. 类型测试设计

Go 编译通过即可。

## 11. 回归测试范围

- `SetTrustedProxies` 相关测试（`gin_test.go`）
- Bind / 路由等无关测试

## 12. 代码审查检查点

- XFF 必须从后往前扫描，不能简单取第一个元素
- 非受信 proxy 处截断
- 未配置受信或远端不受信时不得盲信头
- 平台头优先于代理链

## 13. 推荐评分标准

- 隐藏 `TestContextClientIP` 全过：通过
- 仅返回 RemoteIP、忽略转发头：不通过
- 破坏 `SetTrustedProxies`：不通过

## 14. 失败判定条件

- `go test . -run TestContextClientIP` 失败
- 无法编译

## 15. 测试组织建议

问题现场 repo 不含 ClientIP 专属测试；评测时从基准提交拷回测试函数再跑。

## 16. 最小测试集建议

仅 `TestContextClientIP`。

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan
- 完整 `TestContextClientIP` 断言细节（可在题面用自然语言概括，不可贴断言）
- 「已删除 validateHeader 实现」等元信息
- 必改文件清单
