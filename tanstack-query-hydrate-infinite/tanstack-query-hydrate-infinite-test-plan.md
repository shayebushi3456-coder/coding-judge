# TanStack Query hydration + infinite query 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在 `@tanstack/query-core` 问题现场中恢复以下真实能力，且不破坏普通 Query / Mutation / QueryObserver 主路径：

1. **Hydration**：`dehydrate` / `hydrate`、默认筛选、序列化/反序列化、pending promise、mutation 续跑、新旧缓存覆盖策略
2. **Infinite Query**：`infiniteQueryBehavior`、`InfiniteQueryObserver`、`QueryClient.fetchInfiniteQuery` / `prefetchInfiniteQuery` / `ensureInfiniteQueryData`，以及翻页、`maxPages`、取消与方向态

预期实现侧净恢复量约 **200～500 行**（多功能合计，不含被删专属测试）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/TanStack/query
- 基准提交：`8a0eb6a3645d21770ef0ba609bf8a158b5c3ffef`（tag `v5.62.8`）
- 评测范围：仅 `packages/query-core`
- 包管理：pnpm
- 验证命令：`pnpm --filter @tanstack/query-core test:lib`（或在 `packages/query-core` 下 `pnpm test:lib`）

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| dehydrate / hydrate | `packages/query-core/src/hydration.ts` | `packages/query-core/src/__tests__/hydration.test.tsx` |
| infiniteQueryBehavior / hasNextPage / hasPreviousPage | `packages/query-core/src/infiniteQueryBehavior.ts` | `packages/query-core/src/__tests__/infiniteQueryBehavior.test.tsx` |
| InfiniteQueryObserver | `packages/query-core/src/infiniteQueryObserver.ts` | `packages/query-core/src/__tests__/infiniteQueryObserver.test.tsx`、`infiniteQueryObserver.test-d.tsx` |
| QueryClient infinite 方法 | `packages/query-core/src/queryClient.ts`（`fetchInfiniteQuery` / `prefetchInfiniteQuery` / `ensureInfiniteQueryData`） | `queryClient.test.tsx` 中对应 describe；`queryClient.test-d.tsx` 中 infinite 相关类型用例 |
| 旁路用例 | `query.test.tsx` 中 hydration reset 用例；`queryClient.test.tsx` 中 dehydrate/hydrate 恢复 paused mutation 用例 | 同上 |

公开导出仍经 `packages/query-core/src/index.ts`；相关类型定义在 `packages/query-core/src/types.ts`（**类型表面保留，不作为剥离主体**）。

### 3.2 功能边界与复杂度

- Hydration：query/mutation 过滤、`serializeData`/`deserializeData`、pending query 携带 promise 并在 hydrate 后续跑、已有更新缓存不被旧快照覆盖、mutation scope/meta、默认仅成功 query / paused mutation。
- Infinite：多页循环拉取、`pages` 上限、`getNextPageParam`/`getPreviousPageParam`、forward/backward fetchMore、`maxPages`、取消、observer 结果字段（`hasNextPage`、`isFetchingNextPage` 等）、client 三入口注入 behavior。

涉及运行时行为、公开 API、跨模块协作（behavior ↔ observer ↔ QueryClient ↔ cache）。

### 3.3 与基准提交的行为对照要点

- `dehydrate(client)` 默认只带走 `status === 'success'` 的 query 与 `isPaused` 的 mutation；可通过 options / defaultOptions 覆盖。
- `hydrate` 对非法/空状态不抛错；已有 query 仅在 dehydrated 的 `dataUpdatedAt` 更新时覆盖，且不强制改写当前 `fetchStatus`；新建 query 的 `fetchStatus` 置 `idle`。
- pending dehydrate 可带 `promise`；hydrate 后通过 `query.fetch(..., { initialPromise })` 续跑。
- `fetchInfiniteQuery` / observer 首次结果形如 `{ pages, pageParams }`；`fetchNextPage`/`fetchPreviousPage` 按方向追加；`hasNextPage` 在 `getNextPageParam` 返回 `null/undefined` 时为 false。
- `prefetchInfiniteQuery({ pages: N })` 预取多页，遇 `getNextPageParam` 提前结束应停止。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **`hydration.ts`**：保留 `DehydrateOptions` / `HydrateOptions` / `DehydratedState` 等类型与导出符号；`dehydrate` 恒返回 `{ mutations: [], queries: [] }`；`hydrate` 空操作；`defaultShouldDehydrateQuery` / `defaultShouldDehydrateMutation` 可保留平凡实现或恒 false（勿留 TODO 注释）。删除内部 dehydrateMutation/dehydrateQuery 实质逻辑。
2. **`infiniteQueryBehavior.ts`**：`infiniteQueryBehavior` 返回空 behavior（`onFetch` 不改写 `fetchFn` 或仅透传）；`hasNextPage` / `hasPreviousPage` 恒 `false`。删除分页循环、方向拉取、`addToEnd`/`addToStart` 使用逻辑。
3. **`infiniteQueryObserver.ts`**：保留 class 与公开方法壳（`fetchNextPage` / `fetchPreviousPage` / `setOptions` / `createResult`），但不再注入 infinite behavior、不再计算翻页态；`createResult` 可退化到父类结果并补齐固定 false/空字段，避免类型/调用方立刻崩。
4. **`queryClient.ts`**：保留三个 infinite 方法签名；实现退化为直接 `fetchQuery` / `ensureQueryData` / `prefetch` 路径且**不**设置 `infiniteQueryBehavior`（或设置空 behavior）。可移除对 `infiniteQueryBehavior` 的实质依赖。
5. **删除专属测试**：
   - `packages/query-core/src/__tests__/hydration.test.tsx`
   - `packages/query-core/src/__tests__/infiniteQueryBehavior.test.tsx`
   - `packages/query-core/src/__tests__/infiniteQueryObserver.test.tsx`
   - `packages/query-core/src/__tests__/infiniteQueryObserver.test-d.tsx`
6. **裁剪混入测试（仅删目标用例，勿伤无关）**：
   - `queryClient.test.tsx`：删除 `ensureInfiniteQueryData` / `fetchInfiniteQuery` / `prefetchInfiniteQuery` 整块 describe；删除依赖 `dehydrate`/`hydrate` 的 paused mutation 恢复用例；清理无用 import。
   - `query.test.tsx`：删除 `should reset to default state when created from hydration` 及无用 dehydrate/hydrate import。
   - `queryClient.test-d.tsx`：删除仅验证 infinite API 的 describe/片段（`fetchInfiniteQuery` 独立 describe，以及 fully typed usage 中专属 infinite 断言块），避免类型测因空壳语义失败或泄露验收面；若保留类型表面导出，可保留不会执行运行时断言的极简签名引用——推荐直接删除 infinite 专属类型用例，隐藏集再恢复。

### 4.2 建议保留的公开 API / 类型 / 接线

- `index.ts` 继续导出 `dehydrate` / `hydrate` / `defaultShouldDehydrate*` / `InfiniteQueryObserver` 及 hydration 相关类型。
- `types.ts` 中 `InfiniteData`、`FetchInfiniteQueryOptions`、`InfiniteQueryObserver*` 等类型定义保留。
- `Query` / `QueryObserver` / `Mutation*` / 普通 `fetchQuery` 等核心骨架不动。
- `utils.addToEnd` / `addToStart` 及其 utils 测试可保留（非专属公开入口，保留无妨）。

### 4.3 剥离后预期失败范围

- 隐藏集恢复上述专属测试后应失败（直到被测实现补齐）。
- 问题现场本地：专属测试已删，**范围外** `query-core` 单测应尽量通过。

### 4.4 剥离范围外应保持的行为

- 普通 `fetchQuery` / `prefetchQuery` / `ensureQueryData`、QueryObserver、MutationObserver、QueryCache、重试、取消、focus/online 等。

### 4.5 避免提示性残留的注意事项

- 禁止 `TODO` / `not implemented` / `was removed` / `stub` 等注释或错误信息。
- 空壳静默退化（空 dehydrate、空 hydrate、无分页），不要抛「未实现」。
- 题面不得提及剥离、还原、基准 commit、仓库 URL。

## 5. 测试分层

1. **公开**：问题现场保留的 `query-core` 单测（普通 query/mutation/observer/utils 等）
2. **隐藏**：从基准提交恢复被删的 hydration / infinite 专属 specs + `queryClient`/`query` 中被裁剪的用例
3. **类型**：恢复 `infiniteQueryObserver.test-d.tsx` 与 `queryClient.test-d.tsx` 中 infinite 相关用例
4. **回归**：非 hydration / infinite 的 core 单测必须保持通过

## 6. 环境准备

```bash
# 仓库根目录
pnpm install
```

## 7. 推荐执行命令

```bash
pnpm --filter @tanstack/query-core test:lib
# 隐藏集示例（评测方从基准提交检出测试文件后）：
pnpm --filter @tanstack/query-core exec vitest run src/__tests__/hydration.test.tsx src/__tests__/infiniteQueryBehavior.test.tsx src/__tests__/infiniteQueryObserver.test.tsx
```

## 8. 公开测试设计

以问题现场仍保留的 unit 测试作回归与冒烟，不额外向被测模型暴露 hydration/infinite 专属用例。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

从基准提交恢复并执行：

1. `src/__tests__/hydration.test.tsx`（全量）
2. `src/__tests__/infiniteQueryBehavior.test.tsx`
3. `src/__tests__/infiniteQueryObserver.test.tsx`
4. `src/__tests__/infiniteQueryObserver.test-d.tsx`
5. `queryClient.test.tsx` 中被删的 infinite + dehydrate/hydrate 用例
6. `query.test.tsx` 中 hydration reset 用例
7. `queryClient.test-d.tsx` 中 infinite 类型用例

Oracle：与基准提交 `8a0eb6a3645d21770ef0ba609bf8a158b5c3ffef` 行为一致。

## 10. 类型测试设计

- `InfiniteQueryObserver` 构造与 `fetchNextPage` 返回类型
- `fetchInfiniteQuery` / `ensureInfiniteQueryData` 的 `InfiniteData` 推导与 `pages`+`getNextPageParam` 约束
- `DehydrateOptions` / `HydrateOptions` / `DehydratedState` 仍可从包入口导入

## 11. 回归测试范围（剥离范围外不得破坏）

- `query.test.tsx`、`queryObserver.test.tsx`、`mutation*.test.tsx`、`queryCache.test.tsx`、`utils.test.tsx`、`queriesObserver.test.tsx` 等非目标用例

## 12. 代码审查检查点

- hydrate 覆盖条件是否用 `dataUpdatedAt` 比较，且更新已有 query 时忽略 dehydrated `fetchStatus`
- pending promise 是否 `Promise.resolve` 后再 deserialize
- infinite 首次拉取 vs fetchMore 方向分支；`param == null` 且已有页时停止
- `maxPages` 与 `addToEnd`/`addToStart` 截断
- QueryClient 三入口是否注入同一 behavior
- 是否误改普通 QueryObserver / fetchQuery 主路径

## 13. 推荐评分标准

| 维度 | 权重 |
|---|---|
| Hydration 运行时 | 40% |
| Infinite behavior + observer | 35% |
| QueryClient infinite 入口 | 10% |
| 回归 | 10% |
| 代码质量 | 5% |

隐藏测试通过率 ≥ 90% 且回归无大面积失败 → 合格。

## 14. 失败判定条件

- 隐藏 hydration/infinite 用例大面积失败
- 普通 query/mutation 回归被破坏
- 仅写出类型/空壳而无正确运行时语义
- 通过修改/删除隐藏测试或降低断言强度“通过”

## 15. 测试组织建议

- 公开集：问题现场默认 `test:lib`
- 隐藏集：评测方单独目录或 CI job，从基准提交检出测试后覆盖进工作树再跑

## 16. 最小测试集建议

1. `hydration.test.tsx` 中：默认筛选、新旧覆盖、mutation 续跑、pending promise、serialize/deserialize
2. `infiniteQueryBehavior.test.tsx` 中：多页、fetchNext/Previous、maxPages、取消
3. `infiniteQueryObserver.test.tsx` 全量
4. `queryClient` 的 `fetchInfiniteQuery` / `prefetchInfiniteQuery({ pages })` / `ensureInfiniteQueryData`

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文与剥离手法
- 基准 commit / 上游仓库 URL（题面禁止）
- 被删测试文件内容与隐藏断言
- 原实现算法步骤、内部辅助函数设计
- “功能曾被删除/挖空”等元叙述
