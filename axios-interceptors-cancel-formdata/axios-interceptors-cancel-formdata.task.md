在当前代码库里把下面几块能力补上。

实现 request/response 拦截器，支持 use/eject/clear，发请求前改 config、回来改 response，失败走 rejected；同步和异步链都要能用，runWhen 不满足就跳过。再实现 CancelToken，要能 new，也要有 source()，cancel 之后请求按取消错误结束，subscribe、throwIfRequested、转 AbortSignal 要能配合适配器。还要补 toFormData 和 formToJSON：嵌套对象、数组、Date 以及序列化选项要能处理，带 foo[bar] 这种 key 的 FormData 也能还原成对象。别弄坏基础请求，用 npm run test:mocha 验证。
