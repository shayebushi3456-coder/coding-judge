# qiankun 沙箱 / 预加载 / 样式隔离 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在 qiankun 问题现场中恢复以下真实能力，且不破坏 ProxySandbox 主路径与其它 patchers：

1. 子应用资源预加载策略（`doPrefetchStrategy` / `prefetchImmediately`，含 idle / 网络条件）
2. Legacy（宽松）沙箱的全局变量记录与 active/inactive 还原
3. ProxySandbox 白名单全局变量同步写入真实 `window`，以及 inactive 时描述符还原
4. 实验性样式隔离（`ScopedCSS` 选择器重写与 `process` 接线）

预期有效实现改动量约 **200～500 行**（多功能合计）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/umijs/qiankun
- 基准提交：`393df3d1573d906e96dbc8182afe73fe07a478f3`（tag `v2.10.16`）
- 包管理：yarn
- 验证命令：`yarn test`

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| Prefetch | `src/prefetch.ts`；`src/apis.ts` 的 `start` 调用 `doPrefetchStrategy`；`src/index.ts` 导出 `prefetchApps` | 仓库无独立单测；隐藏集需自建或对照基准行为手工断言 |
| LegacySandbox | `src/sandbox/legacy/sandbox.ts`；由 `createSandboxContainer(..., useLooseSandbox=true)` 选用 | `src/sandbox/legacy/__tests__/sandbox.test.ts`（问题现场已删） |
| ProxySandbox 白名单 | `src/sandbox/proxySandbox.ts` 中 `globalVariableWhiteList` / `globalWhitelistPrevDescriptor` 同步与还原 | `src/sandbox/__tests__/proxySandbox.test.ts` 中 `variables in whitelist`（问题现场已删） |
| ScopedCSS | `src/sandbox/patchers/css.ts`；`loader.ts` / `dynamicAppend` 调用 `css.process` | `src/sandbox/patchers/__tests__/css.test.ts`（问题现场已删） |

### 3.2 功能边界与复杂度

- Prefetch：`requestIdleCallback`（含 MessageChannel / setTimeout shim）、慢网/离线跳过、`true` / `'all'` / 名称数组 / 自定义函数策略分支。
- LegacySandbox：新增/修改属性 Map 记录、`active` 恢复、`inactive` 还原/删除、`defineProperty` 陷阱与 `rebindTarget2Fn`。
- Proxy 白名单：`System` / `__cjsWrapper` / 开发态 hook 等写入真实全局，inactive 按先前 descriptor 还原或删除。
- ScopedCSS：STYLE/MEDIA/SUPPORTS 规则重写、html/body/:root、分组选择器、MutationObserver 空 style 场景。

涉及运行时行为、公开 API、跨模块协作（start ↔ prefetch；sandbox container ↔ legacy/proxy；loader/dynamicAppend ↔ css）。

### 3.3 与基准提交的行为对照要点

- `prefetch: true` 在 `single-spa:first-mount` 后预取未加载应用；`'all'` 立即预取；数组按名；函数返回 critical/minor 分流。
- 离线或慢网（saveData / 非 wifi·ethernet 的 2g/3g）不发起 `importEntry`。
- Legacy：`proxy.prop` / `Object.defineProperty(proxy, ...)` 写入会污染 `window`，`inactive` 后应清除或还原。
- Proxy 白名单：写 `__REACT_ERROR_OVERLAY_GLOBAL_HOOK__` / `System` 应落到真实 `window`，inactive 还原。
- ScopedCSS：普通选择器加 `div[data-qiankun="app"]` 前缀；`html`/`body`/`@media`/`@supports` 行为对齐基准 css 测试。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **`src/prefetch.ts`**：保留 `prefetchImmediately` / `doPrefetchStrategy` 导出签名，实现退化为空操作；删除 idle shim、慢网判断、`prefetch` / `prefetchAfterFirstMounted` 与策略分支。
2. **`src/sandbox/legacy/sandbox.ts`**：保留 `LegacySandbox` 类与 `SandBox` 接口字段；去掉 added/modified/current Map 与还原逻辑；Proxy 退化为直接读写 `rawWindow` 的薄代理（不追踪、inactive 不清理）。
3. **`src/sandbox/proxySandbox.ts`**：删除 `globalVariableWhiteList` 及相关 set/get/inactive 同步还原；保留 `createFakeWindow`、常规 set/get、`registerRunningApp` 等主路径。
4. **`src/sandbox/patchers/css.ts`**：保留 `ScopedCSS` 构造与 `QiankunCSSRewriteAttr` / `process` 导出；`process` / `ScopedCSS.process` 不再改写选择器（空实现）；删除 rewrite/ruleStyle/ruleMedia/ruleSupport。
5. **删除专属测试**：
   - `src/sandbox/patchers/__tests__/css.test.ts`
   - `src/sandbox/legacy/__tests__/sandbox.test.ts`
   - `proxySandbox.test.ts` 中 `describe('variables in whitelist')` 整块
6. **保留**：`ProxySandbox` 主体、`SnapshotSandbox`、`createSandboxContainer` 生命周期、dynamicAppend / interval 等其它 patchers、`registerMicroApps` / `loadMicroApp` / `start` 接线骨架。

### 4.2 建议保留的公开 API / 类型 / 接线

- `prefetchApps` / `doPrefetchStrategy` / `PrefetchStrategy` 类型与 `start({ prefetch })` 调用点仍存在；
- `LegacySandbox` / `ProxySandbox` / `SandBoxType` 仍可实例化；
- `css.process` / `QiankunCSSRewriteAttr` 仍被 loader 与 dynamicAppend 引用；
- 不删除 sandbox 容器 mount/unmount 骨架。

### 4.3 剥离后预期失败范围

- 恢复后的隐藏集：prefetch 行为断言、legacy sandbox 测试、whitelist 测试、css.test.ts 失败（问题现场中已移除这些用例，故本地 `yarn test` 应尽量绿）；
- 问题现场保留的 ProxySandbox 主测、utils、globalState、interval、dynamicAppend 等应继续通过。

### 4.4 剥离范围外应保持的行为

- ProxySandbox 非白名单属性隔离、document/eval/top/parent、`hasOwnProperty`、speedy 相关用例；
- SnapshotSandbox、addons、globalState、loader 主流程（在样式重写缺失时仍能挂载，只是隔离失效）。

### 4.5 避免提示性残留的注意事项

- 禁止 `TODO` / `not implemented` / `was removed` 注释；
- 空壳静默 no-op，不要抛「未实现」；
- 题面不得提及剥离或还原。

## 5. 测试分层

1. 公开：问题现场保留的 unit 测试（ProxySandbox 主路径、utils、globalState、interval、dynamicAppend 等）
2. 隐藏：基准提交中被删的 css / legacy / whitelist specs + 自建 prefetch 行为用例
3. 类型：可选，对 `PrefetchStrategy` / `SandBox` / 导出符号做编译检查
4. 回归：非剥离范围的 sandbox / apis 单测

## 6. 环境准备

```bash
yarn install
```

## 7. 推荐执行命令

```bash
yarn test
# 隐藏集示例（对照基准提交检出被删文件后）：
yarn test src/sandbox/patchers/__tests__/css.test.ts
yarn test src/sandbox/legacy/__tests__/sandbox.test.ts
yarn test src/sandbox/__tests__/proxySandbox.test.ts -t whitelist
```

## 8. 公开测试设计

保留问题现场内现有 Jest 用例作回归；可不额外增加公开冒烟。被测模型可用 `yarn test` 自验。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

从基准提交恢复并执行：

1. `src/sandbox/patchers/__tests__/css.test.ts` 全量
2. `src/sandbox/legacy/__tests__/sandbox.test.ts`
3. `proxySandbox.test.ts` 中 whitelist 相关用例
4. 自建 prefetch 隐藏用例（建议）：
   - mock `navigator.onLine` / `connection`，断言慢网不调用 `import-html-entry`
   - `doPrefetchStrategy(apps, true)` 监听 `single-spa:first-mount` 后触发预取
   - `doPrefetchStrategy(apps, 'all')` 立即预取
   - 数组策略只预取名单内应用
   - 函数策略 critical 立即、minor 挂载后

Oracle：行为对齐基准提交 `393df3d1573d906e96dbc8182afe73fe07a478f3`。

## 10. 类型测试设计

- `yarn build` 或 `tsc` 确保导出 `prefetchApps`、`LegacySandbox` 构造、`css.process` 签名仍兼容；
- `PrefetchStrategy` 联合类型仍可赋值给 `start` 配置。

## 11. 回归测试范围（剥离范围外不得破坏）

- `src/sandbox/__tests__/proxySandbox.test.ts`（除 whitelist）
- `src/sandbox/__tests__/proxySandbox.speedy.test.ts`
- `src/sandbox/__tests__/common.test.ts`
- `src/sandbox/patchers/__tests__/interval.test.ts`
- `src/sandbox/patchers/dynamicAppend/__tests__/*`
- `src/__tests__/utils.test.ts`、`globalState.test.ts`

## 12. 代码审查检查点

- Prefetch 是否使用空闲回调且慢网短路；
- Legacy 是否正确区分新增 vs 修改并在 inactive 还原；
- Proxy 白名单是否写真实 window 且 inactive 按 descriptor 还原；
- ScopedCSS 是否覆盖分组选择器与 `@media`/`@supports`；
- 是否误改 ProxySandbox 非白名单主路径或破坏 `createSandboxContainer`。

## 13. 推荐评分标准

| 档位 | 条件 |
|---|---|
| 优秀 | 四块能力均对齐基准；隐藏测试全过；回归全过 |
| 良好 | 三块核心（prefetch + legacy 或 whitelist + css）正确；少量边界失败 |
| 及格 | 至少两块可观察行为正确；回归无明显破坏 |
| 不及格 | 仅空壳或破坏主沙箱；隐藏测试大面积失败 |

## 14. 失败判定条件

- 回归测试（非剥离范围）失败；
- 题面要求的预加载 / 宽松沙箱还原 / 白名单同步 / 样式前缀任一主路径完全缺失；
- 引入 `TODO`/`not implemented` 或明显占位抛错；
- 仅文档修改无运行时实现。

## 15. 测试组织建议

- 公开集随问题现场仓库提交；
- 隐藏集由评测方从基准 tag 检出被删测试 + 自建 prefetch 用例，不发给被测模型。

## 16. 最小测试集建议

1. css.test.ts 中若干选择器重写用例
2. legacy sandbox defineProperty + inactive 还原
3. whitelist 还原 primitive / descriptor
4. prefetch：`true` 与 `'all'` 两条路径 + 慢网短路

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文及问题现场构造细节；
- 基准提交 SHA、上游仓库 URL（仅评测方使用）；
- 被删测试文件内容与隐藏 prefetch 断言细节；
- 「功能曾被剥离/删除」等元信息；
- 原实现算法级伪代码（超出行为对照以外的逐步还原指引）。
