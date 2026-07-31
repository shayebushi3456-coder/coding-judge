# axios interceptors / CancelToken / FormData 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在「多项能力已退化」的 axios 问题现场代码库上，重新实现并接好以下真实功能，且不破坏核心请求链路：

1. Request / Response Interceptors（含同步/异步链、`runWhen`、`eject`/`clear`）
2. `CancelToken` 取消机制（含 `source`、订阅、`toAbortSignal`、与 adapter/`dispatchRequest` 协作）
3. `toFormData` / `formToJSON`（`formDataToJSON`）对象与 FormData 双向转换及序列化选项

隐藏测试以基准提交完整行为为 oracle。预期被测模型有效实现改动量约 **300～500 行**（多功能合计）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/axios/axios
- 基准提交：`b2cb45d5a533a5465c99559b16987e4d5fc08cbc`（tag `v1.7.9`）
- 包管理：npm
- 主要验证命令：
  - `npm run test:mocha`（单元）
  - 完整：`npm test`（含 eslint / karma / dtslint，评测环境可选）

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| Interceptors | `lib/core/InterceptorManager.js`；`lib/core/Axios.js` 中 request/response 链组装 | `test/specs/interceptors.spec.js` |
| CancelToken | `lib/cancel/CancelToken.js`；`lib/cancel/CanceledError.js`；`lib/cancel/isCancel.js`；`lib/core/dispatchRequest.js`；`lib/adapters/{xhr,http,fetch}.js` | `test/specs/cancel.spec.js`；`test/specs/cancel/CancelToken.spec.js` |
| FormData 工具 | `lib/helpers/toFormData.js`；`lib/helpers/formDataToJSON.js`；`lib/defaults/index.js` transformRequest；`lib/axios.js` 导出 | `test/specs/helpers/toFormData.spec.js`；`test/specs/helpers/formDataToJSON.spec.js`；`test/specs/formdata.spec.js` |

### 3.2 功能边界与复杂度

- Interceptors：handler 栈、异步 promise 链与同步短路路径、`synchronous` / `runWhen`、eject 后 forEach 跳过 null。
- CancelToken：executor、reason、listener、`source()`、与 AbortController 桥接；适配器侧 subscribe/unsubscribe。
- toFormData：嵌套访问、括号/点号 key、Blob/Buffer/Date、circular 检测、indexes/dots/metaTokens/visitor。
- formDataToJSON：解析 `foo[bar][0]` 路径并重建对象/数组。

涉及运行时行为、公开 API/类型、跨模块接线（Axios ↔ adapters ↔ helpers），满足复杂题标准。

### 3.3 与基准提交的行为对照要点

- 无拦截器时行为与直接 `dispatchRequest` 一致；有拦截器时顺序为 request（后注册先执行）→ dispatch → response（先注册先执行）。
- cancel 后 promise reject 为 `CanceledError`，`axios.isCancel(err) === true`。
- `toFormData({a:{b:1}})` 等用例与基准测试断言一致；`formToJSON` 对 bracket key 还原一致。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **InterceptorManager**：保留类与 `use`/`eject`/`clear`/`forEach` 方法壳，但 `handlers` 不再生效——`use` 可记 id，`forEach` 不回调；或更干净：`Axios._request` 去掉 interceptor 链，直接 `return dispatchRequest.call(this, config)`（在 merge/校验之后）。推荐后者 + Manager 空壳，避免残留链逻辑提示。
2. **CancelToken**：删除真实取消语义，改为最小壳：构造时仍要求 executor 为函数并调用之，但 `promise`/`subscribe`/`unsubscribe`/`throwIfRequested`/`toAbortSignal`/`source` 不触发取消（或 toAbortSignal 返回永不 abort 的 signal）。**保留** adapters / `dispatchRequest` 中对 `cancelToken` 的调用点，这样壳 API 形状正确但功能失效。
3. **toFormData**：替换为仅遍历一层可枚举自有属性并 `append` 字符串化值的退化实现；删除嵌套、数组 indexes、Date/Blob、circular、visitor 等逻辑。
4. **formDataToJSON**：退化为对 `entries()` 做扁平 `obj[name]=value` 赋值，不解析 bracket 路径。
5. **删除专属测试**（避免问题现场一跑全红）：
   - `test/specs/interceptors.spec.js`
   - `test/specs/cancel.spec.js`
   - `test/specs/cancel/CancelToken.spec.js`
   - `test/specs/helpers/toFormData.spec.js`
   - `test/specs/helpers/formDataToJSON.spec.js`
6. 不删除 `CanceledError` / `isCancel` 基础类型（取消错误类型仍存在，便于 CancelToken 恢复时复用）；不删除 adapter 骨架。

### 4.2 建议保留的公开 API / 类型 / 接线

- `instance.interceptors.request|response` 对象仍存在；
- `axios.CancelToken` / `axios.isCancel` / `axios.CanceledError` / `axios.toFormData` / `axios.formToJSON` 仍导出；
- `index.d.ts` 中相关类型定义保留（作为自然 API 契约，不额外加注释）；
- `defaults.transformRequest` 仍调用 `toFormData` / `formDataToJSON`（退化实现下仅简单对象可用）。

### 4.3 剥离后预期失败范围

- 上述已删除的专属测试在隐藏集中应失败（功能未实现时）；
- 依赖嵌套 FormData / 拦截器改 header / CancelToken 取消的集成用例失败；
- 基础 `api` / `headers` / 简单 request 用例应尽量继续通过。

### 4.4 剥离范围外应保持的行为

- 实例创建、`get/post/...` 别名、`mergeConfig`、`AxiosHeaders`、基础 adapter 发请求；
- `AxiosError`、HTTP 状态码辅助、非 FormData 的 JSON transform。

### 4.5 避免提示性残留的注意事项

- 禁止留下 `TODO`、`not implemented`、`FIXME`、`was removed` 等注释；
- 不要在题面或源码中写「还原拦截器/取消」；
- 空壳方法保持静默无行为，不要 `throw new Error('not implemented')`；
- 不要在 README 中描述本次挖空。

## 5. 测试分层

1. **公开测试**：问题现场保留的 mocha 单测（回归骨架）。
2. **隐藏测试**：基准提交中被删除的专属 specs + 评测方补充集成用例。
3. **类型检查**（可选）：`npm run test:dtslint` 或对 `CancelToken` / interceptor / `toFormData` 签名的独立 dts 片段。
4. **回归测试**：未剥离模块相关 specs。

## 6. 环境准备

```bash
npm ci
# 或 npm install
```

Node 版本建议与 axios CI 接近（18+）。

## 7. 推荐执行命令

```bash
npm run test:mocha
# 隐藏集评测时可单独跑：
npx mocha test/specs/interceptors.spec.js test/specs/cancel.spec.js test/specs/cancel/CancelToken.spec.js test/specs/helpers/toFormData.spec.js test/specs/helpers/formDataToJSON.spec.js --timeout 30000 --exit
```

## 8. 公开测试设计

- 使用问题现场保留的 `test/unit/**` 与非剥离 specs，确认基础请求与工具仍可用。
- 公开侧可给 1～2 个极简冒烟（可选，勿泄露完整边界）：例如「能 `use` 一个 request interceptor 且不抛错」，但不覆盖同步链/runWhen/嵌套 FormData。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

直接采用基准提交中的原文件作为 oracle（评测时挂回或从 oracle 仓库执行）：

1. `test/specs/interceptors.spec.js` — 全量拦截器行为
2. `test/specs/cancel.spec.js` + `test/specs/cancel/CancelToken.spec.js` — 取消
3. `test/specs/helpers/toFormData.spec.js` + `test/specs/helpers/formDataToJSON.spec.js` — 表单序列化

补充集成（若时间允许）：

- request interceptor 修改 header 后真实发出；
- `CancelToken.source().cancel()` 中止 xhr/http 请求；
- `post` + `multipart/form-data` + 嵌套对象 body，断言 adapter 收到 FormData 字段。

## 10. 类型测试设计

- `axios.interceptors.request.use` 参数与返回 id；
- `CancelToken.source()` 返回 `{ token, cancel }`；
- `toFormData` / `formToJSON` 与 `index.d.ts` 一致。

## 11. 回归测试范围（剥离范围外不得破坏）

- `test/specs/api.spec.js`、`headers.spec.js`、`instance.spec.js`、`defaults.spec.js`、`promise.spec.js` 等；
- `test/unit/core/**`、`test/unit/utils/**`。

## 12. 代码审查检查点

- 拦截器顺序与同步/异步分支是否与基准一致；
- CancelToken 与 `signal` 并存时是否都生效；
- toFormData circular reference 是否抛错；
- 是否误改 `mergeConfig` / adapter 主流程；
- 是否通过硬编码抄袭基准而留下无关大段注释（评分可降但不作唯一标准）。

## 13. 推荐评分标准

| 维度 | 权重 | 说明 |
|---|---|---|
| Interceptors 正确性 | 30% | 隐藏 interceptors specs |
| CancelToken 正确性 | 25% | cancel 相关 specs + 适配器取消 |
| FormData 工具 | 25% | toFormData / formDataToJSON specs |
| 回归未破坏 | 15% | 公开/回归 specs |
| 代码质量 | 5% | 无提示性 hack、结构合理 |

建议：隐藏测试通过率 ≥ 90% 且回归无新增失败 → 合格；三项功能均有实质实现且通过率 ≥ 70% → 部分分。

## 14. 失败判定条件

- 仅实现空壳或只改测试骗过公开集；
- 破坏默认导出 / 实例创建导致大面积回归；
- 依赖网络外服务或改 CI 跳过隐藏测试；
- 题面要求的能力完全缺失。

## 15. 测试组织建议

- oracle 仓：基准 commit 只读副本；
- 问题现场仓：本任务 `repo/`；
- 评测脚本：将隐藏 specs 从 oracle 拷入临时目录或对实现跑 oracle 测试（注意相对 import）。

## 16. 最小测试集建议

1. interceptors：异步 request+response 各一，验证变换生效；
2. CancelToken.source 取消；
3. toFormData 嵌套对象 + formDataToJSON bracket key。

## 17. 不得泄露给被测模型的内容清单

- 本文件全部内容；
- 基准 commit SHA / 上游仓库 URL（题面已禁止）；
- 「功能被剥离/挖空」的元叙述；
- 隐藏测试完整断言与文件路径清单；
- 问题现场具体删改了哪些函数体的说明；
- 参考实现或伪代码级还原步骤。
