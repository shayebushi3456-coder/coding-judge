帮我在这个代码库里把 options 写法那套映射、把 store 拆成 ref、还有热更新接上这几块补上。

以前用 options 的组件里要能直接把 store 的状态、计算、方法摊到 computed/methods 里用，整店映射也要有，后缀能改。状态有的还得能写回去。别只支持一种传参方式，数组和对象映射都要能用。

composition 那边把 store 拆成一个个 ref 拿去用，方法那些别跟着拆出来，只留状态和计算相关的。vue2 那边也别崩。

开发时改 store 能热更新接上，旧状态尽量挪到新的上面，id 对不上就该作废重来。生产环境这套热更新别瞎干活。

defineStore、插件那些现成的先别弄坏。弄完在 packages/pinia 下面跑一下 pnpm test。
