在当前代码库把 HMR 这块缺的能力补上。

模块热更新要能顺着依赖图往上冒泡：某个模块变了，先通知它自己的 accept 回调；它不接的话就继续找 importer，一直找到能接住的边界。边界上要能拿到正确的新模块，dispose 要在替换前跑完，数据可以通过 hot.data 留给下一轮。找不到任何 accept 边界时，别硬撑，走整页刷新。

还要能主动剪枝和失效：模块可以 prune 掉不再需要的依赖，也可以 invalidate 自己逼着从边界重新来一遍。CSS 更新尽量走样式热替换（返回 css-update），别动不动整页刷。import.meta.hot 风格的 accept / dispose / prune / invalidate 要在 hotRuntime 里接好，并和 propagateUpdate / pruneModule 对上。

模块图基础链路别搞坏。在仓库根目录跑 npm test。
