# gin ShouldBindBodyWith body 复用 测试方案

## 1. 测试目标

验收「同一请求体可被多种 BindingBody 连续绑定」的完整行为，对齐 gin v1.10.0 基准提交。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/gin-gonic/gin
- 基准提交：`75ccf94d605a05fe24817fc2f166f6f2959d5cea`（tag v1.10.0）
- 复杂度：中等

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `context.go`：`(*Context).ShouldBindBodyWith`；快捷方法 `ShouldBindBodyWithJSON/XML/YAML/TOML`
- 常量：`BodyBytesKey`（context.go 顶部）
- 相关测试：`context_test.go` 中 `TestContextShouldBindBodyWith`、`TestContextShouldBindBodyWithJSON`、`TestContextShouldBindBodyWithXML`、`TestContextShouldBindBodyWithYAML`、`TestContextShouldBindBodyWithTOML`

### 功能边界与复杂度

完整实现会：优先从 Context 取已缓存的 body 字节；若无则 `ReadAll` 后写入 Context；再调用 `BindingBody.BindBody`。覆盖跨格式二次绑定、错误路径与快捷方法。

### 与基准提交的行为对照要点

- 第一次绑定成功后，换另一种 BindingBody 再绑仍能读到同一 body
- 第一次失败后，仍可用缓存 body 换绑定器重试成功
- 快捷方法与通用方法语义一致
- 普通 `ShouldBindWith` 不受影响

## 4. 问题现场构造方案（仅评测方可见）

### 建议剥离范围

1. 将 `ShouldBindBodyWith` 退化为：直接 `ReadAll` + `BindBody`，**不**读写 Context 缓存
2. 从问题现场删除上述 5 个 `TestContextShouldBindBodyWith*` 测试函数（避免断言泄题）
3. 不要留下 TODO / not implemented / 「缓存」类提示注释；可保留函数签名与文档里中性描述，或把文档句改成不含实现提示的简短说明

### 建议保留

- `ShouldBindWith` / `Bind*` / 各 Binding 实现
- `BodyBytesKey` 常量（可保留；若担心提示可一并删除，但隐藏测试不依赖对外暴露该常量名）
- 快捷方法外壳（仍调用 `ShouldBindBodyWith`）
- 路由、ClientIP、渲染等无关模块

### 剥离后预期失败范围

- 评测方注入/恢复的 `TestContextShouldBindBodyWith*`：二次绑定失败

### 剥离范围外应保持

- `go test` 中与 BindBody 复用无关的测试仍可通过

### 避免提示性残留

- 禁止在实现旁写「need cache」「FIXME reuse body」
- 题面不得出现仓库 URL / SHA / 文件名清单

## 5. 测试分层

- 公开：自然语言验收（二次绑定不同 Content-Type）
- 隐藏：基准提交中的 5 个测试函数全文
- 回归：其余 `go test .`

## 6. 环境准备

- Go 1.20+
- 在问题现场 `repo/` 根目录执行

## 7. 推荐执行命令

```bash
go test . -count=1
# 隐藏（评测方先恢复测试函数后）：
go test . -run 'TestContextShouldBindBodyWith' -count=1
```

## 8. 公开测试设计

题面级：同一请求体先按 A 格式绑定失败或成功后，再按 B 格式仍可绑定。

## 9. 隐藏测试设计（对齐基准提交完整行为）

从基准提交恢复 `context_test.go` 中 5 个 `TestContextShouldBindBodyWith*` 原样作为 oracle。

## 10. 类型测试设计

Go 编译通过即可；无独立类型检查脚本。

## 11. 回归测试范围

`ShouldBindJSON`、`ShouldBindQuery`、`Bind`、路由、中间件等相关测试。

## 12. 代码审查检查点

- 是否缓存 body 供二次使用
- 是否错误地改坏 `ShouldBindWith` 读流语义
- 快捷方法是否仍委托通用方法

## 13. 推荐评分标准

- 隐藏测试全过：通过
- 仅第一次绑定成功、第二次失败：不通过
- 破坏普通 Bind：不通过

## 14. 失败判定条件

- `go test . -run TestContextShouldBindBodyWith` 失败
- 工程无法编译

## 15. 测试组织建议

问题现场不含专属测试；评测时从基准提交拷回测试函数再跑。

## 16. 最小测试集建议

仅 `TestContextShouldBindBodyWith` 系列。

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文
- 完整隐藏测试源码
- 「曾删除缓存逻辑」等构造说明
- 仓库 URL / 基准 SHA（题面已禁止）
- 必改文件/符号清单
