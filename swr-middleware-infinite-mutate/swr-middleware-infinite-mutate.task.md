在当前代码库把中间件链和无限滚动这两块补上。

中间件要能一层层包住 fetcher：前面可以改 key / 配置，后面可以改结果，错误也能拦。多中间件按注册顺序组成链，支持在中间件里读缓存、写缓存、短路直接返回。withMiddleware 接好之后，swrFetch 的 middlewares 参数要真正生效。

无限列表那边，loadInfinitePages 要按 page 把多页数据攒起来：第一页先出，之后能往后加页；每页的 key 由 getKey(pageIndex, previousPageData) 算；返回 null 表示没有下一页，别再请求。size 限制页数；reachedEnd、pageKeys 要正确。mutate 要能按精确 key 或 matcher 更新，支持乐观更新和失败回滚；mutateInfinite 要能改某一页，别把其它页搅乱。

普通 swrFetch 缓存别弄坏。在仓库根目录跑 npm test。
