# gin BasicAuth 中间件测试方案

## 1. 测试目标

验收 gin 整套 Basic / Proxy Basic 认证中间件行为，对齐 gin v1.10.0。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/gin-gonic/gin
- 基准提交：`75ccf94d605a05fe24817fc2f166f6f2959d5cea`（v1.10.0）
- 复杂度：中等偏上（整模块）
- 模块：根包 `auth.go`（BasicAuth 功能模块）

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `auth.go`：`Accounts`、`authPair`/`authPairs`、`searchCredential`（constant-time）、`processAccounts`、`authorizationHeader`、`BasicAuth`、`BasicAuthForRealm`、`BasicAuthForProxy`
- 相关测试：`auth_test.go` 全文件

### 功能边界

- `BasicAuth` → `BasicAuthForRealm(accounts, "")`
- 默认 realm：`Authorization Required`；自定义 realm 用 `strconv.Quote` 拼进 `Basic realm=...`
- 读 `Authorization`；失败 401 + `WWW-Authenticate` + Abort；成功 `c.Set(AuthUserKey, user)`
- Proxy：`Proxy-Authorization`；失败 407 + `Proxy-Authenticate`；成功 `AuthProxyUserKey`
- `processAccounts`：空表 / 空用户名 panic；预计算 `Basic ` + base64(user:pass)
- `searchCredential`：空串失败；`subtle.ConstantTimeCompare`

### 对照要点

隐藏测试对齐基准 `auth_test.go`（含 processAccounts 结构、401/407 文案、自定义 realm 转义）。

## 4. 问题现场构造方案（仅评测方可见）

1. 删除 `auth.go` 内全部认证实现与内部类型，仅保留导出常量 `AuthUserKey` / `AuthProxyUserKey`、`Accounts` 类型，以及三个中间件函数的「直接 `c.Next()`」空壳
2. 将 `auth_test.go` 替换为占位测试，避免断言泄题
3. 不留 TODO /「auth removed」注释；勿改其它包文件的无关逻辑

### 预期失败

恢复完整 `auth_test.go` 后全部 BasicAuth 相关用例失败。

### 回归

路由、binding、recovery 等非 auth 测试应仍可通过。

## 5–7. 环境与命令

```bash
cd repo
go test . -count=1
# 隐藏：恢复基准 auth_test.go 后
go test . -run BasicAuth -count=1
```

## 8–9. 公开 / 隐藏测试

公开：题面 Basic/Proxy、401/407、realm、panic、constant-time 自然语言。  
隐藏：基准 `auth_test.go` 全文。

## 10–14. 类型 / 回归 / 审查 / 评分 / 失败

编译通过；审查是否漏 Proxy 路径、realm Quote、Abort、context key；隐藏全过为通过。

## 15–17. 组织与不可泄露

问题现场无 auth 专属断言；不得泄露本 plan、符号清单、仓库 SHA（题面禁止）。
