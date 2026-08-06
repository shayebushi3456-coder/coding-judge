# pinia mapHelpers / storeToRefs / HMR 评测测试方案

## 1. 测试目标

评测被测 coding agent 能否恢复 Pinia 的：

1. Options API 映射助手：`mapState` / `mapGetters` / `mapActions` / `mapWritableState` / `mapStores` / `setMapStoreSuffix`
2. `storeToRefs`
3. HMR：`acceptHMRUpdate` / `patchObject` / `isUseStore`

预期净恢复约 **750～850 行**，**3 个文件**（符合复杂 / 500–1000 行 / 3–5 文件）。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/vuejs/pinia
- 基准提交：`1d8f3411deae55cd7987785bd286005fe86566be`（tag `v2.3.0`）
- 包管理：pnpm
- 验证：`pnpm --filter pinia test` 或 `cd packages/pinia && pnpm test`

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

| 功能 | 路径 | 约行数 | 相关测试 |
|---|---|---|---|
| map helpers | `packages/pinia/src/mapHelpers.ts` | 560 | `__tests__/mapHelpers.spec.ts` |
| storeToRefs | `packages/pinia/src/storeToRefs.ts` | 125 | `__tests__/storeToRefs.spec.ts` |
| HMR | `packages/pinia/src/hmr.ts` | 127 | `__tests__/hmr.spec.ts` |
| 导出 | `packages/pinia/src/index.ts`（**保留**） | — | — |

合计 ≈ **812 行 / 3 文件**。

### 3.2 功能边界与复杂度

- `mapStores`：多 store 映射，可配置 suffix；dev 数组误用警告
- `mapState`/`mapGetters`：数组键 / 对象别名 / 函数映射；通过 `this.$pinia`
- `mapActions`：数组或对象映射到 methods
- `mapWritableState`：可写 computed get/set
- `storeToRefs`：Vue3 排除 methods；computed 可写；Vue2 `toRefs` 路径
- `acceptHMRUpdate`：dev only；`patchObject` 深度合并；id 变更 invalidate

### 3.3 行为对照要点

对齐基准 `mapHelpers.spec.ts` / `storeToRefs.spec.ts` / `hmr.spec.ts`。

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 剥离范围

1. 将三文件退化为保留导出名的最小壳（空对象返回 / no-op HMR）
2. 删除 `__tests__/mapHelpers.spec.ts`、`storeToRefs.spec.ts`、`hmr.spec.ts`
3. 删除 `packages/pinia/dist` 等预构建产物

### 4.2 保留

- `store.ts` / `createPinia.ts` / `rootStore.ts` / plugins / types 主体
- `index.ts` 导出语句

### 4.3 预期失败

- 上述三份专属测试（隐藏侧挂回）
- 依赖 map*/storeToRefs/HMR 的集成行为

### 4.4 范围外应保持

- `defineStore` setup/options 主路径
- `$patch` / `$subscribe` / plugins 等既有单测

### 4.5 避免提示

- 无 TODO/not implemented；题面无仓库 URL/SHA/文件清单

## 5. 测试分层

公开：`pnpm test`；隐藏：基准三份 spec；回归：store/state/getters/plugins。

## 6. 环境准备

```bash
git clone https://github.com/vuejs/pinia.git
cd pinia && git checkout 1d8f3411deae55cd7987785bd286005fe86566be
pnpm install
```

## 7. 推荐执行命令

```bash
pnpm --filter pinia test
```

## 8. 公开测试设计

模型自行跑仓库测试；问题现场已无三份 oracle 文件。

## 9. 隐藏测试设计

挂回基准：

1. `mapHelpers.spec.ts`：mapState/Actions/Writable/Stores/suffix
2. `storeToRefs.spec.ts`：refs 集合、排除方法、可写 computed、Vue2
3. `hmr.spec.ts`：acceptHMRUpdate、patchObject、id 变更

## 10. 类型测试设计

恢复后 `MapStoresCustomization` / 精确 overload 应尽量对齐基准；可作为加分项（扩展验收若放宽需标注）。

## 11. 回归范围

`store.spec.ts`、`state.spec.ts`、`getters.spec.ts`、`storePlugins.spec.ts`、`subscriptions.spec.ts` 等。

## 12. 代码审查检查点

- [ ] map* 经 `this.$pinia` 取 store
- [ ] mapWritableState 可写
- [ ] storeToRefs 不暴露 actions
- [ ] HMR 仅 __DEV__ 有效；patchObject 递归纯对象
- [ ] 未破坏 defineStore 主路径

## 13. 推荐评分标准

| 维度 | 权重 |
|---|---|
| mapHelpers 运行时 | 45% |
| storeToRefs | 25% |
| HMR | 20% |
| 回归与质量 | 10% |

三块均需基本可用；只完成一块不通过。

## 14. 失败判定

- 空壳返回却声称完成
- 删改大量无关测试冒充通过
- 破坏 createPinia/defineStore

## 15. 测试组织建议

```text
coding-judge/pinia-map-helpers-hmr/
  pinia-map-helpers-hmr.task.md
  pinia-map-helpers-hmr-test-plan.md
  repo/
```

## 16. 最小测试集

各隐藏 spec 中核心用例各至少 30% 通过且无关键回归。

## 17. 不得泄露给被测模型的内容

本 test-plan、剥离步骤、基准 SHA、原实现、隐藏用例、文件清单。
