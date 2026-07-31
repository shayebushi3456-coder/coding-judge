我们这边 HTTP 客户端还比较裸，业务里好几块能力现在对不上，希望你在当前代码库里补齐。

首先是拦截器。实例上要能挂 request / response interceptor，支持 `use` / `eject` / `clear`，请求发出前改 config、回来后改 response，失败也能进 rejected。有的拦截器是同步的，有的是异步 promise 链，最好两种都能跑；还有个 `runWhen`，不满足条件就跳过这个拦截器。没有拦截器时请求该怎么走还怎么走。

其次是取消。老代码还在用 `CancelToken`，需要能 `new CancelToken(executor)`，也要有 `CancelToken.source()` 一次性拿到 token 和 cancel。cancel 之后对应请求应该以取消错误结束，`throwIfRequested`、subscribe/unsubscribe，以及转成 AbortSignal 给新适配器那套，都要能用。`axios.isCancel` 也能判断出来。

另外对象转 FormData 这块也不完整。`axios.toFormData` 要把嵌套对象、数组、Date、FileList 之类按规则 append 进去，支持 dots、indexes、metaTokens、自定义 visitor 这些序列化选项；反过来 `axios.formToJSON` 要把 FormData 还原成对象（带 `foo[bar]` 这种 key）。multipart / urlencoded 发对象时会用到这套。

基础 get/post、headers、adapter 别弄坏。本地可以用 `npm run test:mocha` 先摸一下，有条件再跑更完整的测试。
