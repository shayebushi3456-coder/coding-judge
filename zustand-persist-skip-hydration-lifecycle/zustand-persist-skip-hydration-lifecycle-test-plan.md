# zustand persist skipHydration / hydration lifecycle 测试方案

> **仅供评测方内部使用，不得向被测模型泄露本文档任何内容。**

---

## 1. 测试目标

验证被测模型能否在「`skipHydration` 与 hydration 生命周期 API 已被剥离」的 Zustand `persist` 问题现场中，独立实现与基准提交一致的行为，包括：

- `skipHydration` 延迟自动回填；
- `persist.hasHydrated()` 状态查询；
- `persist.onHydrate` / `persist.onFinishHydration` 订阅与取消；
- 同步 / 异步 storage 下的生命周期时序；
- 并发 `rehydrate()` 时仅最后一次生效（含完成回调）；
- 相关 TypeScript 类型；
- 剥离范围外 persist 能力的回归（merge / partialize / migrate / onRehydrateStorage / setOptions / clearStorage 等）。

---

## 2. 目标仓库与基准提交

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/pmndrs/zustand |
| 基准提交 | `bfb2a9e7ce52608d54d8a077fb87ac9d12e73c58`（标签 `v5.0.14`；annotated tag 对象 `8fb7eca3757b25cf28f4acd2f8b0da3ff4fac68c`） |
| 角色匹配 | 角色仓库列表第 15 项 Zustand；覆盖状态管理、中间件、SSR 水合控制、TypeScript 类型、异步竞态 |
| 复杂度 | 中等偏复杂：跨 sync/async 双测文件、公开 API + 选项、监听器生命周期、并发回填、类型导出 |

```bash
git clone https://github.com/pmndrs/zustand
cd zustand
git checkout bfb2a9e7ce52608d54d8a077fb87ac9d12e73c58
pnpm install
```

推荐命令：

```bash
pnpm test:spec
pnpm test:types
pnpm test:spec -- tests/persistSync.test.tsx tests/persistAsync.test.tsx
```

本地问题现场：`/Users/xoban/zustand-persist-skip-hydration-lifecycle-repo`  
分支：`problem/zustand-persist-skip-hydration-lifecycle`

---

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 类别 | 位置 |
|---|---|
| 选项类型 | `src/middleware/persist.ts` → `PersistOptions.skipHydration?: boolean` |
| API 类型 | 同文件 `StorePersist` → `persist.hasHydrated` / `onHydrate` / `onFinishHydration` |
| 运行时 | `persistImpl`：`hasHydrated` 标志、`hydrationListeners` / `finishHydrationListeners`、`hydrate()` 起止处的 listener 触发、末尾 `if (!options.skipHydration) hydrate()` |
| 竞态基础设施 | `hydrationVersion` 计数器（与本功能强相关，问题现场**保留**竞态保护骨架，以便回归与隐藏测对齐；但公开 listener API 仍需模型接回） |
| 同步测试 | `tests/persistSync.test.tsx`：skipHydration、hasHydrated、onHydrate/onFinishHydration 相关用例 |
| 异步测试 | `tests/persistAsync.test.tsx`：同上，以及 concurrent rehydrate + onFinishHydration |
| 类型测试 | `tests/middlewareTypes.test.tsx` 中对 `hasHydrated()` 的调用/类型断言 |
| 文档 | `docs/reference/middlewares/persist.md`、`docs/reference/integrations/persisting-store-data.md` 中 skipHydration / hasHydrated / onHydrate / onFinishHydration 章节 |

### 3.2 功能边界与复杂度说明

目标不是单行 `if`，而是一套可独立验收的 SSR/水合控制切片：

1. 初始化是否自动 `hydrate()` 的门闩（`skipHydration`）；
2. 回填完成状态机（`hasHydrated`：开始时 false，成功结束 true；失败路径不置 true）；
3. 开始/结束监听器集合与 unsubscribe；
4. 与既有 `rehydrate()`、`onRehydrateStorage`、async storage、`hydrationVersion` 竞态保护的衔接；
5. 类型面与运行时面同时存在。

涉及：**运行时行为** + **类型/API** + **同步/异步** + **跨模块（选项 ↔ persist API ↔ hydrate 状态机）**。

### 3.3 与基准提交的行为对照要点（oracle）

对照 `bfb2a9e7ce52608d54d8a077fb87ac9d12e73c58` 完整实现：

1. `skipHydration !== true`（默认）时，store 创建后立即进入 `hydrate()`。
2. `skipHydration: true` 时，创建后不自动 hydrate；`hasHydrated()` 为 `false`，直到手动 `rehydrate()` 成功完成。
3. 每次 `hydrate()` 开始：`hasHydrated = false`，同步调用所有 `onHydrate` 监听器，参数为 `get() ?? configResult`。
4. hydrate 成功路径末尾：`hasHydrated = true`，调用所有 `onFinishHydration` 监听器，参数为最终 state。
5. hydrate 失败（catch）路径：调用 `onRehydrateStorage` 完成回调 `(undefined, error)`；**不**调用 `onFinishHydration`；`hasHydrated` 保持 false。
6. `onHydrate` / `onFinishHydration` 返回 unsubscribe；取消后不再触发。
7. 异步 storage 下多次并发 `rehydrate()`：仅 `hydrationVersion` 最新的一次会 merge/set、触发完成回调与 `onFinishHydration`。
8. 未配置 `skipHydration` 时行为与剥离前自动 hydrate 一致；`merge` / `migrate` / `partialize` / `onRehydrateStorage` 不受影响。

---

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

在基准提交上创建分支后：

1. **`PersistOptions`**：删除 `skipHydration` 字段及其 JSDoc。
2. **`StorePersist`**：删除 `hasHydrated` / `onHydrate` / `onFinishHydration` 三个 API 类型声明。
3. **`persistImpl` 运行时**：
   - 删除 `hasHydrated` 变量、`hydrationListeners`、`finishHydrationListeners`；
   - 删除 `hydrate()` 内对 listeners 的调用及 `hasHydrated` 赋值；
   - **保留** `hydrationVersion` 及三处 abort 检查（竞态保护属于通用 hydrate 正确性，留给回归；隐藏测会验证与 listener 的组合）；
   - `persist` 对象上删除三个 API 实现；
   - 将 `if (!options.skipHydration) { hydrate() }` 改为无条件 `hydrate()`。
4. **删除 `PersistListener` 类型**（若已无引用）。
5. **测试**：从 `persistSync` / `persistAsync` 中移除仅服务于本功能的用例（见 4.3）；保留 migrate / merge / partialize / onRehydrateStorage / setOptions / clearStorage / 基础 rehydrate 等回归用例。
6. **`middlewareTypes.test.tsx`**：去掉对已删除 API 的引用，避免问题现场因类型错误无法安装/理解。
7. **文档**：删除或改写 skipHydration / hasHydrated / onHydrate / onFinishHydration 专属章节与示例，避免题面外泄；不要留下「TODO / not implemented / 已删除」痕迹。

### 4.2 建议保留的公开 API / 类型 / 接线

- `persist` 中间件主体、`createJSONStorage`、`storage` / `partialize` / `merge` / `version` / `migrate` / `onRehydrateStorage` / `name`
- `persist.setOptions` / `clearStorage` / `getOptions` / `rehydrate`
- `hydrationVersion` 竞态 abort 逻辑
- 其余 middleware（devtools / immer / subscribeWithSelector 等）全部不动

### 4.3 剥离后预期失败范围

恢复完整测试套件（或评测方隐藏测）后，下列场景应失败直至模型实现正确：

- `skipHydration: true` 时创建后仍被自动回填 / `hasHydrated` 初始不为 false；
- 缺少 `hasHydrated` / `onHydrate` / `onFinishHydration`；
- 监听器时序错误（finish 在成功前触发、失败路径误触发 finish）；
- unsubscribe 无效；
- 并发 rehydrate 时 finish 回调次数/参数不对。

问题现场自身：上述专属用例已删除，**回归用例应通过**。

### 4.4 剥离范围外应保持的行为

- 默认同步/异步 hydrate 读写
- migrate / version 写回
- merge / partialize / onRehydrateStorage
- setOptions 动态替换 storage / partialize
- clearStorage
- 手动 `rehydrate()`（在非 skip 场景下重复调用）
- 无 storage 时的 warn 降级路径

### 4.5 避免提示性残留的注意事项

- 禁止留下 `// TODO implement skipHydration`、`not implemented`、空函数抛错带功能名等；
- 不要在注释中写「原先这里会通知 onHydrate」；
- 文档示例若仍出现 `skipHydration`，模型可直接对照实现——必须清洗；
- `task.md` 不得出现仓库 URL、commit SHA、「还原/剥离/删除」等表述。

---

## 5. 测试分层

| 层级 | 内容 | 可见性 |
|---|---|---|
| 公开测试 | 基础 skipHydration + 手动 rehydrate；hasHydrated 翻转；简单 onHydrate/onFinishHydration | 可随题提供精简版，或不提供（仅命令） |
| 隐藏测试 | 完整对照基准提交的 sync/async 用例、并发、失败路径、unsubscribe、与 onRehydrateStorage 交互 | 仅评测方 |
| 类型测试 | PersistOptions.skipHydration；persist API 签名 | 隐藏 + `pnpm test:types` |
| 回归测试 | migrate / merge / partialize / setOptions / clearStorage 等 | 公开+隐藏 |

---

## 6. 环境准备

```bash
cd zustand-persist-skip-hydration-lifecycle-repo   # 或 coding-judge/.../repo
pnpm install
```

Node.js 18+；包管理器 pnpm（与仓库 lockfile 一致）。

---

## 7. 推荐执行命令

```bash
pnpm test:spec
pnpm test:types
# 聚焦
pnpm test:spec -- tests/persistSync.test.tsx tests/persistAsync.test.tsx tests/middlewareTypes.test.tsx
```

---

## 8. 公开测试设计

可用精简断言（伪代码），不暴露完整原测结构：

```ts
// skipHydration：创建后 storage 中的值尚未合并进 state
const useStore = create(persist(() => ({ count: 0 }), {
  name: 't',
  skipHydration: true,
  storage: syncStorageWith({ count: 7 }),
}))
expect(useStore.getState().count).toBe(0)
expect(useStore.persist.hasHydrated()).toBe(false)
await useStore.persist.rehydrate()
expect(useStore.getState().count).toBe(7)
expect(useStore.persist.hasHydrated()).toBe(true)

// 默认仍自动 hydrate
const useStore2 = create(persist(() => ({ count: 0 }), {
  name: 't2',
  storage: syncStorageWith({ count: 3 }),
}))
expect(useStore2.getState().count).toBe(3)
expect(useStore2.persist.hasHydrated()).toBe(true)
```

---

## 9. 隐藏测试设计（应对齐基准提交完整行为）

直接以基准提交下下列原测为 oracle（评测时把完整测试文件挂回或 diff 对照）：

**persistSync.test.tsx**

- `can hydrate manually if skipHydration is enabled`（或同名/等价用例）
- `can call rehydrate through the api` 与 `hasHydrated` 组合
- `can subscribe to onHydrate and onFinishHydration`（含 unsubscribe 后不再触发）

**persistAsync.test.tsx**

- 异步版 skipHydration / hasHydrated / onHydrate / onFinishHydration
- `should handle multiple concurrent rehydrate calls (only last one wins)`（onFinishHydration 仅 1 次，参数为最后一次 state）

补充隐藏边界（扩展验收须标注；下列均属基准行为，非扩展）：

1. hydrate 开始时 `hasHydrated()` 变为 false（例如在已 hydrated 后再次 `rehydrate()`）。
2. `onHydrate` 参数在首次 hydrate 时为初始 config state（`get() ?? configResult`）。
3. storage.getItem 抛错 / reject：不触发 `onFinishHydration`；`hasHydrated()` 仍为 false。
4. 多个 listener 均被调用；部分 unsubscribe 不影响其余。

---

## 10. 类型测试设计

```ts
expectTypeOf(useStore.persist.hasHydrated).toEqualTypeOf<() => boolean>()
expectTypeOf(useStore.persist.onHydrate).parameters.toEqualTypeOf<
  [(state: State) => void]
>()
// onFinishHydration 同理；返回 () => void
// PersistOptions 允许 skipHydration?: boolean
```

`pnpm test:types` 必须通过；错误实现若删错其它 PersistOptions 字段导致大面积类型失败，按回归失败扣分。

---

## 11. 回归测试范围（剥离范围外不得破坏）

- version / migrate（含缺失 migrate、migrate 抛错、异步 migrate）
- merge / partialize / onRehydrateStorage
- setOptions / clearStorage / getOptions
- createJSONStorage（含 custom reviver）
- 无 storage 降级 warn
- 其它 middleware 与基础 create/subscribe 测试

---

## 12. 代码审查检查点

- 是否在 `skipHydration: true` 时完全跳过**初始化** hydrate，而非「hydrate 后立刻清空」；
- `hasHydrated` 是否在每次 hydrate 开始复位为 false；
- listener 是否使用 Set 并正确 unsubscribe（避免泄漏与重复调用）；
- 异步竞态是否仍依赖（或正确重做）`hydrationVersion`，避免过期 `onFinishHydration`；
- 失败路径是否误把 `hasHydrated` 设为 true；
- 类型是否挂在 `StorePersist` / `PersistOptions` 上，而非 any 逃逸；
- 是否破坏 `onRehydrateStorage` 双阶段回调语义。

---

## 13. 推荐评分标准

| 档位 | 条件 | 建议分 |
|---|---|---|
| 优秀 | 隐藏测 + 类型 + 回归全过；竞态与失败路径正确 | 90–100 |
| 良好 | 公开/主路径通过；偶发边界（unsubscribe 或失败路径）有瑕疵 | 75–89 |
| 及格 | skipHydration + hasHydrated + 基本 listener 正确；async 竞态不完整 | 60–74 |
| 不及格 | 自动/手动 hydrate 门闩错误，或严重回归 migrate/merge | <60 |

---

## 14. 失败判定条件

出现以下任一情况判定未通过：

- `skipHydration: true` 仍自动合并 storage；
- 缺少三个 persist API 或类型无法通过 `test:types`；
- 并发 rehydrate 下旧结果覆盖新状态，或 `onFinishHydration` 触发多次；
- 回归用例（migrate / merge / partialize 等）大面积失败；
- 仅改测试或文档「假装通过」，未实现运行时。

---

## 15. 测试组织建议

```text
evaluation/
  public/          # 可选精简用例
  hidden/          # 从基准提交恢复的 persistSync/Async 相关用例
  regression/      # 全量 pnpm test:spec 中非本功能用例
```

评测方最简做法：在候选提交上直接替换回基准版 `tests/persistSync.test.tsx`、`tests/persistAsync.test.tsx`、`tests/middlewareTypes.test.tsx`（或 cherry-pick 相关 it 块），再跑全量。

---

## 16. 最小测试集建议

1. sync：`skipHydration: true` → 手动 rehydrate → state 与 `hasHydrated`
2. sync：默认自动 hydrate → `hasHydrated === true`
3. sync：onHydrate / onFinishHydration + unsubscribe
4. async：同上
5. async：三连并发 rehydrate，finish 仅一次且 state 正确
6. `pnpm test:types`
7. 至少 1 条 migrate 回归 + 1 条 partialize 回归

---

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文
- 仓库 URL、基准 commit / tag
- 「功能曾被删除/剥离」及具体删改文件清单
- 隐藏测试完整源码与断言细节
- 原实现关键代码片段（尤其 `hydrationListeners` / `if (!options.skipHydration)` 结构）
- 评分细则与失败判定原文
- 问题现场构造步骤

`task.md` 仅描述自然需求与 `pnpm test:spec` / `pnpm test:types`。
