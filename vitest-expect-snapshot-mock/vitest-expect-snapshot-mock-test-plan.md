# Vitest expect.extend / asymmetric / inline snapshot / spy once 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否在问题现场中恢复以下真实能力，且不破坏 Vitest 核心断言与跑测骨架：

1. `expect.extend` 自定义匹配器注册（同步/异步、`not`、非对称形态）
2. 部分 asymmetric matchers：`objectContaining` / `arrayContaining` / `stringMatching` / `closeTo`（含 `expect.not.*`）
3. 内联快照写回：`saveInlineSnapshots` / `replaceInlineSnap`（含对象 shape 参数、已有字面量、空参插入）
4. Spy/mock 辅助：`mockImplementationOnce` 队列、`mockReturnValueOnce` / `mockResolvedValueOnce` / `mockRejectedValueOnce`、`withImplementation`

预期有效实现改动量约 **200～500 行**（packages 源码合计；本次基准剥离约 498 行删除）。

实际操作范围：`packages/expect`、`packages/snapshot`、`packages/spy`（未改动 `packages/vitest` 核心 runner / 配置骨架）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/vitest-dev/vitest
- 基准提交：`d69cc75698dd6dbeaed5c237ebb46ccd41bfb438`（tag `v2.1.8`）
- 包管理：pnpm（`packageManager: pnpm@9.12.3`）
- 默认验证命令：`pnpm test`（等价 `pnpm --filter test-core test:threads`）
- 定向隐藏集建议：对照基准提交恢复后的 `test/core/test/jest-expect.test.ts`、`jest-mock.test.ts`、`mocked.test.ts`、`spy.test.ts`、`expect*.ts`、`test/snapshots` 更新相关用例

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 主要路径 | 相关测试（基准提交） |
|---|---|---|
| expect.extend | `packages/expect/src/jest-extend.ts`；接线 `packages/vitest/src/integrations/chai/index.ts` | `test/core/test/jest-expect.test.ts`（extend 用例）；`expect.test.ts` / `expect-poll.test.ts` / `local-context.test.ts`；`jest-matcher-utils.test.ts`；`test/cli` expect-soft fixture |
| asymmetric（部分） | `packages/expect/src/jest-asymmetric-matchers.ts` 中 `ObjectContaining` / `ArrayContaining` / `StringMatching` / `CloseTo` | `jest-expect.test.ts` asymmetric 相关；`expect.test.ts` equality tester + asymmetric；若干 config/cli 用例 |
| 内联快照写回 | `packages/snapshot/src/port/inlineSnapshot.ts`（`saveInlineSnapshots` / `replaceInlineSnap`）；由 `packages/snapshot/src/port/state.ts` 调用 | `test/snapshots` 更新流；`test/core` 内联快照更新相关 |
| spy once / withImplementation | `packages/spy/src/index.ts`（`enhanceSpy` 内 once 队列与临时实现） | `test/core/test/jest-mock.test.ts`；`mocked.test.ts`（temporary mock implementation）；`spy.test.ts` |

**保留未剥离（骨架与回归）**：`expect.any` / `expect.anything` / `expect.stringContaining`；文件快照主路径；`mockImplementation` / `mockReturnValue` / `mockResolvedValue` / `mockRejectedValue`（非 Once）；`spyOn` / `vi.fn` 基础；`stripSnapshotIndentation` 读取侧。

### 3.2 功能边界与复杂度

- extend：Chai plugin 注册、同步/Promise 结果、`soft`/`poll` 状态透传、自定义匹配器同时挂到 assertion 与 asymmetric（含 `expect.not.*`）。
- asymmetric：原型链属性查找（objectContaining）、子集数组匹配、RegExp/字符串 matching、浮点 precision 与 ±Infinity。
- 内联快照：MagicString 改写、quote/缩进、对象 shape 参数与已有 snapshot 字符串替换、WebKit 列偏移兼容。
- spy：once 队列与默认实现回落、withImplementation 同步/异步回调、与 Once 的优先级。

涉及运行时行为、公开 API/类型表面、跨包协作（expect ↔ snapshot ↔ spy）。

### 3.3 与基准提交的行为对照要点

- `expect.extend({ toX })` 后 `expect().toX` / `expect.toX` / `expect.not.toX` 行为对齐基准。
- `expect.objectContaining` / `arrayContaining` / `stringMatching` / `closeTo` 及 `expect.not.*` 对齐基准（`stringContaining`/`any`/`anything` 本就不该坏）。
- `-u` / 更新模式下内联快照能写回源文件；已有内联内容比对仍依赖完整写回逻辑参与更新路径。
- `mock*Once` 消耗顺序与耗尽后回落；`withImplementation` 结束后恢复，且优先于 Once。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围（已落地）

1. **`jest-extend.ts`**：退化为仅注册空的 `expect.extend`（不挂 matcher、不建 CustomMatcher）。
2. **`jest-asymmetric-matchers.ts`**：保留 `Any` / `Anything` / `StringContaining` 完整实现；将 `ObjectContaining` / `ArrayContaining` / `StringMatching` / `CloseTo` 的 `asymmetricMatch` 退化为恒 `false`（保留导出符号与 `expect.*` 方法名，避免无关编译/导入失败）。
3. **`inlineSnapshot.ts`**：`saveInlineSnapshots` 空实现；`replaceInlineSnap` 恒返回 `false`；保留 `stripSnapshotIndentation`。
4. **`packages/spy/src/index.ts`**：去掉 once 队列与临时实现标志；`mockImplementationOnce` / `mockReturnValueOnce` / `mockResolvedValueOnce` / `mockRejectedValueOnce` 变为无操作；`withImplementation` 仅执行回调不切换实现。保留 `mockImplementation` / `mockReturnValue` / `mockResolvedValue` / `mockRejectedValue`。
5. **删除或改写专属/依赖测试（问题现场）**，避免公开回归被剥离目标拖垮：
   - 删减 `jest-expect.test.ts` 中 extend / 被剥离 asymmetric / 依赖自定义 matcher 的 snapshotError 段，并同步精简 `__snapshots__/jest-expect.test.ts.snap`
   - 删除 `jest-matcher-utils.test.ts`
   - 改写 `expect.test.ts` / `expect-poll.test.ts` / `local-context.test.ts` / `spy.test.ts` / `jest-mock.test.ts` / `mocked.test.ts`
   - CLI expect-soft fixture 去掉 extend 相关用例；少量 config/cli fixture 去掉对已退化 matcher 的依赖

### 4.2 建议保留的公开 API / 类型 / 接线

- `ExpectStatic.extend` 类型与运行时方法名仍存在
- asymmetric 方法名与 class 导出仍存在
- `InlineSnapshot` 类型、`saveInlineSnapshots` / `replaceInlineSnap` 导出签名仍存在
- `MockInstance` 上 Once / `withImplementation` 类型与方法名仍存在
- 不改动 runner、config、Vite 插件主路径

### 4.3 剥离后预期失败范围（相对基准完整测试树）

- extend / 被剥离 asymmetric / Once / withImplementation / 内联快照**更新写回**相关隐藏用例失败
- 问题现场内已移除或改写的对应用例不应再作为公开失败噪声

### 4.4 剥离范围外应保持的行为

- 基础断言（`toBe` / `toEqual` / `toThrow` 常规路径等）
- `stringContaining` / `any` / `anything`
- 文件快照比对（非内联更新写回）
- `vi.fn` / `spyOn` 常驻 `mockImplementation` / `mockReturnValue` / 非 Once 的 resolve/reject
- `pnpm test`（test-core）主体可安装构建并跑通

### 4.5 避免提示性残留的注意事项

- 禁止 `TODO` / `not implemented` / `was removed` 注释
- 空壳静默失败（matcher 不匹配 / once 不生效 / 写回 no-op），不要抛「未实现」
- 题面不得提及剥离或还原

## 5. 测试分层

1. 公开：问题现场保留的 `pnpm test`（test-core）
2. 隐藏：基准提交中被删改的 extend / asymmetric / once / withImplementation / 内联写回相关 specs
3. 类型：可选，对 `expect.extend` 与 `MockInstance` Once API 做 dts 检查
4. 回归：非目标能力的 core 单测、文件快照、基础 spy

## 6. 环境准备

```bash
pnpm install
pnpm run build
```

## 7. 推荐执行命令

```bash
pnpm test
# 隐藏集示例（在完整基准树或评测方恢复的测试文件上）：
# pnpm --filter test-core exec vitest run test/jest-expect.test.ts test/jest-mock.test.ts test/mocked.test.ts test/spy.test.ts
```

## 8. 公开测试设计

- 问题现场内保留的 test-core 用例应通过
- 不要求被测模型看到被删的隐藏用例原文

## 9. 隐藏测试设计（应对齐基准提交完整行为）

评测方从基准提交取出（或自行对照）至少覆盖：

1. **extend**：自定义 matcher 同步失败信息、async/Promise matcher、`expect.toX` asymmetric、`expect.not.toX`、jest matcher object 注册
2. **asymmetric**：object/array/stringMatching/closeTo 正反向与错误信息快照
3. **inline snapshot update**：空参插入、替换已有模板字符串、带 properties shape 的调用
4. **spy**：`mockReturnValueOnce` 链、`mockImplementationOnce` 耗尽回落、`mockResolvedValueOnce`/`mockRejectedValueOnce` 顺序、`withImplementation` 同步/异步及相对 Once 的优先级

Oracle：基准提交 `d69cc75698dd6dbeaed5c237ebb46ccd41bfb438` 完整行为。

## 10. 类型测试设计

- `expect.extend` 后 Assertion 增强（可用项目内既有 module augmentation 用例）
- `MockInstance.mockImplementationOnce` / `withImplementation` 泛型可赋值

## 11. 回归测试范围（剥离范围外不得破坏）

- `toBe` / `toEqual` / `toHaveProperty` / spy call matchers（`toHaveBeenCalled*` 等）
- `stringContaining` / `any` / `anything`
- 文件 `__snapshots__` 比对
- `mockResolvedValue`（非 Once）等常驻实现 API

## 12. 代码审查检查点

- extend 是否正确挂到 Assertion 与 asymmetric，并处理 Promise 结果
- objectContaining 是否沿原型链查自有属性并走 equals/customTesters
- closeTo 精度与 Infinity
- replaceInlineSnap 是否处理 `)` 空参、引号字面量、对象 shape 分支与缩进
- once 队列是否在 mockCall 路径 `shift`，withImplementation 是否恢复且优先

## 13. 推荐评分标准

| 档位 | 标准 |
|---|---|
| 优秀 | 四块能力均对齐基准，公开回归通过，隐藏集通过 |
| 良好 | 三块以上对齐，少量边界（如 WebKit 列偏移 / Infinity closeTo）缺失 |
| 及格 | extend + 至少一个 asymmetric 或 once 主路径可用，回归不明显破坏 |
| 不及格 | 核心跑测骨架被破坏，或仅表面改名无行为 |

## 14. 失败判定条件

- 公开 `pnpm test` 大面积失败（非隐藏目标）
- 重新引入提示性 TODO / 空实现抛错文案
- 破坏 `expect.any` / 文件快照 / runner 启动

## 15. 测试组织建议

- 公开集跑问题现场 test-core
- 隐藏集由评测方在隔离目录对照基准提交执行，不落入被测工作区

## 16. 最小测试集建议

1. extend 同步自定义 matcher + asymmetric 形态
2. objectContaining + arrayContaining 各一正一反
3. stringMatching + closeTo 各一
4. mockReturnValueOnce 链 + withImplementation 恢复
5. 内联快照更新写回（空参或替换）至少一则

## 17. 不得泄露给被测模型的内容清单

- 仓库 URL、基准 commit / tag
- 本 test-plan 中的剥离文件清单与手法
- 「功能曾被删除/挖空」等元信息
- 隐藏测试完整用例与期望快照原文
- 原实现算法步骤或可直接粘贴的参考代码
