在当前代码库把「一堆带 id 的对象放进 state 里统一管」这套先搭起来。

要能初始化空表，也能往里加一条或一批，按 id 删掉，重复的 id 别乱盖。set 一类覆盖写入先有个基础就行。别把 createSlice、异步 thunk 那些搞坏。packages/toolkit 里跑相关测试。
