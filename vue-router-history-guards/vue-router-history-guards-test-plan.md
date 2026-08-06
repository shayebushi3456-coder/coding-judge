# vue-router history / navigation guards 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在问题现场中恢复 Vue Router 的：

1. **History 实现**：`createWebHistory`、`createWebHashHistory`、`createMemoryHistory`
2. **导航守卫运行时**：`onBeforeRouteLeave` / `onBeforeRouteUpdate`、`guardToPromiseFn`、`extractComponentsGuards`、`loadRouteLocation`

预期有效实现净恢复量约 **850～950 行**，集中在 **4 个文件**（符合「复杂 / 500–1000 行 / 3–5 文件」）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/vuejs/router
- 基准提交：`2d0a79def756db3284fc848098d6fec81ac893a4`（tag `vue-router@4.5.0` / `v4.5.0`）
- 包管理：pnpm（workspace）
- 验证命令：`cd packages/router && pnpm test:unit`（或仓库根目录等价脚本）

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 路径 | 行数约 | 相关测试 |
|---|---|---|---|
| HTML5 history | `packages/router/src/history/html5.ts` | 353 | `__tests__/history/html5.spec.ts` |
| Hash history | `packages/router/src/history/hash.ts` | 46 | `__tests__/history/hash.spec.ts`；`hash-manual-navigation.spec.ts` |
| Memory history | `packages/router/src/history/memory.ts` | 117 | `__tests__/history/memory.spec.ts` |
| Navigation guards 运行时 | `packages/router/src/navigationGuards.ts` | 395 | `__tests__/guards/**` |
| 类型/公共 | `history/common.ts`（**保留**） | 185 | — |
| 公开导出 | `packages/router/src/index.ts`（**保留接线**） | — | — |

合计剥离源码 ≈ **911 行 / 4 文件**。

### 3.2 功能边界与复杂度

**History**

- `createWebHistory`：`pushState`/`replaceState`、`popstate`、listeners、pause、base、`createHref`、scroll state、delta/direction
- `createWebHashHistory`：规范化带 `#` 的 base，委托 `createWebHistory`
- `createMemoryHistory`：队列式位置栈、SSR START 位置、`go`/`listen`、测试用 `changeURL`

**Guards**

- `onBeforeRouteLeave` / `onBeforeRouteUpdate`：inject `matchedRouteKey`，与 activated/deactivated 生命周期同步注册
- `guardToPromiseFn`：`next` 回调、返回 false/RouteLocation/Error、Promise、重定向错误
- `extractComponentsGuards`：enter/update/leave 与异步组件、别名实例
- `loadRouteLocation`：解析 matched 中的异步组件

涉及运行时行为、Vue 组合式 API 接线、跨模块（router.ts ↔ guards ↔ history）。

### 3.3 与基准提交的行为对照要点

- 三种 history 的 `push`/`replace`/`go`/`listen`/`destroy` 语义与基准单测一致
- hash base 缺 `#` 时自动补上；无 host（file://）时忽略自定义 base 路径规则与基准一致
- memory 初始 `START`，中间 `go` 截断 forward 栈
- `guardToPromiseFn` 对 `next()` / `next(false)` / `next(error)` / `next('/')` / 返回值 的 Promise 化与基准一致
- `extractComponentsGuards` + `beforeRouteEnter` 回调注入与基准 guards 套件一致

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. 将 `html5.ts` / `hash.ts` / `memory.ts` / `navigationGuards.ts` 退化为保留导出符号的最小壳（无真实行为），禁止 `TODO`/`not implemented` 注释。
2. 删除问题现场中的专属测试目录/文件，避免 oracle 泄露：
   - `packages/router/__tests__/history/`
   - `packages/router/__tests__/guards/`
   - `packages/router/__tests__/hash-manual-navigation.spec.ts`（若强依赖 hash history）
3. 删除 `packages/router/dist/`（及根 dist）中可能内嵌完整实现的构建产物。
4. 可选：弱化文档中可照抄的 history/guards 大段示例。

### 4.2 建议保留

- `history/common.ts`（`RouterHistory` 类型、`normalizeBase`、`createHref`、`START` 等）
- `router.ts`、matcher、RouterView/RouterLink、scrollBehavior、errors
- `index.ts` 对上述符号的 export 语句（仍指向被挖空模块）
- 与 guards/history 无关的单测（matcher、location、RouterView 等）

### 4.3 剥离后预期失败

- 一切依赖真实 history 导航或守卫流水线的用例
- 隐藏侧重新挂载的 `history/*`、`guards/*` 基准测试应大量失败直至实现恢复

### 4.4 范围外应保持

- matcher 解析与排序
- `createRouter` 骨架可实例化（即便导航能力残缺）
- parseQuery / stringifyQuery / encoding 等工具单测

### 4.5 避免提示性残留

- stub 无「已删除」「请实现」字样
- 不保留大段注释掉的原实现
- `task.md` 不出现仓库 URL、commit、文件清单、还原措辞

### 4.6 Stub 形态建议

- `createWebHistory` / `createMemoryHistory` / `createWebHashHistory`：返回满足 `RouterHistory` 形状的空操作对象（push/replace/go/listen no-op），保证 import 不炸
- guards：导出同名函数；`guardToPromiseFn` 返回立即 resolve 的空 Promise 或恒真；`extractComponentsGuards` 返回 `[]`；`loadRouteLocation` 原样返回 location——行为错误但类型/导出完整

## 5. 测试分层

| 层级 | 内容 | 可见性 |
|---|---|---|
| 公开 | `pnpm test:unit`（问题现场已删专属用例，部分仍可跑） | 模型可见命令 |
| 隐藏 | 基准 `history/*.spec.ts` + `guards/**` | 评测方 |
| 回归 | matcher、RouterView、encoding、location | 评测方 |

## 6. 环境准备

```bash
git clone https://github.com/vuejs/router.git
cd router
git checkout 2d0a79def756db3284fc848098d6fec81ac893a4
pnpm install
```

## 7. 推荐执行命令

```bash
pnpm --filter vue-router test:unit
# 或
cd packages/router && pnpm test:unit
```

隐藏：将基准测试文件挂回后只跑 history + guards。

## 8. 公开测试设计

不在题面给用例结构。公开仅要求能安装依赖并运行单元测试命令；评测方观察非剥离模块回归。

## 9. 隐藏测试设计（对齐基准）

### 9.1 History

1. html5：push/replace 改 URL 与 state；listen 收到 pop；base；createHref
2. hash：base 自动含 `#`；导航后 hash 段正确
3. memory：START；push 截断；go 正负 delta；listen

### 9.2 Guards

1. `guardToPromiseFn`：next 三态、返回 false/redirect、抛错、异步
2. `beforeEach`/`beforeEnter`/`beforeResolve`/`afterEach` 与组件内守卫顺序（依赖 extractComponentsGuards）
3. `onBeforeRouteLeave` / `onBeforeRouteUpdate` 注册与卸载
4. `loadRouteLocation` 异步组件
5. `beforeRouteEnter` 回调在实例创建后调用

## 10. 类型测试设计

- `createWebHistory` 等导出类型与 `RouterHistory` 兼容
- `pnpm test:types` / `createRouter.test-d.ts` 等（若存在）作回归

## 11. 回归测试范围

- `__tests__/matcher/**`
- `RouterView.spec.ts` / `RouterLink.spec.ts`（不依赖完整守卫流水线的部分可能仍受影响，需区分）
- `location.spec.ts`、`encoding.spec.ts`、`parseQuery.spec.ts`

## 12. 代码审查检查点

- [ ] hash 正确委托 html5 且 base 规则对齐基准
- [ ] html5 正确处理 popstate / pauseListeners，无泄漏
- [ ] memory 不触碰 window.history
- [ ] guardToPromiseFn 正确区分 redirect 与 failure 错误类型
- [ ] extractComponentsGuards 不漏异步组件与 leave/update/enter
- [ ] 未挖空 common.ts / router 主状态机骨架

## 13. 推荐评分标准

| 维度 | 权重 |
|---|---|
| HTML5 + Hash history | 30% |
| Memory history | 15% |
| guardToPromiseFn + extractComponentsGuards + loadRouteLocation | 35% |
| onBeforeRouteLeave/Update | 10% |
| 回归与代码质量 | 10% |

history 与 guards 两侧均需达到可用水平；只做一侧判定不通过。

## 14. 失败判定条件

- 仅返回空 stub 却声称完成
- 破坏 matcher / createRouter 导出导致工程无法测
- 从 dist 或未删除的测试原文照抄且行为仍不对（仍按行为评分，但审查可扣分）
- 删除大量无关测试冒充通过

## 15. 测试组织建议

```text
coding-judge/vue-router-history-guards/
  vue-router-history-guards.task.md
  vue-router-history-guards-test-plan.md
  repo/
```

隐藏测试自基准 commit 检出 `__tests__/history` 与 `__tests__/guards`。

## 16. 最小测试集建议

1. `history/memory.spec.ts` 全过
2. `history/html5.spec.ts` 核心 push/listen
3. `history/hash.spec.ts` base
4. `guards/guardToPromiseFn.spec.ts`
5. `guards/beforeRouteEnter.spec.ts` 或 `extractComponentsGuards.spec.ts` 各至少一组

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan、剥离步骤、基准 SHA、仓库 URL（题面）
- 完整隐藏用例与原实现 / patch
- 必须修改的文件路径清单
- 「还原被删代码」类表述
