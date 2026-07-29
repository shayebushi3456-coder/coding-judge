我们在用 zustand 做状态管理，现在希望 `subscribe` 能支持传入一个 selector 函数，只在 selector 选出的切片发生变化时才通知 listener，而不是每次全量 state 变化都触发。比如 store 里有 `count` 和 `name` 两个字段，我只关心 `count`，就不希望 `name` 变化时也收到通知。

另外希望能传入自定义的 `equalityFn` 来控制「切片是否算作变化」，默认用 `Object.is` 就好。还需要一个 `fireImmediately` 选项，设为 `true` 时订阅建立后立即用当前切片值触发一次 listener。

这个能力通过一个叫 `subscribeWithSelector` 的中间件来提供，从 `zustand/middleware` 导出，用法大概是这样：

```ts
const store = createStore(subscribeWithSelector(() => ({ count: 0, name: 'Alice' })))

store.subscribe(
  (s) => s.count,
  (count, prevCount) => console.log(count, prevCount),
  { equalityFn: Object.is, fireImmediately: false }
)
```

没有传 selector 时退化为原来的全量订阅行为就行，不要破坏兼容性。类型也要正确推导，selector 返回什么类型，listener 参数就是什么类型。

仓库：https://github.com/pmndrs/zustand，基准提交 `ded02e9f66c29722392f3e1ed3e790c5b0331bda`，请在当前代码库基础上实现，跑 `pnpm test` 和 `pnpm test:types` 验证。
