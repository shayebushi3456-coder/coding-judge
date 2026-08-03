# Redux Toolkit matchers / autoBatch / combineSlices selector 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在问题现场中恢复以下真实能力，且不破坏 `createSlice` / `configureStore` / `createAsyncThunk` 主路径：

1. Action matching utilities：`isAnyOf` / `isAllOf` / `isPending` / `isFulfilled` / `isRejected` / `isRejectedWithValue` / `isAsyncThunkAction`（含 overload：无参返回 matcher、传入 thunks、直接传入 action）
2. `autoBatchEnhancer` + `prepareAutoBatched` + `SHOULD_AUTOBATCH`（含 `tick` / `timer` / `raf` / `callback` 排队策略与默认 enhancer 接线）
3. `combineSlices` 的 selector 状态 Proxy（注入但尚未落盘时回退到 reducer 初始值；`selector.original`）

预期有效实现净恢复量约 **200～500 行**（多功能合计）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/reduxjs/redux-toolkit
- 基准提交：`6590cec1cee83fcab165eb340f6b78762c4ad5a2`（tag `v2.5.0`）
- 包管理：yarn（workspace）
- 验证命令：`cd packages/toolkit && yarn test`

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| matchers | `packages/toolkit/src/matchers.ts` | `packages/toolkit/src/tests/matchers.test.ts`；`matchers.test-d.ts` |
| autoBatch | `packages/toolkit/src/autoBatchEnhancer.ts`；接线于 `getDefaultEnhancers.ts` | `packages/toolkit/src/tests/autoBatchEnhancer.test.ts` |
| combineSlices selector proxy | `packages/toolkit/src/combineSlices.ts`（`createStateProxy` / `original`） | `packages/toolkit/src/tests/combineSlices.test.ts` 中 `selector` describe |
| 文档（已删以免提示） | `docs/api/matching-utilities.mdx`；`docs/api/autoBatchEnhancer.mdx` | — |

### 3.2 功能边界与复杂度

- matchers：支持 action creator / type guard / async thunk action creator；`isAnyOf`/`isAllOf` 组合；async thunk status matchers 的三种调用形态；`isRejectedWithValue` 依赖 `meta.rejectedWithValue`。
- autoBatch：按 `meta[SHOULD_AUTOBATCH]` 延迟 subscriber 通知；普通 action 立即通知并冲掉排队；SSR 下 `raf` 回退到 timer。
- combineSlices selector：对未写入 state 的已注入 slice key，Proxy get 时用对应 reducer 计算初始值；`original` 仅对 Proxy 有效。

涉及运行时行为、公开 API/类型 overload、跨模块接线（enhancer ↔ configureStore；matchers ↔ RTK Query）。

### 3.3 与基准提交的行为对照要点

- `isAnyOf(a, b)(action)` / `isAllOf(a, guard)(action)` 对齐基准。
- `isPending()` / `isPending(action)` / `isPending(thunkA, thunkB)` 三种形态；fulfilled/rejected/rejectedWithValue/asyncThunkAction 同理。
- 连续 `prepareAutoBatched` 标记的 action 只触发一次订阅通知（在排队回调执行后）；未标记 action 立即通知。
- `combineSlices(...).inject(...).selector(fn)` 在尚未 dispatch 注入 slice 对应 action 时，仍可读到该 slice 的 initial state；`selector.original(proxy)` 返回未代理 state。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **`matchers.ts`**：保留公开类型与函数 overload 签名表面；实现退化为恒 `false` / 返回恒 false 的 matcher；保留 `hasExpectedRequestMetadata` 符号但恒 false。
2. **`autoBatchEnhancer.ts`**：`autoBatchEnhancer` 退化为透传 `next(...args)`；`prepareAutoBatched` 仍返回 `{ payload, meta: {} }`，不再写入 `SHOULD_AUTOBATCH`；保留常量名与 `AutoBatchOptions` 类型。
3. **`combineSlices.ts`**：删除 state Proxy / `ORIGINAL_STATE` / `createStateProxy`；selector 直接把原始 state 交给 selectorFn；`original` 退化为恒等返回。
4. **内部接线微调（避免无关主路径整片挂掉）**：
   - `createAsyncThunk` 的 `settled` 改为本地 `rejected.match || fulfilled.match`，不再依赖 `isAnyOf`。
   - `dynamicMiddleware` 的 withMiddleware 识别改为本地 `match` 组合，不再依赖 `isAllOf`。
   - listener / dynamicMiddleware **测试**内联本地 any/all helper，避免问题现场因公共 matchers 空壳导致无关用例失败。
5. **删除专属测试 / 文档**：
   - `packages/toolkit/src/tests/matchers.test.ts`
   - `packages/toolkit/src/tests/matchers.test-d.ts`
   - `packages/toolkit/src/tests/autoBatchEnhancer.test.ts`
   - `combineSlices.test.ts` 中依赖 Proxy 行为的 selector 用例改为弱化版
   - `docs/api/matching-utilities.mdx`、`docs/api/autoBatchEnhancer.mdx`；sidebars 对应条目
6. **保留**：`index.ts` 导出表面、`getDefaultEnhancers` 对 `autoBatchEnhancer` 的接线、`configureStore` / `createSlice` / entities / listenerMiddleware 主体。

### 4.2 建议保留的公开 API / 类型 / 接线

- `isAnyOf` / `isAllOf` / `isPending` / `isFulfilled` / `isRejected` / `isRejectedWithValue` / `isAsyncThunkAction` 仍从包入口导出；
- `SHOULD_AUTOBATCH` / `prepareAutoBatched` / `autoBatchEnhancer` / `AutoBatchOptions` 仍导出；
- `getDefaultEnhancers({ autoBatch })` 仍调用 `autoBatchEnhancer`；
- `combineSlices(...).selector` / `.inject` / `.withLazyLoadedSlices` 表面保留。

### 4.3 剥离后预期失败范围

- 基准中的 matchers / autoBatchEnhancer 单测与类型测（问题现场已删除，作隐藏测试回放）；
- combineSlices selector Proxy / original 行为用例；
- 依赖公共 matchers 的 RTK Query 生命周期 / endpoint matchers 相关用例（直至 matchers 被正确实现）。

### 4.4 剥离范围外应保持的行为

- `createSlice` / `createReducer` / `createAction` / `createAsyncThunk`（含 `settled`）基本行为；
- `configureStore`、默认 middleware、listenerMiddleware、dynamicMiddleware 主体；
- entities adapter；非 matcher 依赖的 toolkit 单测。

### 4.5 避免提示性残留的注意事项

- 禁止 `TODO` / `not implemented` / `was removed` 注释；
- 空壳静默失败（matcher 恒 false、enhancer 透传），不要抛「未实现」；
- 题面不得提及剥离或还原；不得点名 API/参数/模式枚举；
- 勿保留 matching-utilities / autoBatch 完整 API 文档作为题面外提示。

## 5. 测试分层

1. 公开：问题现场保留的 toolkit 非专项单测（createSlice、configureStore、listener 等）
2. 隐藏：从基准提交回放 `matchers.test.ts` / `matchers.test-d.ts` / `autoBatchEnhancer.test.ts` + combineSlices selector Proxy 用例
3. 类型：`matchers.test-d.ts` 中的 narrowing
4. 回归：entities、createAsyncThunk、listenerMiddleware、dynamicMiddleware

## 6. 环境准备

```bash
yarn install
# 如需构建产物再测：
yarn build
```

## 7. 推荐执行命令

```bash
cd packages/toolkit
yarn test
# 隐藏集定向（评测方从基准检出测试文件后）：
yarn test src/tests/matchers.test.ts src/tests/autoBatchEnhancer.test.ts src/tests/combineSlices.test.ts
```

## 8. 公开测试设计

- 问题现场内已有、且不依赖被剥离行为的用例应继续通过。
- 不向被测模型提供 matcher/autoBatch 专项用例结构。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

从基准提交恢复并运行：

1. **matchers 运行时**：`isAnyOf`/`isAllOf` 与 action creator、type guard、thunk action creator；reducer `addMatcher` 组合；`isPending`/`isRejected`/`isRejectedWithValue`/`isFulfilled`/`isAsyncThunkAction` 三种调用形态与多 thunk 过滤。
2. **matchers 类型**：`matchers.test-d.ts` 的 narrowing。
3. **autoBatch**：`tick`/`raf`/`timer`/`callback` 下批量低优先级通知次数；穿插未标记 action 立即刷新；`prepareAutoBatched` 写入 `meta[SHOULD_AUTOBATCH]`。
4. **combineSlices selector**：未 dispatch 时 selector 读到 injected slice initial state；`original` 抛错条件与返回值。

Oracle：与 `6590cec1cee83fcab165eb340f6b78762c4ad5a2` 行为一致。

## 10. 类型测试设计

- 恢复并执行 `matchers.test-d.ts`；
- 可选：确认 `AutoBatchOptions` 与 `prepareAutoBatched` 泛型 payload 仍可用。

## 11. 回归测试范围（剥离范围外不得破坏）

- `createSlice` / `createAsyncThunk` / `configureStore` / `listenerMiddleware` / `dynamicMiddleware` / entities；
- `getDefaultEnhancers` 在 `autoBatch: false` 时不挂载 enhancer。

## 12. 代码审查检查点

- matchers 正确区分「带 `.match` 的 action creator」与普通 predicate；
- async thunk matchers 正确识别 `meta.requestId` + `meta.requestStatus`；
- `isRejectedWithValue` 需同时满足 rejected 与 `meta.rejectedWithValue`；
- autoBatch 在 `finally` 中恢复 `notifying`，且排队回调只 enqueue 一次；
- combineSlices Proxy 对缺失 key 调用 reducer(undefined, randomAction) 取初始值，且 reducer 返回 undefined 时抛明确错误；
- 未把解法硬编码成仅服务单一测试用例的分支。

## 13. 推荐评分标准

| 等级 | 标准 |
|---|---|
| 优秀 | matchers + autoBatch + selector Proxy 全过隐藏测与类型测；回归绿 |
| 良好 | matchers 与 autoBatch 主路径通过；selector Proxy 有小缺口或类型 narrowing 不全 |
| 及格 | 仅恢复 matchers 或 autoBatch 之一的核心行为，另一项部分可用 |
| 不及格 | 公开 API 表面仍空壳；或严重破坏 createSlice/configureStore 回归 |

## 14. 失败判定条件

- 隐藏 matchers / autoBatch 用例大面积失败；
- enhancer 未消费 `SHOULD_AUTOBATCH` 或 `prepareAutoBatched` 未打标；
- selector 在注入后、未 dispatch 时仍得到 `undefined`（相对基准）；
- 为通过测试而删除/跳过大量无关回归；
- 引入 `TODO`/`not implemented` 或明显占位抛错。

## 15. 测试组织建议

- 评测方单独保存基准提交中的三个专项测试文件，评测时再放入候选提交；
- 先跑回归子集，再跑隐藏专项。

## 16. 最小测试集建议

1. `matchers.test.ts`（运行时）
2. `autoBatchEnhancer.test.ts`
3. `combineSlices.test.ts` 的 selector Proxy / original 用例
4. 抽样 `createSlice.test.ts` / `configureStore` 相关回归

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文与问题现场构造细节；
- 基准 commit SHA / 上游仓库 URL（题面中）；
- 被删测试文件内容与断言结构；
- 「功能曾被删除/剥离/挖空」等元叙述；
- 参考实现或伪代码级还原步骤；
- 必须修改的文件清单。
