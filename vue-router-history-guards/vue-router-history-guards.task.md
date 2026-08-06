在当前代码库把几种 history 和导航守卫这几块补上。

浏览器要能用正常的 History API 那种，也要有带 # 的，SSR/测试用的内存版也要有。push、replace、前进后退、listen、base 和 href 拼出来这些得能干活；hash 那种 base 怎么带井号要自己处理好，别把别的路由主流程搞崩。

组件里离开前、更新前那种钩子要能挂上卸掉；导航过程里 beforeEnter、组件里的 beforeRouteEnter/Update/Leave，还有把异步组件先加载再抽守卫、把守卫收成 Promise、next 回调那套都要对得上，重定向和取消也得能表达出来。

匹配器、RouterView、滚动这些先别弄坏。在 packages/router 里跑 `pnpm test:unit`。
