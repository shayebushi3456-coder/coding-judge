# go-zero REST 接入控制与访问日志（多轮）测试方案

## 1. 测试目标

以**多轮对话**方式验收 go-zero `rest/handler` 中一组可独立迭代的入口能力：请求体大小限制、并发连接限制、负载泄洪、请求体 gzip 解压、简要/详细访问日志。对齐基准提交完整行为。

改动集中在 **5 个源文件**；对话共 **4 轮**（第 1 轮给框架，后 3 轮各加一小块能力）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/zeromicro/go-zero
- 基准标签：`v1.7.3`
- 基准提交：`796dd5b6e2df35969a0c8716dd5f26b19e506ef8`
- 复杂度：中等（多轮增量；单轮改动小，合轮后覆盖同步中间件、错误状态码、可选关闭、日志侧写与慢调用）
- 实现文件（5 个）：
  1. `rest/handler/maxbyteshandler.go`
  2. `rest/handler/maxconnshandler.go`
  3. `rest/handler/sheddinghandler.go`
  4. `rest/handler/gunziphandler.go`
  5. `rest/handler/loghandler.go`

## 3. 被剥离功能说明（仅评测方可见）

| 文件 | 符号 / 行为 |
|---|---|
| `maxbyteshandler.go` | `MaxBytesHandler`：`ContentLength > n` → 413；`n<=0` 直通 |
| `maxconnshandler.go` | `MaxConnsHandler`：`syncx.Limit` 借还；满则 503；`n<=0` 直通 |
| `sheddinghandler.go` | `SheddingHandler` / `ensureSheddingStat`：`shedder.Allow` 拒绝 → 503 + metrics drop；业务写 503 记 Fail，否则 Pass；`shedder==nil` 直通 |
| `gunziphandler.go` | `GunzipHandler`：`Content-Encoding` 含 gzip 则换 `gzip.Reader`；坏流 400；无编码直通 |
| `loghandler.go` | `LogHandler` / `DetailedLogHandler` / `SetSlowThreshold` / `logBrief` / `logDetails` / 彩色 method·status / slowcall / body 复制与 detail writer Hijack |

相关基准测试（隐藏 oracle）：

- `maxbyteshandler_test.go`
- `maxconnshandler_test.go`
- `sheddinghandler_test.go`
- `gunziphandler_test.go`
- `loghandler_test.go`

### 与基准提交的行为对照要点

1. MaxBytes：超限只写 413、不调用 next；未超限放行；`n<=0` 恒放行  
2. MaxConns：并发打满后下一请求 503；结束后归还名额；`n<=0` 不限流  
3. Shedding：Allow 失败立即 503 且不进业务；业务响应码为 503 时 `promise.Fail()`，否则 `Pass()`；nil shedder 恒放行  
4. Gunzip：gzip 成功后下游读到明文；非 gzip 原样；声明 gzip 但体非法 → 400  
5. Log：简要日志带状态/方法/URI/远端/UA；超慢阈值走 Slow；5xx 额外 dump 请求；Detailed 记录请求与响应体；`SetSlowThreshold` 可调；detail writer 支持 Flush/Hijack  

## 4. 问题现场构造方案（仅评测方可见）

对上述 5 个实现文件做「保留导出符号、掏空行为」；专属测试换成占位，避免断言泄题。其它 handler（timeout/breaker/cryption/auth/recover 等）不动。

### 4.1 建议剥离范围

1. **`maxbyteshandler.go`**：保留 `MaxBytesHandler` 签名；体内恒 `return next` 包装（或对一切 `n` 直接放行），勿留「limit removed」注释。  
2. **`maxconnshandler.go`**：保留 `MaxConnsHandler`；不做 Limit 借还，一律 `next.ServeHTTP`。  
3. **`sheddinghandler.go`**：保留 `SheddingHandler` 导出；`shedder==nil` 仍可直通；非 nil 时也不再调用 Allow / 写 503 / 记 metrics（直接 next）。可删除或留空 `ensureSheddingStat` 私有逻辑，勿写 TODO。  
4. **`gunziphandler.go`**：保留 `GunzipHandler`；忽略 Content-Encoding，原样 `next.ServeHTTP`。  
5. **`loghandler.go`**：保留 `LogHandler`、`DetailedLogHandler`、`SetSlowThreshold` 导出表面；中间件退化为直接 `next.ServeHTTP(w,r)`；可删除 `detailLoggedResponseWriter` / `logBrief` / `logDetails` / `wrap*` 等私有实现，或留无调用死代码但不要注释「logging stub」。  
6. **测试占位**：将上述 5 个 `*_test.go` 替换为仅含 `TestPlaceholder`/`t.Skip` 一类中性占位（或删掉全部行为断言），避免给模型对照答案。

### 4.2 建议保留

- 导出函数名与签名（避免无关编译失败）
- `rest/handler` 包内其它文件、`core/load`、`rest/internal`、`response` 等依赖实现
- 与本任务无关的 handler 测试

### 4.3 剥离后预期失败 / 回归

- 评测方恢复 5 份基准 `*_test.go` 后：MaxBytes/MaxConns/Shedding/Gunzip/Log 相关用例应大量失败（直至模型实现）。  
- 回归：`breakerhandler_test.go`、`timeouthandler_test.go`、`recoverhandler_test.go`、`authhandler_test.go` 等未剥离模块应继续通过。

### 4.4 避免提示性残留

- 无 `TODO` / `FIXME` / `not implemented` / `stripped` / `for evaluation`  
- 题面与代码注释不出现文件清单、commit SHA、轮次答案要点  
- 后续轮次文案仅由评测方在对话中投喂，不预置在问题现场仓库内

## 5. 多轮对话脚本（仅评测方可见，按序投喂）

> 评测协议：被测 agent 始终处于同一问题现场工作区。第 1 轮只给 `task.md`；每一轮实现并自测通过后，再投喂下一轮用户消息。**禁止**在第 1 轮一次性泄露后续轮次需求。

### Turn 1 — 接入控制框架（初始题面 = `gozero-rest-admission-log.task.md`）

**用户消息（已写入 task.md）：**

> 先在当前代码库把 HTTP 入口的接入控制框架补上。  
> 请求体别让人随便灌大包，超了上限就拒；同时在途连接数也要能卡死，挤爆了别再往里放。上限配成 0 或负数就当没开这层，直接放行。先把这两块骨架做稳，go test 相关用例能过就行。

**本轮目标文件：** `maxbyteshandler.go`、`maxconnshandler.go`  
**本轮隐藏验收：** 恢复并跑通 `maxbyteshandler_test.go`、`maxconnshandler_test.go`  
**本轮不做：** shedding / gunzip / log

### Turn 2 — 负载泄洪

**用户消息（上一轮完成后投喂）：**

> 框架有了，再补一层泄洪：负载顶不住的时候直接把请求丢掉，别把后面拖死；能过的正常往下走。业务自己返回服务不可用时，也要让泄洪侧记成失败，好调节阈值。没配泄洪器就当没这层。把对应测试跑绿。

**本轮目标文件：** `sheddinghandler.go`  
**本轮隐藏验收：** `sheddinghandler_test.go`  
**回归：** Turn 1 相关测试不得回退

### Turn 3 — gzip 请求体

**用户消息：**

> 有客户端会把 body 用 gzip 压了再打进来，入口要能认出来并解开再交给后面；不是压缩的别乱动。声称压了但解开失败就当坏请求拒掉。补完跑相关测试。

**本轮目标文件：** `gunziphandler.go`  
**本轮隐藏验收：** `gunziphandler_test.go`  
**回归：** Turn 1–2

### Turn 4 — 访问日志

**用户消息：**

> 最后把访问日志补上：常规一版记方法、路径、状态、耗时这些就行，太慢的要标出来；还要一版更细的，请求响应内容也尽量带上。慢的阈值最好能改。别把前面几轮的接入控制搞坏，整包 `go test ./rest/handler -count=1` 过一遍。

**本轮目标文件：** `loghandler.go`  
**本轮隐藏验收：** `loghandler_test.go`  
**回归：** Turn 1–3 + 其它未改 handler

## 6. 测试分层

| 层 | 用途 |
|---|---|
| 公开 | 各轮题面自然语言；模型可用仓库内占位测试或自写测试 |
| 隐藏 | 每轮结束后恢复对应基准 `*_test.go` 跑 oracle；终轮恢复全部 5 份 |
| 回归 | 终轮对整个 `rest/handler` 及邻近包抽样 |

## 7. 环境准备

- Go 1.20+（与 `go.mod` 一致）
- 无需外部 Redis/DB/Docker

## 8. 推荐执行命令

```bash
cd repo
go test ./rest/handler -count=1
# 分轮隐藏示例：
go test ./rest/handler -run 'MaxBytes|MaxConns' -count=1
go test ./rest/handler -run 'Shedding' -count=1
go test ./rest/handler -run 'Gunzip' -count=1
go test ./rest/handler -run 'LogHandler|DetailedLog|SlowThreshold|OkResponse|wrapMethod|wrapStatus' -count=1
```

## 9. 公开测试设计

公开侧不提供完整基准断言。题面仅模糊描述：

- Turn 1：体过大拒绝、连接打满拒绝、非正上限关闭  
- Turn 2：过载丢弃、业务 503 反馈、无 shedder 关闭  
- Turn 3：gzip 解开 / 非 gzip / 坏流  
- Turn 4：简要日志、详细日志、慢阈值  

精确状态码、metrics、promise Fail/Pass、慢阈值默认 500ms、body 复制上限等一律放隐藏测试。

## 10. 隐藏测试设计（对齐基准提交）

以基准提交中下列文件全文为 oracle（评测时覆盖回问题现场）：

1. `rest/handler/maxbyteshandler_test.go`  
2. `rest/handler/maxconnshandler_test.go`  
3. `rest/handler/sheddinghandler_test.go`  
4. `rest/handler/gunziphandler_test.go`  
5. `rest/handler/loghandler_test.go`  

分轮评分：每轮只恢复该轮文件；终轮五份齐开 + `go test ./rest/handler -count=1`。

## 11. 类型测试设计

Go 编译即类型验收：导出函数签名须与基准兼容（`MaxBytesHandler(int64)`、`MaxConnsHandler(int)`、`SheddingHandler(load.Shedder, *stat.Metrics)`、`GunzipHandler(http.Handler) http.Handler`、`LogHandler`/`DetailedLogHandler`/`SetSlowThreshold`）。不得为绕过测试改其它包导出 API。

## 12. 回归测试范围

- `rest/handler` 内 timeout / breaker / cryption / auth / recover / prometheus / trace / maxconns 以外未剥离文件  
- 终轮全量 `go test ./rest/handler -count=1` 不得引入与本任务无关的失败  

## 13. 代码审查检查点

- MaxBytes 是否仅看 `ContentLength`（与基准一致），超限是否仍调用 next  
- MaxConns 是否 `TryBorrow` 失败才 503，以及 `Return` 错误是否记日志  
- Shedding 对业务 503 是否 `Fail()`，对成功是否 `Pass()` 且 `IncrementPass`  
- Gunzip 是否用 `strings.Contains` 判断 encoding，失败是否 400  
- Log 是否挂 `LogCollector`、简要路径限制复制 body、Detailed 是否双工复制；`SetSlowThreshold` 是否生效  
- 是否破坏其它 middleware 的组合使用方式（均为 `func(http.Handler) http.Handler`）

## 14. 推荐评分标准

| 等级 | 标准 |
|---|---|
| 优秀 | 4 轮均在对应隐藏测试全绿；终轮 `rest/handler` 全绿；无回归 |
| 良好 | 前 3 轮全绿，Turn 4 日志主体正确但个别慢调用/着色细节偏差 |
| 及格 | Turn 1–2 正确，后续轮次部分实现且无严重回归 |
| 不及格 | Turn 1 框架未完成；或为过测大幅删改无关模块；或终轮大面积回归 |

多轮特殊规则：若模型在 Turn 1 超前实现后续轮次能力，**不扣分**（隐藏测试仍按轮累计）；但若 Turn 1 未完成框架就进入后轮，后轮分无效。

## 15. 失败判定条件

- 任一关键轮隐藏测试在合理修复时间后仍失败  
- 修改 `core/load`、`rest/internal/security` 等以硬编码假通过  
- 删除或跳过隐藏测试冒充通过  
- 问题现场被改回「提示性 stub」并依赖评测方还原以外的外部完整实现拷贝（允许对照公开文档，不允许要求联网粘贴本仓库历史实现作为唯一路径——实际评测以本地隐藏测试为准）

## 16. 测试组织建议

```text
eval/
  turn1/  # 仅 maxbytes + maxconns 基准测试
  turn2/  # + shedding
  turn3/  # + gunzip
  turn4/  # + log 全量
```

或单仓评测：每轮 `git checkout` 基准测试文件子集。

## 17. 最小测试集建议

- Turn 1：`TestMaxBytesHandler`、`TestMaxBytesHandlerNoLimit`、`TestMaxConnsHandler`、`TestWithoutMaxConnsHandler`  
- Turn 2：`TestSheddingHandlerAccept` / `Fail` / `Reject` / `NoShedding`  
- Turn 3：`TestGunzipHandler`、`TestGunzipHandler_NoGzip`、`TestGunzipHandler_NoGzipButTelling`  
- Turn 4：`TestLogHandler`、`TestLogHandlerVeryLong`、`TestLogHandlerSlow`、`TestDetailedLogHandler_Hijack`、与 `SetSlowThreshold` / wrap 相关用例  

## 18. 不得泄露给被测模型的内容清单

- 本 test-plan 全文、仓库 URL、基准 commit / tag  
- 「功能被剥离/挖空」及具体文件清单（题面禁止）  
- Turn 2–4 的用户消息（只能在对应轮次由评测方投喂，不可写入初始 `task.md` 或 repo）  
- 隐藏测试全文与精确状态码/阈值枚举（题面保持模糊）  
- 基准实现粘贴、内部私有类型设计步骤  
- 评分表与失败判定的操作细节  
