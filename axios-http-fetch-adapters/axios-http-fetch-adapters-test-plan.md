# axios http / fetch adapters 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在问题现场代码库上，重新实现并接好 Axios 的 **Node `http` 适配器**与 **`fetch` 适配器**，使 Node / 现代 runtime 下的真实网络请求行为对齐基准提交，且不破坏：

- 适配器选择器（`lib/adapters/adapters.js`）
- 浏览器 `xhr` 适配器
- 拦截器、CancelToken、核心 `dispatchRequest` / `settle` 主路径

预期有效实现净恢复量约 **700～950 行**，主要集中在 **2 个文件**（`lib/adapters/http.js`、`lib/adapters/fetch.js`），符合「复杂难度 / 改动 500–1000 行 / 2–4 文件」约束。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/axios/axios
- 基准提交：`b2cb45d5a533a5465c99559b16987e4d5fc08cbc`（tag `v1.7.9`）
- 包管理：npm
- 主要验证命令：
  - `npm run test:mocha`（单元，含 Node http / fetch adapter 单测）
  - 可选完整：`npm test`（含 eslint / karma / dtslint）

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试 |
|---|---|---|
| Node HTTP(S) adapter | `lib/adapters/http.js`（含 `setProxy` / `__setProxy`、`wrapAsync`、重定向、解压、流、进度、data URI、lookup 等） | `test/unit/adapters/http.js`（约 2300+ 行） |
| Fetch adapter | `lib/adapters/fetch.js`（能力探测、composeSignals、stream 进度、responseType resolvers） | `test/unit/adapters/fetch.js` |
| 适配器注册 / 选择 | `lib/adapters/adapters.js`（**保留**） | `test/unit/adapters/adapters.js`；`test/specs/adapter.spec.js` |
| XHR adapter | `lib/adapters/xhr.js`（**保留**，回归） | karma / browser 相关 |

基准提交下行数参考：

- `lib/adapters/http.js` ≈ **695** 行
- `lib/adapters/fetch.js` ≈ **229** 行
- 合计 ≈ **924** 行（落在 500–1000；文件数 = 2）

### 3.2 功能边界与复杂度

**http adapter（Node）**

- 仅在 `process` 环境启用（`isHttpAdapterSupported`）
- URL / `buildFullPath` / `buildURL`；http vs https；`follow-redirects`
- `proxy` 配置与 `proxy-from-env`；Basic Proxy-Authorization；`beforeRedirects`
- 请求体：string / Buffer / Stream / Blob / FormData（`formDataToStream`）等
- 响应：status 处理经 `settle`；gzip / deflate / brotli 解压；`responseType`（含 stream）
- 超时、`cancelToken` / `AbortSignal` 取消、上传/下载进度（`progressEventReducer`）
- data URI（`fromDataURI`）、自定义 `lookup` / `family`、`socketPath`、`maxContentLength` / `maxBodyLength`
- 测试导出：`export const __setProxy = setProxy`

**fetch adapter**

- 仅在存在 `fetch` + `Request` + `Response` 时导出函数，否则为 falsy
- `resolveConfig`；`composeSignals([signal, cancelToken.toAbortSignal()], timeout)`
- Request 构造（credentials / duplex / fetchOptions）；upload/download 进度与 `trackStream`
- `responseType` 解析（text / arrayBuffer / blob / formData / stream / response）
- 将 fetch 网络类 `TypeError` 转为 `AxiosError.ERR_NETWORK`

涉及：运行时行为、跨模块协作（helpers ↔ adapters ↔ settle/cancel）、环境能力探测、同步导出表面与异步请求路径。

### 3.3 与基准提交的行为对照要点

- Node 默认适配器链 `['xhr','http','fetch']` 下，无 xhr 时选中可工作的 `http` 适配器。
- `axios.get/post` 对本地 http 测试服务器的行为与基准 `test/unit/adapters/http.js` 一致（重定向、代理、超时、取消、压缩、流等）。
- `adapter: 'fetch'`（或环境仅 fetch）时行为与基准 `test/unit/adapters/fetch.js` 一致。
- `__setProxy(options, proxyConfig, location)` 对 options 的改写与基准一致。
- `xhr` 与 `getAdapter` 未知名 / 全不可用时报错文案保持不变。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

1. **`lib/adapters/http.js`**：删除完整实现；保留「环境探测 + 导出函数表面 + `__setProxy` 符号」，函数体退化为立即以网络错误拒绝（或等价无真实 I/O 的空壳），**不得**留下 `TODO` / `not implemented` /「已删除」注释。
2. **`lib/adapters/fetch.js`**：同上；保留 `isFetchSupported && (async (config) => …)` 形态，内部无真实 `fetch` 发信逻辑。
3. **删除专属单测（避免题面外泄露 oracle）**：
   - 移除问题现场中的 `test/unit/adapters/http.js`
   - 移除问题现场中的 `test/unit/adapters/fetch.js`
4. **可选**：弱化 README 中大段 Node http / fetch adapter 用法示例（若存在可照抄实现的片段），避免提示性残留。

### 4.2 建议保留的公开 API / 类型 / 接线

- 保留 `lib/adapters/adapters.js` 对 `http` / `xhr` / `fetch` 的 import 与 `knownAdapters` 注册。
- 保留 `lib/adapters/xhr.js` 完整实现。
- 保留 `lib/defaults/index.js` 中 `adapter: ['xhr', 'http', 'fetch']`。
- 保留 helpers：`settle`、`buildURL`、`buildFullPath`、`composeSignals`、`trackStream`、`progressEventReducer`、`formDataToStream`、`fromDataURI`、`AxiosTransformStream`、`ZlibHeaderTransformStream` 等（供实现复用，但不要在 stub 里用注释点名「请接回这些」）。
- 保留 `index.d.ts` 中 adapter 相关类型。
- 保留 `__setProxy` 导出名（即使实现为空操作式改写），避免测试导入直接挂掉以外的模块解析失败。

### 4.3 剥离后预期失败范围

- `test/unit/adapters/http.js`（问题现场已删；隐藏测试用基准版跑）
- `test/unit/adapters/fetch.js`（同上）
- 依赖真实 Node 出站请求的集成/回归用例（若仍保留在问题现场）会失败或超时
- 默认在 Node 下发起的真实 HTTP 请求无法成功

### 4.4 剥离范围外应保持的行为

- `test/unit/adapters/adapters.js`：未知 adapter 名、全部不可用时的错误
- 拦截器、CancelToken、AxiosHeaders、mergeConfig、utils、toFormData 等既有单测（不依赖真实 http/fetch I/O 的部分）
- `xhr` 适配器源码完整（浏览器侧）

### 4.5 避免提示性残留的注意事项

- stub 中禁止：`TODO`、`FIXME`、`not implemented`、`restore`、`stripped`、大段原实现注释掉的尸体
- 不要在 stub 旁保留「原 setProxy 逻辑如下」类注释
- `task.md` 不得出现仓库 URL、commit SHA、文件路径清单、或「被删/还原」表述
- 专属超大单测文件不要留给被测模型

### 4.6 推荐 stub 形态（评测方内部）

`http.js`：保持 `export default isHttpAdapterSupported && function httpAdapter(config) { return Promise.reject(...) }` 与 `export const __setProxy = …`。

`fetch.js`：保持 `export default isFetchSupported && (async (config) => { … reject … })`。

## 5. 测试分层

| 层级 | 目的 | 可见性 |
|---|---|---|
| 公开冒烟 | 安装依赖、模块可加载、`getAdapter` / xhr 回归、基础非网络单测 | 可给模型命令：`npm run test:mocha`（预期部分失败） |
| 隐藏行为 | 对照基准完整 `http.js` / `fetch.js` 行为 | 仅评测方 |
| 类型 / 导出 | `__setProxy` 可导入；default 在支持环境为 function | 评测方 |
| 回归 | adapters 选择器、xhr、interceptors、cancel | 评测方 |

## 6. 环境准备

```bash
git clone https://github.com/axios/axios.git
cd axios
git checkout b2cb45d5a533a5465c99559b16987e4d5fc08cbc
npm ci
```

问题现场：在上述 commit 上按第 4 节剥离后，再 `npm ci`。

隐藏测试 oracle：同 commit 的完整树（未剥离）。

## 7. 推荐执行命令

```bash
# 问题现场 / 候选提交
npm run test:mocha

# 隐藏：在完整基准树或单独挂载基准版 adapter 测试文件后
npx mocha test/unit/adapters/http.js test/unit/adapters/fetch.js --timeout 30000
```

## 8. 公开测试设计

公开层面只要求模型自行用仓库已有命令验证，不在 `task.md` 中贴用例结构。评测方可观察：

- 工程可 `npm ci`
- `lib/adapters/adapters.js` 仍能解析到 http/fetch 导出
- 与网络无关的既有单测不因误改公共模块大面积挂掉

## 9. 隐藏测试设计（应对齐基准提交完整行为）

将基准提交中的下列文件作为 oracle（可直接跑基准版测试文件，但加载的是候选实现）：

### 9.1 HTTP adapter（摘自 `test/unit/adapters/http.js` 类别）

1. 基本 GET/POST JSON；自定义 header；status 校验经 settle
2. 重定向（3xx）跟随与 `maxRedirects` / `beforeRedirect`
3. `proxy` 对象与环境变量代理；`__setProxy` 单元断言
4. gzip / deflate / brotli 响应体解压
5. Stream 请求体与 `responseType: 'stream'`
6. timeout → `ECONNABORTED` / 澄清后的 `ETIMEDOUT`
7. CancelToken / AbortSignal 取消 → `CanceledError`
8. `onUploadProgress` / `onDownloadProgress` 被调用
9. `maxContentLength` / `maxBodyLength` 超限错误
10. data URI 请求
11. 自定义 `lookup` / `family` / `socketPath`（若环境允许）
12. FormData / Blob 请求路径

### 9.2 Fetch adapter（摘自 `test/unit/adapters/fetch.js`）

1. 环境不支持时导出为 falsy；支持时为 function
2. 基本请求与 header / method
3. timeout 与 abort 合成
4. responseType：text / arrayBuffer / blob / stream 等
5. 上传/下载进度（在支持流的环境）
6. fetch TypeError → `AxiosError.ERR_NETWORK`（含 cause）
7. `withCredentials` / credentials 映射
8. `fetchOptions` 透传

### 9.3 对照方式

- 在候选 `repo` 上临时放入基准测试文件（或 CI 侧 mount），执行 mocha；或
- 对关键场景写精简隐藏套件，断言与基准 commit 逐条对齐。

**禁止**把完整隐藏用例或原实现贴进 `task.md`。

## 10. 类型测试设计

- TypeScript 用户侧：`adapter: 'http' | 'fetch'` 仍合法（`index.d.ts` 未改即可）
- 运行时：`typeof adapters.adapters.http === 'function'`（Node）；fetch 视环境
- `import { __setProxy } from './lib/adapters/http.js'` 不抛

可选：`npm run test:dtslint` 作回归（非本题核心）。

## 11. 回归测试范围（剥离范围外不得破坏）

- `test/unit/adapters/adapters.js`
- `test/specs/interceptors.spec.js`
- `test/specs/cancel.spec.js` / `CancelToken`
- `test/specs/headers.spec.js`、`core/*` 等不依赖真实出站 HTTP 的用例
- `lib/adapters/xhr.js` 源码 diff 应为空（或仅无关格式化）

## 12. 代码审查检查点

- [ ] 未把 http/fetch 逻辑塞进 `adapters.js` 选择器导致职责混乱（允许小接线，但主体应在两文件）
- [ ] 正确使用 `settle`，未自造与核心冲突的 status 语义
- [ ] 取消路径取消订阅 / 释放 listener，避免泄漏
- [ ] 压缩与重定向未在不安全默认下关闭校验
- [ ] fetch 适配器在不支持环境保持 falsy，以免污染 `getAdapter` 选择
- [ ] 未引入与基准行为冲突的额外默认 header
- [ ] 无明显提示性注释或大段粘贴后未删的原仓库链接

## 13. 推荐评分标准

| 维度 | 权重 | 说明 |
|---|---|---|
| HTTP adapter 核心正确性 | 40% | 请求/响应/重定向/代理/压缩/超时/取消 |
| HTTP 边界与进度/流 | 15% | 进度、stream、data URI、长度限制、lookup |
| Fetch adapter | 25% | 信号、responseType、进度、错误映射、环境探测 |
| 回归与模块边界 | 10% | xhr / getAdapter / 拦截器 / cancel |
| 代码质量 | 10% | 结构清晰、无明显 hack、导出表面正确 |

分数建议：隐藏 http+fetch 主路径 ≥80% 通过且回归无新增大面积失败 → 通过；仅实现其中一个适配器 → 不通过。

## 14. 失败判定条件

- 仅实现 xhr 包装或假 mock，无真实 Node http/https 或 fetch I/O
- 破坏 `adapters.getAdapter` 或默认 adapter 列表导致无关测试崩盘
- 删除/挖空 `xhr.js` 冒充完成度
- 行为与基准明显不符（例如从不跟随重定向、从不解压、忽略 cancel）
- 为过测试而跳过/删除大量非本题范围断言且未实现能力

## 15. 测试组织建议

```text
coding-judge/axios-http-fetch-adapters/
  axios-http-fetch-adapters.task.md      # 给模型
  axios-http-fetch-adapters-test-plan.md # 仅评测方
  repo/                                  # 问题现场（无 .git）
hidden/ 或 CI 挂载：
  baseline-tests/unit/adapters/http.js
  baseline-tests/unit/adapters/fetch.js
```

## 16. 最小测试集建议

评测时间紧时最少跑：

1. `test/unit/adapters/adapters.js`（回归）
2. 基准 `http.js` 测试中：基本请求、重定向、gzip、timeout、cancel、`__setProxy` 各至少 1 例
3. 基准 `fetch.js` 测试中：基本请求、abort/timeout、一种非 text 的 responseType、ERR_NETWORK 映射

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文与问题现场构造步骤
- 基准 commit SHA、上游 GitHub URL（题面禁止）
- 「从 http.js/fetch.js 删除了约 900 行」等元信息
- 完整隐藏用例与断言细节
- 原 `http.js` / `fetch.js` 参考实现或可应用 patch
- 必须修改的文件清单（题面禁止）
- `__setProxy` / `wrapAsync` / `composeSignals` 等内部符号点名清单（题面仅能用大白话）
