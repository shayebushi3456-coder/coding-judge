# 任务：为 zustand 实现 subscribeWithSelector 中间件

## 背景

当前的 zustand store 已支持 `subscribe(listener)` 基础订阅：每次 state 发生任何变化时，listener 都会被调用，参数为 `(newState, prevState)`。

在大型应用中，这种全量订阅会造成不必要的 re-render 和副作用触发。我们需要让 `subscribe` 支持细粒度订阅：调用方可以传入一个 **selector** 函数，只在 selector 所选取的切片发生变化时才通知 listener；同时支持自定义 **equalityFn** 来决定「切片是否发生了变化」；还需要支持 **fireImmediately** 选项，让订阅建立后立即以当前值触发一次 listener。

这个能力以中间件形式提供，命名为 `subscribeWithSelector`，已有相关的 TypeScript 类型声明骨架，但运行时逻辑和类型重载尚未完整实现。

## 需求

### API 签名

`subscribeWithSelector` 是一个 zustand 中间件，用法如下：

```ts
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

const store = createStore(subscribeWithSelector(() => ({ count: 0, name: 'Alice' })))
```

包裹后，`store.subscribe` 应支持两种调用形式：

**形式一：无 selector（向后兼容）**

```ts
store.subscribe((state, prevState) => {
  console.log(state, prevState)
})
```

行为与原始 `subscribe` 相同，state 发生任何变化都触发。

**形式二：带 selector + listener**

```ts
store.subscribe(
  (state) => state.count,       // selector：从全量 state 中选取关心的切片
  (count, prevCount) => {       // listener：仅在切片变化时触发
    console.log(count, prevCount)
  },
  {
    equalityFn?: (a, b) => boolean  // 可选，默认使用 Object.is
    fireImmediately?: boolean        // 可选，默认 false
  }
)
```

### 行为要求

1. **selector 切片未变化时不触发 listener**：若 `equalityFn(prevSlice, nextSlice)` 为 `true`，跳过本次通知。
2. **equalityFn 缺省时使用 `Object.is`**：不传 `equalityFn` 时，默认用引用相等判断。
3. **fireImmediately**：若传入 `fireImmediately: true`，中间件应在 `subscribe` 调用时立即以当前切片值作为参数调用一次 listener（此时 `selectedState` 与 `previousSelectedState` 均为当前值）。
4. **unsubscribe**：`subscribe` 调用应返回取消订阅函数，调用后不再触发 listener。
5. **无 selector 时向后兼容**：仅传一个 listener 时，行为退化为原始 `subscribe`，state 发生任何变化都通知。
6. **多个独立订阅互不干扰**：同一 store 上可建立多个 selector 订阅，各自独立判断、各自独立触发。

### 类型要求

中间件应正确扩展 `StoreMutators`，使 `store.subscribe` 在有 selector 参数时类型正确推导 listener 参数类型，并保留无 selector 时的原始类型。

### 兼容性

- 与 vanilla store（`createStore`）和 React store（`create`）均可组合使用；
- 与其他中间件（如 `persist`、`immer`）组合时不得破坏其基本行为；
- 中间件本身不修改 `getState`、`setState`、`getInitialState` 等其他 store API 的行为。

## 仓库与基准

- 仓库：`https://github.com/pmndrs/zustand`
- 基准提交：`ded02e9f66c29722392f3e1ed3e790c5b0331bda`（对应 tag `v4.5.5`）
- 中间件入口：`src/middleware/subscribeWithSelector.ts`
- 对外导出路径：`zustand/middleware`

请在当前代码库基础上完成该中间件的实现，确保通过现有测试并满足上述行为要求。

## 验证

```bash
pnpm install
pnpm test
pnpm test:types
```

也可单独运行订阅相关测试：

```bash
pnpm vitest run tests/vanilla/subscribe.test.tsx
```

## 完成标准

- `pnpm test` 全部通过，无新增失败；
- `pnpm test:types` 类型检查通过；
- selector 订阅仅在切片值变化时通知 listener；
- equalityFn 与 fireImmediately 选项均按上述语义生效；
- unsubscribe 函数能正确停止通知；
- 无 selector 时退化为全量订阅，不影响原有行为。
