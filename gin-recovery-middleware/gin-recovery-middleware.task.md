框架要有 panic 恢复中间件：handler 里崩了不能把进程打挂，默认回 500；也能挂自定义处理函数。日志打到指定 writer，debug 模式把请求头带上，Authorization 要打码。遇到 broken pipe / connection reset 别硬写状态码，记 error 后 Abort 就行。本地 go test 验证。
