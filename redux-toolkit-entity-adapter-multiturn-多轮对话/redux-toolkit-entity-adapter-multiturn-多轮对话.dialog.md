# Redux Toolkit Entity Adapter 多轮对话脚本（评测方）

## 总览

- 总轮数：5（含第 1 轮 `task.md`）
- 现场：同一 `repo/` 连续迭代，禁止每轮重置
- 仓库：https://github.com/reduxjs/redux-toolkit
- 基准提交：`6590cec1cee83fcab165eb340f6b78762c4ad5a2`（tag `v2.5.0`）
- 终态 oracle：`packages/toolkit/src/entities` 完整行为
- 运行目录：`packages/toolkit`

## Turn 1

- 用户消息：见 `redux-toolkit-entity-adapter-multiturn.task.md`
- 触发：评测开始
- 本轮范围：未排序适配器的基础增删与 `setOne`/`setMany`；`getInitialState` 可用
- 本轮验收（隐藏测子集，从基准恢复后筛）：
  - `entities/tests/unsorted_state_adapter.test.ts` 中 add / remove / setOne / setMany 相关用例
  - `entity_state.test.ts` 中初始化相关
- 通过标准：本轮子集 ≥ 85% 通过；`createSlice` 等无关测试不新增失败
- 回归：非 entities 模块既有测试

## Turn 2

- 触发：Turn1 验收通过后，由评测方注入下列用户消息
- 用户消息：

```text
刚才那套再补全一点：要能整表换掉，也能按 id 改几个字段；有就改没有就当新增那种也要。批量的都要能用。前面加删除的别弄坏。
```

- 本轮范围：`setAll`、`updateOne`/`updateMany`、`upsertOne`/`upsertMany`（含 id 变更时的 ids 同步）
- 本轮验收：unsorted 中 update / upsert / setAll 用例 + Turn1 回归
- 通过标准：Turn1+2 相关用例合计 ≥ 90%

## Turn 3

- 触发：Turn2 通过后注入
- 用户消息：

```text
有的列表要一直按某个规则排好，加进去或改完自动插到对的位置，别每次自己 sort。没开排序时还是老样子。
```

- 本轮范围：`sortComparer` 开启时走 sorted adapter（插入位置、set/update/upsert 保序）
- 本轮验收：`sorted_state_adapter.test.ts` 主路径 + Turn1–2 回归
- 通过标准：sorted 主路径 ≥ 85%；未排序路径不回退

## Turn 4

- 触发：Turn3 通过后注入
- 用户消息：

```text
读数据那边也补下：要能拿出全部、按 id 拿一个、看有多少条、直接拿 id 列表和字典。挂到全局 state 上选一块再读也行。
```

- 本轮范围：`getSelectors` / `selectAll` / `selectById` / `selectIds` / `selectEntities` / `selectTotal`（含挂 selectState）
- 本轮验收：`state_selectors.test.ts` + 前轮回归
- 通过标准：selectors 用例 ≥ 90%

## Turn 5

- 触发：Turn4 通过后注入
- 用户消息：

```text
再收个尾：一键清空要有；id 不一定叫 id，得能自己指定怎么取；改字段导致 id 变了表也要跟着对。前面排序和选择器别砸了。
```

- 本轮范围：`removeAll`；自定义 `selectId`；update 导致 key 变化时的 ids/entities 一致性（及与 sorted 的交叉）
- 本轮验收：unsorted/sorted 中 removeAll、selectId、id-change 相关用例 + 全量 entities 测试
- 通过标准：entities 相关测试总体 ≥ 90%；终态接近基准

## 评分建议

| 维度 | 权重 |
|---|---|
| Turn1 框架 | 20% |
| Turn2 更新/upsert | 20% |
| Turn3 排序 | 20% |
| Turn4 选择器 | 15% |
| Turn5 收尾+终态 | 15% |
| 跨轮回归未破坏 | 10% |

不得把本文件提供给被测模型。
