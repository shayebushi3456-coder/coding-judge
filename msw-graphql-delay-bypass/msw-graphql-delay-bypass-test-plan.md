# MSW GraphQL / delay / bypass / passthrough 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在 MSW 问题现场中恢复以下真实能力，且不破坏 HTTP handler 主路径：

1. GraphQL 请求解析（`parseGraphQLRequest` / `parseDocumentNode`）与 `GraphQLHandler` 匹配（parse / predicate / DocumentNode 构造）
2. `delay()`（数值时长、`real` / `infinite`、非法参数）
3. `bypass()` 与 `passthrough()`

预期有效实现改动量约 **300～500 行**（多功能合计）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/mswjs/msw
- 基准提交：`e3234fdce5a36f41c77719492e2eca0f77d7aaa6`（tag `v2.7.0`）
- 包管理：pnpm
- 验证命令：`pnpm test:unit`（隐藏集可定向跑 GraphQL / delay 相关用例）

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| GraphQLHandler | `src/core/handlers/GraphQLHandler.ts`；`src/core/graphql.ts` | `src/core/handlers/GraphQLHandler.test.ts`；`src/core/graphql.test.ts` |
| parseGraphQLRequest | `src/core/utils/internal/parseGraphQLRequest.ts` | `src/core/utils/internal/parseGraphQLRequest.test.ts` |
| delay | `src/core/delay.ts` | `test/node/msw-api/context/delay.node.test.ts`；`test/browser/msw-api/context/delay.test.ts` |
| bypass | `src/core/bypass.ts` | 仓库内 bypass 相关测试（若有） |
| passthrough | `src/core/passthrough.ts` | passthrough 相关测试（若有） |

### 3.2 功能边界与复杂度

- GraphQL：GET/POST/multipart 输入提取、graphql AST 解析、operation type/name 匹配、DocumentNode 构造校验、匿名 operation 警告、解析缓存。
- delay：Node/浏览器真实延迟区间、`infinite` 使用 `SET_TIMEOUT_MAX_ALLOWED_INT`、越界校验。
- bypass：克隆 Request、追加 `accept: msw/passthrough`、bodyUsed 校验。
- passthrough：返回带 `x-msw-intention: passthrough` 的特殊 Response。

涉及运行时行为、公开 API、跨模块协作（handler ↔ parse ↔ http 管线）。

### 3.3 与基准提交的行为对照要点

- `graphql.query('X', resolver)` 仅匹配同名 query；mutation 同理；`operation` 匹配全部。
- `parseGraphQLRequest` 对非法 query 抛格式化错误；multipart 文件变量注入正确。
- `delay('real')` / `delay(n)` / `delay('infinite')` 行为对齐基准。
- `bypass(req)` 后的请求应被 MSW 忽略；`passthrough()` 停止后续 handler。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **`GraphQLHandler`**：保留 class、类型与构造函数外壳（可用字符串 operationName）；`parse` 返回仅含 match/cookies 的空结果；`predicate` 恒为 `false`；`parseGraphQLRequestOrGetFromCache` 返回 `undefined`；弱化 DocumentNode 分支（不解析或直接不支持）。
2. **`parseGraphQLRequest.ts`**：`parseDocumentNode` / `parseGraphQLRequest` 退化为空实现（`parseGraphQLRequest` 恒 `undefined`）；删除 GET/POST/multipart 解析与 `parseQuery`。
3. **`delay.ts`**：退化为 `await Promise.resolve()` 或固定 `setTimeout(0)`，不处理 mode/越界。
4. **`bypass.ts`**：退化为 `return new Request(...)`，不追加 passthrough accept 头。
5. **`passthrough.ts`**：退化为 `return new Response(null, { status: 200 })`，不带 MSW intention 头。
6. **删除专属测试**：
   - `src/core/handlers/GraphQLHandler.test.ts`
   - `src/core/graphql.test.ts`
   - `src/core/utils/internal/parseGraphQLRequest.test.ts`
   - `test/node/msw-api/context/delay.node.test.ts`
   - `test/browser/msw-api/context/delay.test.ts` 与 mocks（若仅测 delay）
7. **保留**：`graphql.ts` 导出表面、`http` handlers、`RequestHandler` 基类、node/browser setup 骨架。

### 4.2 建议保留的公开 API / 类型 / 接线

- `graphql` / `GraphQLHandler` / `delay` / `bypass` / `passthrough` 仍从 `src/core/index.ts` 导出；
- 相关 TypeScript 类型定义保留；
- 不删除 `http.*` 能力。

### 4.3 剥离后预期失败范围

- 上述隐藏 GraphQL / delay / bypass / passthrough 用例失败；
- 普通 `http.get/post` 单测应尽量继续通过。

### 4.4 剥离范围外应保持的行为

- HTTP handler 匹配、SetupServer/Worker 基础生命周期、HttpResponse 构造。

### 4.5 避免提示性残留的注意事项

- 禁止 `TODO` / `not implemented` / `was removed` 注释；
- 空壳静默失败（不匹配 / 立即返回），不要抛「未实现」；
- 题面不得提及剥离或还原。

## 5. 测试分层

1. 公开：问题现场保留的 unit 测试（HTTP 等）
2. 隐藏：基准提交中被删的 GraphQL / delay 等 specs + bypass/passthrough 行为用例
3. 类型：可选，对 `graphql.query` / `delay` 签名做 dts 检查
4. 回归：非 GraphQL 的 core 单测

## 6. 环境准备

```bash
pnpm install
```

## 7. 推荐执行命令

```bash
pnpm test:unit
# 隐藏集示例：
pnpm exec vitest run src/core/handlers/GraphQLHandler.test.ts src/core/graphql.test.ts src/core/utils/internal/parseGraphQLRequest.test.ts src/core/delay.ts
```

## 8. 公开测试设计

保留 HTTP / 工具类单测作回归；可不额外增加公开冒烟。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

从基准提交恢复并执行：

1. `src/core/handlers/GraphQLHandler.test.ts`
2. `src/core/graphql.test.ts`
3. `src/core/utils/internal/parseGraphQLRequest.test.ts`
4. delay 的 node/browser 测试
5. 自建：`bypass` 请求不被 handler 命中；handler 返回 `passthrough()` 时链路放行

## 10. 类型测试设计

- `graphql.link(url).query` 返回 `GraphQLHandler`
- `delay` 参数为 `number | 'real' | 'infinite' | undefined`

## 11. 回归测试范围

- `src/core/http*.ts`、`HttpHandler`、`RequestHandler`、matching 工具等。

## 12. 代码审查检查点

- GraphQL 解析缓存是否按 Request WeakMap；
- multipart 变量注入；
- delay 越界与 infinite；
- bypass 使用 `accept` 而非自定义禁头场景；
- 是否误改 HTTP 主路径。

## 13. 推荐评分标准

| 维度 | 权重 |
|---|---|
| GraphQL 解析与匹配 | 45% |
| delay | 20% |
| bypass / passthrough | 20% |
| 回归 | 10% |
| 代码质量 | 5% |

隐藏测试通过率 ≥ 90% 且回归无大面积失败 → 合格。

## 14. 失败判定条件

- 仅改测试或只留空壳；
- 破坏 `http` mocking 主路径；
- 跳过/删除隐藏测试配置。

## 15. 测试组织建议

oracle：基准 commit 只读副本；问题现场：本任务 `repo/`。

## 16. 最小测试集建议

1. `graphql.query` 命中 + variables
2. `delay(10)` 与非法 mode
3. `bypass` / `passthrough` 各一

## 17. 不得泄露给被测模型的内容清单

- 本文件；基准 SHA / 上游 URL；剥离元叙述；隐藏断言全文；参考实现。
