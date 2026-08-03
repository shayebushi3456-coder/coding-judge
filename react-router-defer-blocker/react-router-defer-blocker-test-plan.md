# React Router defer / Await / blocker 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在 React Router 问题现场中恢复以下真实能力，且不破坏 data router 主路径：

1. `defer()` / `DeferredData`（Promise 追踪、abort、subscribe、resolveData、unwrappedData）
2. `<Await>` / `useAsyncValue` / `useAsyncError`（Suspense 挂起、errorElement、render prop、AbortedDeferredError 冻结）
3. 导航拦截：`getBlocker` / `deleteBlocker` / `updateBlocker` / `shouldBlockNavigation` 状态机，以及 `useBlocker`（含 basename 路径剥离）与 `unstable_usePrompt`

预期有效实现改动量约 **200～500 行**（多功能合计，不含专属测试文件体积）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/remix-run/react-router
- 基准提交：`365fefc90b861c51a1a9008df5aa035f2d7dc165`（tag `react-router@6.28.0`，同发布还包含 `@remix-run/router@1.21.0` 等 workspace 包）
- 包管理：pnpm（`packageManager: pnpm@8.10.5`）
- 验证命令：`pnpm test`（Jest projects under `packages/*`）

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| `DeferredData` / `defer` / `AbortedDeferredError` / `TrackedPromise` | `packages/router/utils.ts` | `packages/router/__tests__/defer-test.ts` |
| deferred 结果接入 router（activeDeferreds / cancel / resolveDeferredData） | `packages/router/router.ts` | 同上；部分 `ssr-test.ts` |
| `<Await>` / `AwaitErrorBoundary` / `ResolveAwait` | `packages/react-router/lib/components.tsx` | `packages/react-router/__tests__/data-memory-router-test.tsx` 中 `describe("defer")` |
| `useAsyncValue` / `useAsyncError` / `useBlocker` | `packages/react-router/lib/hooks.tsx` | Await：同上；blocker：`packages/react-router-dom/__tests__/use-blocker-test.tsx` |
| blocker 状态机与 history 接线 | `packages/router/router.ts`（`getBlocker`/`deleteBlocker`/`updateBlocker`/`shouldBlockNavigation` 及 PUSH/POP 调用点） | `packages/router/__tests__/navigation-blocking-test.ts` |
| `unstable_usePrompt` | `packages/react-router-dom/index.tsx` | `packages/react-router-dom/__tests__/use-prompt-test.tsx` |
| `AwaitContext` | `packages/react-router/lib/context.ts` | 随 Await 用例 |

### 3.2 功能边界与复杂度

- **defer**：仅接受 plain object；Promise 字段包装为 TrackedPromise；abort 竞态；subscribe/cancel；`resolveData(signal)`；`unwrappedData` 在 settled 后展开；undefined resolve 抛错。
- **Await**：非 Promise 立即成功；tracked / 未 tracked Promise；errorElement vs 上抛路由 error boundary；`AbortedDeferredError` 抛永不 settle 的 Promise 冻结 UI；render prop 走 `useAsyncValue`。
- **blocker**：单 blocker 警告；状态机 `unblocked ↔ blocked ↔ proceeding`；PUSH/REPLACE 与带 delta 的 POP；`proceed`/`reset`；`useBlocker` 注册 key、卸载 delete、basename 剥离。
- 涉及运行时行为、公开 API/类型导出、跨包协作（`@remix-run/router` ↔ `react-router` ↔ `react-router-dom`）。

### 3.3 与基准提交的行为对照要点

- `defer({ critical, lazy: promise })` 返回 `DeferredData`；pending 键可订阅；cancel 触发 `AbortedDeferredError`。
- loader 返回 `defer(...)` 时，critical 数据立即可读，lazy Promise 由 `<Await resolve={...}>` 挂起并在 resolve 后渲染。
- `useBlocker(true)` / `useBlocker(fn)` 在导航前进入 `blocked`；`proceed()` 继续，`reset()` 取消；POP 需能还原 history。
- `unstable_usePrompt({ when, message })` 在 blocked 时调用 `window.confirm`。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **`DeferredData`（utils.ts）**：保留 class / `defer()` / `AbortedDeferredError` / `TrackedPromise` 导出表面；构造时**直接原样保存 `data`，不做 Promise 追踪/AbortController/subscribe 语义**；`subscribe` 返回空取消函数；`cancel` 空操作；`resolveData` 恒 `false`；`done` 恒 `true`；`pendingKeys` 空；`unwrappedData` 直接返回 `data`。删除 `trackPromise` / `onSettle` / `emit` 等私有实现。
2. **`<Await>`（components.tsx）**：保留 `Await` / `AwaitProps` 导出；实现退化为：非函数 children 原样渲染，函数 children 以 `undefined`（或非 Promise 的 resolve 原值）调用；**不做** Suspense throw、errorElement、tracked Promise、AbortedDeferred 冻结。删除 `AwaitErrorBoundary` / `ResolveAwait` / `AwaitRenderStatus`。
3. **`useAsyncValue` / `useAsyncError`**：可保留从 `AwaitContext` 读 `_data`/`_error` 的薄实现（因 Await 已不提供 Provider，实际恒为 `undefined`），或同样退化为恒 `undefined`；勿留 TODO 注释。
4. **blocker 核心（router.ts）**：
   - `getBlocker`：不登记 `blockerFunctions`，恒返回 `IDLE_BLOCKER`
   - `deleteBlocker`：空操作（或仅 `Map.delete` 但不影响导航）
   - `updateBlocker`：可保留最小实现或一并退化；若保留调用点，`shouldBlockNavigation` **恒返回 `undefined`**，使 PUSH/POP 拦截分支永不进入
   - `shouldBlockNavigation`：body 直接 `return`
5. **`useBlocker`（hooks.tsx）**：不分配 key、不调用 `router.getBlocker`/`deleteBlocker`，恒返回 `IDLE_BLOCKER`。
6. **`unstable_usePrompt`（react-router-dom/index.tsx）**：保留导出；函数体退化为空（不调用 `useBlocker` / `window.confirm`），或恒 no-op effect。
7. **删除专属测试**（移入隐藏集）：
   - `packages/router/__tests__/defer-test.ts`
   - `packages/router/__tests__/navigation-blocking-test.ts`
   - `packages/react-router-dom/__tests__/use-blocker-test.tsx`
   - `packages/react-router-dom/__tests__/use-prompt-test.tsx`
   - `packages/react-router/__tests__/data-memory-router-test.tsx` 内整段 `describe("defer", ...)`，以及同文件错误边界小节中依赖 `<Await>`/`defer()` 的 `handles a null render-error from a defer() call` 用例
8. **保留**：data router 创建/导航/loader/action/fetcher、`<Routes>`/`<RouterProvider>`、scroll restoration、fog of war 等无关能力；blocker 类型与 `state.blockers` 字段可保留以免大面积类型崩溃；`defer` 符号继续导出。

### 4.2 建议保留的公开 API / 类型 / 接线

- 继续从 `@remix-run/router` / `react-router` / `react-router-dom` 导出 `defer`、`Await`、`useAsyncValue`、`useAsyncError`、`useBlocker`、`unstable_usePrompt`、`Blocker`、`BlockerFunction`、`IDLE_BLOCKER` 等符号；
- router 实例方法 `getBlocker` / `deleteBlocker` 签名保留；
- history listener 内对 `shouldBlockNavigation` 的调用点可保留（依赖函数恒不拦截）。

### 4.3 剥离后预期失败范围

- 隐藏集：`defer-test`、`navigation-blocking-test`、`use-blocker-test`、`use-prompt-test`、`data-memory-router` 的 defer/Await 用例失败；
- 问题现场内已删除上述文件后，剩余 Jest 套件应尽量通过（或仅剩与剥离无关的既有 flaky）。

### 4.4 剥离范围外应保持的行为

- 同步 loader/action、redirect、fetcher、嵌套路由匹配、`<Navigate>`、基础 `useNavigate`/`useLoaderData`、scroll restoration。

### 4.5 避免提示性残留的注意事项

- 禁止 `TODO` / `not implemented` / `was removed` / `restore` 注释；
- 空壳静默退化（立即 done、永不拦截），不要抛「未实现」；
- 题面不得提及剥离、还原、commit、仓库 URL。

## 5. 测试分层

1. 公开：问题现场保留的 Jest 用例（路由匹配、navigation、fetcher 等）
2. 隐藏：基准提交中被删的 defer / Await / blocker / prompt specs
3. 类型：可选，确认 `defer` / `AwaitProps` / `useBlocker` 导出仍可被 tsc 消费
4. 回归：非 defer/blocker 的 `packages/router` 与 `packages/react-router` 单测

## 6. 环境准备

```bash
pnpm install
# 若需构建再测 dist，可 pnpm build；多数 jest 直接打 src
```

## 7. 推荐执行命令

```bash
pnpm test
# 隐藏集示例（在完整基准树上）：
pnpm exec jest packages/router/__tests__/defer-test.ts
pnpm exec jest packages/router/__tests__/navigation-blocking-test.ts
pnpm exec jest packages/react-router-dom/__tests__/use-blocker-test.tsx
pnpm exec jest packages/react-router-dom/__tests__/use-prompt-test.tsx
pnpm exec jest packages/react-router/__tests__/data-memory-router-test.tsx -t defer
```

## 8. 公开测试设计

保留问题现场内未删除的单元测试作回归冒烟；可不额外增加公开用例。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

从基准提交恢复并执行：

1. `packages/router/__tests__/defer-test.ts` — DeferredData 追踪、abort、subscribe、错误路径
2. `packages/router/__tests__/navigation-blocking-test.ts` — PUSH/POP/REPLACE blocker 状态机
3. `packages/react-router-dom/__tests__/use-blocker-test.tsx` — `useBlocker` 集成
4. `packages/react-router-dom/__tests__/use-prompt-test.tsx` — confirm 提示
5. `data-memory-router-test.tsx` 的 `describe("defer")` — `<Await>` / `useAsyncValue` / `useAsyncError` / errorElement

Oracle：与 `365fefc90b861c51a1a9008df5aa035f2d7dc165` 行为一致。

## 10. 类型测试设计

可选：对导出符号做编译期检查（`defer` 返回 `DeferredData`；`useBlocker` 返回 `Blocker` 联合类型）。不引入原仓库没有的扩展类型要求。

## 11. 回归测试范围（剥离范围外不得破坏）

- `packages/router/__tests__/navigation-test.ts`、`fetchers-test.ts`、`redirects-test.ts`
- `packages/react-router/__tests__/useRoutes-test.tsx`、`navigate-test.tsx` 等非 defer 用例
- scroll restoration 相关测试应继续通过

## 12. 代码审查检查点

- Promise 字段是否真正被 track，而非原样透传
- Await 是否在 pending 时 throw Promise 进入 Suspense
- blocker 状态转换是否拒绝非法迁移
- POP + blocker 是否正确 `history.go(-delta)` 还原
- `useBlocker` 卸载是否 `deleteBlocker`
- 无提示性注释；未误伤 scroll restoration / fog of war

## 13. 推荐评分标准

| 档位 | 标准 |
|---|---|
| 优秀 | 隐藏集 defer + Await + blocker + prompt 全过；回归无新增失败 |
| 良好 | defer/Await 与 blocker 主路径通过；个别边界（abort 冻结 / POP）有缺口 |
| 及格 | 至少一整条能力线（defer+Await 或 blocker）行为对齐基准 |
| 不及格 | 仅改导出/注释；或破坏主导航；或用「未实现」抛错敷衍 |

## 14. 失败判定条件

- 隐藏集大面积失败且公开回归也被破坏
- 实现依赖私有未文档化 hack 且与基准语义明显不符（例如永远不拦截却声称完成）
- 题面/代码中引入对评测元信息的依赖

## 15. 测试组织建议

- 评测方保存基准树只读副本作 oracle
- 问题现场与 `coding-judge/.../repo` 使用剥离后代码
- 隐藏测试从基准检出，不进被测工作区

## 16. 最小测试集建议

1. `defer-test.ts` 中构造 / pending / cancel / resolveData
2. `data-memory-router` defer：Await 成功路径 + errorElement
3. `navigation-blocking-test`：blocker returns true 的 PUSH proceed/reset
4. `use-blocker-test`：基本 blocked → proceed

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文与问题现场构造步骤
- 基准 commit SHA、上游仓库 URL（题面中）
- 被删测试文件内容与隐藏断言
- 「曾删除 / 剥离 / 还原」等表述
- 原实现算法逐步还原指南
