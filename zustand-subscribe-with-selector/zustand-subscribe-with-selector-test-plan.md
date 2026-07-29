# zustand subscribeWithSelector 中间件 — 测试方案

> **仅供评测方内部使用，不得向被测模型泄露本文档任何内容。**

---

## 1. 测试目标

验证被测模型能否在 zustand v4.5.5 代码库（问题现场：`subscribeWithSelector` 运行时逻辑已被剥离）的基础上，独立实现完整的 `subscribeWithSelector` 中间件，包括：

- selector 细粒度订阅的运行时行为；
- equalityFn 自定义比较逻辑；
- fireImmediately 立即触发选项；
- 无 selector 时的向后兼容退化；
- 正确的 TypeScript 类型重载与泛型推导；
- unsubscribe 取消订阅；
- 与 vanilla / React store 的组合兼容性。

---

## 2. 目标仓库与基准提交

- **仓库**：`https://github.com/pmndrs/zustand`
- **基准提交**：`ded02e9f66c29722392f3e1ed3e790c5b0331bda`（tag `v4.5.5`）
- **目标文件**：`src/middleware/subscribeWithSelector.ts`
- **相关测试**：`tests/vanilla/subscribe.test.tsx`、`tests/middlewareTypes.test.tsx`、`tests/context.test.tsx`

---

## 3. 被剥离功能说明（仅评测方可见）

### 3.1 原仓库定位

文件：`src/middleware/subscribeWithSelector.ts`

关键符号：
- `subscribeWithSelectorImpl`（运行时实现函数）
- `SubscribeWithSelector`（公开类型）
- `StoreSubscribeWithSelector`（subscribe 重载类型）
- `WithSelectorSubscribe`（Store 类型扩展）
- `StoreMutators` 模块扩展声明

原仓库完整实现：

```ts
const subscribeWithSelectorImpl: SubscribeWithSelectorImpl =
  (fn) => (set, get, api) => {
    type S = ReturnType<typeof fn>
    type Listener = (state: S, previousState: S) => void
    const origSubscribe = api.subscribe as (listener: Listener) => () => void
    api.subscribe = ((selector: any, optListener: any, options: any) => {
      let listener: Listener = selector // if no selector
      if (optListener) {
        const equalityFn = options?.equalityFn || Object.is
        let currentSlice = selector(api.getState())
        listener = (state) => {
          const nextSlice = selector(state)
          if (!equalityFn(currentSlice, nextSlice)) {
            const previousSlice = currentSlice
            optListener((currentSlice = nextSlice), previousSlice)
          }
        }
        if (options?.fireImmediately) {
          optListener(currentSlice, currentSlice)
        }
      }
      return origSubscribe(listener)
    }) as any
    const initialState = fn(set, get, api)
    return initialState
  }
export const subscribeWithSelector =
  subscribeWithSelectorImpl as unknown as SubscribeWithSelector
```

### 3.2 功能边界与复杂度

涉及维度：
1. **运行时行为**：selector 切片比较与跳过通知逻辑；
2. **类型/API**：泛型重载、`StoreMutators` 扩展、导出类型；
3. **边界条件**：equalityFn 缺省、fireImmediately、无 selector 退化、unsubscribe；
4. **跨模块交互**：与 vanilla `createStore` 和 React `create` 的组合；

### 3.3 与基准提交的行为对照要点

| 行为 | 基准提交表现 |
|------|------------|
| selector 未变化 | listener 不触发 |
| selector 变化 | listener 触发，参数为 (newSlice, prevSlice) |
| equalityFn: () => true | 始终不触发 |
| equalityFn: () => false | 始终触发 |
| fireImmediately: true | 建立订阅时立即以 (currentSlice, currentSlice) 触发 |
| 无 selector | 退化为全量订阅，任意 state 变化均触发 |
| unsubscribe | 调用后不再触发 |

---

## 4. 问题现场构造方案（仅评测方可见）

### 4.1 建议剥离范围

在基准提交基础上，对 `src/middleware/subscribeWithSelector.ts` 做如下处理：

1. **删除 `subscribeWithSelectorImpl` 的实现体**，仅保留函数签名或替换为最小无行为壳（直接调用原始 fn 并返回，不覆盖 `api.subscribe`）；
2. **删除 `StoreSubscribeWithSelector` 类型定义中的带 selector 重载**，仅保留基础 subscribe 签名；
3. **删除 `WithSelectorSubscribe` 类型定义**；
4. **删除 `StoreMutators` 扩展声明中对 `zustand/subscribeWithSelector` 的注册**；
5. 同步删除文件内所有与 selector/equalityFn/fireImmediately 相关的类型辅助（`Write` 类型可保留，因为可能在别处有用或被测模型可自行定义）。

### 4.2 建议保留的公开 API / 类型 / 接线

- 保留 `export const subscribeWithSelector` 导出符号（设为返回原始 fn 的直传壳），避免导入侧编译失败；
- 保留 `SubscribeWithSelector` 类型（可退化为接受 initializer 返回 initializer 的简单类型）；
- 保留文件的 import 语句（`StateCreator`、`StoreMutatorIdentifier`）；
- 不删除 `src/middleware/index.ts` 中对 `subscribeWithSelector` 的 re-export。

### 4.3 剥离后预期失败范围

- `tests/vanilla/subscribe.test.tsx` 中所有涉及 `subscribeWithSelector` 的用例（含 selector、equalityFn、fireImmediately、unsubscribe 测试）；
- `tests/middlewareTypes.test.tsx` 中 `subscribeWithSelector` 相关类型测试；
- `tests/context.test.tsx` 中如有使用 `subscribeWithSelector` 的用例。

### 4.4 剥离范围外应保持的行为

- 基础 `subscribe(listener)` 全量订阅行为（vanilla 层面）不受影响；
- `persist`、`devtools`、`immer`、`redux`、`combine` 中间件的全部测试不受影响；
- `pnpm test` 中非 `subscribeWithSelector` 相关测试应继续通过；
- `createStore`、`create`、`getState`、`setState`、`getInitialState` 基础 API 正常。

### 4.5 避免提示性残留的注意事项

- 不得在代码中保留 `// TODO: implement selector logic` 等注释；
- 不得保留 `equalityFn`、`fireImmediately`、`currentSlice` 等变量名残留；
- 不得在 test-plan 或 task.md 以外的任何地方暗示「此处曾有实现被删除」；
- 保留的壳函数应看起来像「尚未添加此功能的早期版本」，而非「刻意挖空」。

### 4.6 推荐壳函数写法

```ts
// 问题现场替换为：
const subscribeWithSelectorImpl: SubscribeWithSelectorImpl =
  (fn) => (set, get, api) => {
    return fn(set, get, api)
  }
export const subscribeWithSelector =
  subscribeWithSelectorImpl as unknown as SubscribeWithSelector
```

---

## 5. 测试分层

| 层级 | 类型 | 权重 |
|------|------|------|
| L1 | 公开功能测试（selector 基础行为） | 必须全部通过 |
| L2 | 边界条件测试（equalityFn、fireImmediately、unsubscribe） | 必须全部通过 |
| L3 | 类型测试（泛型推导、StoreMutators 注册） | 必须通过 |
| L4 | 回归测试（其他中间件、基础 API 不受影响） | 必须全部通过 |
| L5 | 隐藏测试（多订阅并存、竞态、与 React store 组合） | 加分 |

---

## 6. 环境准备

```bash
cd zustand-subscribe-with-selector-repo   # 问题现场目录
pnpm install
```

- Node.js >= 18
- pnpm >= 8
- 无需网络、无需外部服务

---

## 7. 推荐执行命令

```bash
# 全量测试
pnpm test

# 仅运行订阅相关
pnpm vitest run tests/vanilla/subscribe.test.tsx

# 类型检查
pnpm test:types

# 查看覆盖率（可选）
pnpm vitest run --coverage
```

---

## 8. 公开测试设计

以下测试可提供给被测模型参考（来自原仓库 `tests/vanilla/subscribe.test.tsx`）：

```ts
// 1. selector 切片未变化时不触发
it('should not be called when state slice is the same', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(subscribeWithSelector(() => ({ value: 1, other: 'a' })))
  subscribe((s) => s.value, spy)
  setState({ other: 'b' })
  expect(spy).not.toHaveBeenCalled()
})

// 2. selector 切片变化时触发，参数正确
it('should be called when state slice changes', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(subscribeWithSelector(() => ({ value: 1, other: 'a' })))
  subscribe((s) => s.value, spy)
  setState({ value: 2 })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith(2, 1)
})

// 3. equalityFn 返回 true 时不触发
it('should not be called when equality checker returns true', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(subscribeWithSelector(() => ({ value: 1, other: 'a' })))
  subscribe((s) => s, spy, { equalityFn: () => true })
  setState({ value: 3 })
  expect(spy).not.toHaveBeenCalled()
})

// 4. equalityFn 返回 false 时触发
it('should be called when equality checker returns false', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(subscribeWithSelector(() => ({ value: 1, other: 'a' })))
  subscribe((s) => s.value, spy, { equalityFn: () => false })
  setState({ value: 3 })
  expect(spy).toHaveBeenCalledTimes(1)
})

// 5. unsubscribe 后不再触发
it('should unsubscribe correctly', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(subscribeWithSelector(() => ({ value: 1, other: 'a' })))
  const unsub = subscribe((s) => s.value, spy)
  setState({ value: 2 })
  unsub()
  setState({ value: 3 })
  expect(spy).toHaveBeenCalledTimes(1)
})
```

---

## 9. 隐藏测试设计（对照基准提交完整行为）

以下测试**不得提供给被测模型**，由评测方在验收时使用：

### 9.1 fireImmediately

```ts
it('should fire immediately with current slice when fireImmediately is true', () => {
  const spy = vi.fn()
  const { subscribe } = createStore(subscribeWithSelector(() => ({ count: 5 })))
  subscribe((s) => s.count, spy, { fireImmediately: true })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith(5, 5)
})

it('should not fire immediately when fireImmediately is false or omitted', () => {
  const spy = vi.fn()
  const { subscribe } = createStore(subscribeWithSelector(() => ({ count: 5 })))
  subscribe((s) => s.count, spy)
  expect(spy).not.toHaveBeenCalled()
})
```

### 9.2 多订阅并存，互不干扰

```ts
it('multiple subscriptions should be independent', () => {
  const spyA = vi.fn()
  const spyB = vi.fn()
  const { setState, subscribe } = createStore(
    subscribeWithSelector(() => ({ a: 1, b: 10 }))
  )
  subscribe((s) => s.a, spyA)
  subscribe((s) => s.b, spyB)

  setState({ a: 2 })
  expect(spyA).toHaveBeenCalledTimes(1)
  expect(spyB).not.toHaveBeenCalled()

  setState({ b: 20 })
  expect(spyA).toHaveBeenCalledTimes(1)
  expect(spyB).toHaveBeenCalledTimes(1)
})
```

### 9.3 无 selector 退化为全量订阅

```ts
it('should fall back to full-state subscription when no selector is provided', () => {
  const spy = vi.fn()
  const initialState = { x: 1 }
  const { setState, subscribe } = createStore(
    subscribeWithSelector(() => initialState)
  )
  subscribe(spy)
  setState({ x: 2 })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith({ x: 2 }, { x: 1 })
})
```

### 9.4 自定义 equalityFn 边界：近似相等跳过

```ts
it('should skip notification when custom equalityFn treats values as equal', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(
    subscribeWithSelector(() => ({ value: 0 }))
  )
  const roughEqual = (a: number, b: number) => Math.abs(a - b) < 1
  subscribe((s) => s.value, spy, { equalityFn: roughEqual })

  setState({ value: 0.5 })  // |0.5 - 0| < 1 → 不触发
  expect(spy).not.toHaveBeenCalled()

  setState({ value: 1.5 })  // |1.5 - 0| >= 1 → 触发（注意：currentSlice 已更新为 0.5）
  // 实际上 |1.5 - 0.5| = 1，不满足严格小于，所以应触发
  expect(spy).toHaveBeenCalledTimes(1)
})
```

### 9.5 与 React store（`create`）组合

```ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

it('should work with React create store', () => {
  const spy = vi.fn()
  const useStore = create(subscribeWithSelector(() => ({ count: 0 })))
  useStore.subscribe((s) => s.count, spy)
  useStore.setState({ count: 1 })
  expect(spy).toHaveBeenCalledWith(1, 0)
})
```

### 9.6 currentSlice 在 listener 触发后正确更新

```ts
it('should track currentSlice correctly across multiple updates', () => {
  const spy = vi.fn()
  const { setState, subscribe } = createStore(
    subscribeWithSelector(() => ({ n: 0 }))
  )
  subscribe((s) => s.n, spy)

  setState({ n: 1 })
  setState({ n: 1 })  // 相同值，不触发
  setState({ n: 2 })

  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy).toHaveBeenNthCalledWith(1, 1, 0)
  expect(spy).toHaveBeenNthCalledWith(2, 2, 1)
})
```

---

## 10. 类型测试设计

来自 `tests/middlewareTypes.test.tsx`（原仓库已有），评测方应确认以下类型能力：

```ts
// selector 参数类型正确推导
const store = createStore(subscribeWithSelector(() => ({ count: 0, name: '' })))

store.subscribe(
  (s) => s.count,
  // listener 参数类型应推导为 (number, number)
  (count: number, prev: number) => {},
)

// 无 selector 时兼容全量 subscribe
store.subscribe((state, prev) => {
  const _: { count: number; name: string } = state
})

// StoreMutators 扩展后 store 类型正确
type StoreType = typeof store
// StoreType['subscribe'] 应包含带 selector 的重载
```

---

## 11. 回归测试范围（剥离范围外不得破坏）

以下测试组应在被测模型提交后全部通过：

- `tests/basic.test.tsx`（核心 create/setState/getState）
- `tests/vanilla/subscribe.test.tsx` 中不涉及 `subscribeWithSelector` 的用例
- `tests/persistAsync.test.tsx`
- `tests/persistSync.test.tsx`
- `tests/devtools.test.tsx`
- `tests/shallow.test.tsx`
- `tests/ssr.test.tsx`

---

## 12. 代码审查检查点

- [ ] `api.subscribe` 是否被正确覆盖（而非新建另一个 subscribe）；
- [ ] `origSubscribe` 是否在覆盖前保存，避免递归；
- [ ] `currentSlice` 是否在 listener 内部正确更新（不使用过时闭包值）；
- [ ] `equalityFn` 默认值是否为 `Object.is`（而非 `===` 或 `_.isEqual`）；
- [ ] `fireImmediately` 触发时机是否在 `subscribe` 调用时（而非 state 变化时）；
- [ ] 无 selector 时，是否直接使用传入的 listener（不额外包装）；
- [ ] unsubscribe 是否来自 `origSubscribe` 的返回值；
- [ ] 类型是否通过 `StoreMutators` 扩展机制注册（而非直接 patch 类型）；
- [ ] 是否有内存泄漏风险（listener 引用是否在 unsub 后可 GC）；
- [ ] 代码风格是否与原仓库一致（TypeScript strict、无 any 滥用）。

---

## 13. 推荐评分标准

| 项目 | 分值 |
|------|------|
| selector 切片比较逻辑正确（含 Object.is 默认值） | 25 |
| equalityFn 自定义比较正确生效 | 15 |
| fireImmediately 行为正确 | 15 |
| unsubscribe 正确工作 | 10 |
| 无 selector 退化兼容 | 10 |
| 类型重载正确（StoreMutators 扩展） | 15 |
| 多订阅独立、currentSlice 状态追踪准确 | 10 |
| **总计** | **100** |

---

## 14. 失败判定条件

以下任一情况视为未通过：

- `pnpm test` 中出现与 `subscribeWithSelector` 相关的新增失败；
- `pnpm test:types` 类型检查报错；
- selector 切片变化时 listener 未触发（基础行为缺失）；
- selector 切片未变化时 listener 被错误触发（冗余通知）；
- unsubscribe 调用后 listener 仍然被调用；
- `origSubscribe` 未正确保存导致无限递归或堆栈溢出；
- 破坏了其他中间件（persist、devtools 等）的回归测试。

---

## 15. 测试组织建议

```
tests/
  vanilla/
    subscribe.test.tsx          # 公开测试（已在问题现场保留，但 subscribeWithSelector 相关用例失败）
    subscribeWithSelector-hidden.test.tsx  # 隐藏测试（评测方添加，不提供给被测模型）
  middlewareTypes.test.tsx      # 类型测试（部分用例在问题现场失败）
  regression/
    persist.test.tsx            # 回归：persist 中间件
    devtools.test.tsx           # 回归：devtools 中间件
```

---

## 16. 最小测试集建议

若需快速验收，优先跑以下用例：

1. selector 切片未变化 → listener 不触发
2. selector 切片变化 → listener 触发，参数 (newSlice, prevSlice)
3. equalityFn: () => true → 始终不触发
4. fireImmediately: true → 立即以 (current, current) 触发
5. unsubscribe → 后续不再触发
6. 无 selector → 退化为全量订阅
7. pnpm test:types → 无类型错误

---

## 17. 不得泄露给被测模型的内容清单

- 本文档的任何部分；
- 原仓库 `subscribeWithSelectorImpl` 的完整实现；
- 问题现场构造方案（哪些代码被剥离、如何剥离）；
- 隐藏测试用例（第 9 节）；
- 评分标准与失败判定条件；
- 代码审查检查点（第 12 节）；
- 「此处曾有某段实现被删除」的任何暗示；
- 任何 diff、patch 或与原仓库的对照内容。

---

*基准提交 oracle：`ded02e9f66c29722392f3e1ed3e790c5b0331bda`（zustand v4.5.5）*
