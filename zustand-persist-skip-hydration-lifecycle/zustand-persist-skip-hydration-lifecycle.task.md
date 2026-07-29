我们 Next.js 项目里用 zustand persist 持久化用户偏好，SSR 场景有点别扭：store 一创建就会立刻从 storage 回填，服务端和客户端第一次渲染对不上，hydration mismatch 挺烦人的。

想加个开关，persist 配置里能写 `skipHydration: true`，创建 store 时先别自动回填，等客户端就绪后再手动调 `persist.rehydrate()`。没开这个开关时保持现在的行为，照样自动 hydrate。

另外业务侧要能感知回填进度：`persist.hasHydrated()` 看当前有没有完成过一次回填；`persist.onHydrate(cb)` 在回填开始时回调，`persist.onFinishHydration(cb)` 在成功结束后回调，两个订阅都要能取消。异步 storage 下如果连续多次 `rehydrate()`，以最后一次为准，别让过期的回填把状态盖回去，完成回调也只对应最后那次。

同步、异步 storage 都要能 work，现有的 merge / partialize / migrate / onRehydrateStorage / setOptions 别弄坏。类型里把 `skipHydration` 和这几个 persist API 补上。

在当前代码库上改就行，改完跑 `pnpm test:spec` 和 `pnpm test:types`。
