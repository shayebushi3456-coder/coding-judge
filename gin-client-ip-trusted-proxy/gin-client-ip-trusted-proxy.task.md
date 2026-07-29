我们服务跑在反向代理后面，需要从请求里拿到真实客户端 IP，用来做审计和限流。希望 ClientIP 在配置了受信代理时，能认 RemoteAddr 是否在受信 CIDR 里，并顺着 X-Forwarded-For / X-Real-IP 这类头从后往前解析，跳过仍然受信的代理，落到第一个非受信或链头的客户端 IP；头非法或远端不受信时就退回 RemoteAddr 的 IP。另外还要支持 TrustedPlatform / 旧 AppEngine 那种平台头优先。SetTrustedProxies 那些配置接口保持可用。

仓库 https://github.com/gin-gonic/gin ，基准提交 75ccf94d605a05fe24817fc2f166f6f2959d5cea。用 go test 相关用例验证即可。
