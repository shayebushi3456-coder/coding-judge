HTTP 客户端这边缺几块常用能力，帮忙在当前代码库里补上。

想要 request/response 拦截器：能 use/eject/clear，发请求前改 config、回来改 response，失败走 rejected；同步和异步链都要能用，最好还有 runWhen 按条件跳过。取消还在用 CancelToken，new 和 source() 都要有，cancel 后请求以取消错误结束，subscribe、throwIfRequested、转 AbortSignal 这些也要能配合适配器。对象转 FormData（toFormData）希望支持嵌套、数组、Date 和序列化选项，formToJSON 能把带 foo[bar] 的 FormData 还原回来。别把基础请求搞坏，本地可跑 npm run test:mocha。
