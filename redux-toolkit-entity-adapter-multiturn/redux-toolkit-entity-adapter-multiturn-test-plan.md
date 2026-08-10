# Redux Toolkit Entity Adapter 多轮评测测试方案

## 1. 测试目标

多轮（5 轮）迭代恢复 `createEntityAdapter` 体系：未排序 CRUD → 更新/upsert → 排序适配器 → 选择器 → removeAll/自定义 selectId/id 变更。终态对齐基准提交。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/reduxjs/redux-toolkit
- 基准：`6590cec1cee83fcab165eb340f6b78762c4ad5a2`（v2.5.0）
- 包路径：`packages/toolkit`
- 建议命令：`yarn test`（或 vitest/jest 按该版本 scripts）

## 3. 被剥离功能说明（仅评测方）

| 模块 | 路径 | 对应轮次 |
|---|---|---|
| unsorted adapter | `src/entities/unsorted_state_adapter.ts` | T1–T2–T5 |
| sorted adapter | `src/entities/sorted_state_adapter.ts` | T3–T5 |
| selectors | `src/entities/state_selectors.ts` | T4 |
| createEntityAdapter 接线 | `src/entities/create_adapter.ts` | 全程（保留壳） |
| 测试 | `src/entities/tests/*` | 隐藏集；问题现场删除专属测试以免开局全红 |

保留：`models.ts` 类型、`state_adapter.ts` immer 包装、`entity_state.ts` 工厂、`utils.ts`、对外导出符号名。

## 4. 问题现场构造方案

1. **unsorted_state_adapter.ts**：保留导出函数与完整方法名集合，方法体退化为 no-op（不改 state）或仅返回原 state 的 operator。
2. **sorted_state_adapter.ts**：同样退化为 no-op；`findInsertIndex`/`insert` 可退化恒定行为。
3. **state_selectors.ts**：`getSelectors` 仍返回同名选择器，但 `selectAll`→`[]`，`selectById`→`undefined`，`selectTotal`→`0`，`selectIds`/`selectEntities` 读空结构。
4. **create_adapter.ts**：保留分支（有/无 sortComparer），继续组装工厂；因 adapter 为空壳，行为不正确。
5. **删除** `packages/toolkit/src/entities/tests/` 下专属测试文件（隐藏测时从 oracle 挂回）。
6. 禁止 `TODO` / `not implemented` 注释。

预期实现恢复量：unsorted(~200) + sorted(~250) + selectors(~70) ≈ **400～500 行**。

## 5. 分轮测试分层

见 `dialog.md`。公开侧可保留无关模块测试；entities 专属作为隐藏/分轮集。

## 6～17

- 环境：Node 18+，在 `packages/toolkit` 按仓库方式装依赖。
- 隐藏 oracle：基准提交同路径测试文件。
- 回归：`createSlice` / `createAsyncThunk` / `configureStore` 等。
- 失败判定：重置仓库、只改测试、后轮破坏前轮且不修。
- 不得泄露：dialog 全文、基准 SHA、剥离手法、分轮用例名单给被测模型（评测运行器只逐轮注入「用户消息」段落）。
