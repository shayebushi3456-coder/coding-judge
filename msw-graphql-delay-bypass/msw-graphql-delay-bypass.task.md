在当前代码库把这几块能力补齐。

先把 GraphQL mocking 做完整：graphql.query / mutation / operation / link 要能按 operation type 和 name 拦住请求，DocumentNode 当名字也能用；请求体要从 GET querystring、POST JSON、multipart 里解析出 query/variables，再匹配 handler。parse 和 predicate 逻辑要正确，匿名 operation 该警告就警告。

再补 delay：支持毫秒数，也要支持 real / infinite 模式，别传非法值直接炸。bypass 要能造出被 MSW 忽略的 Request，passthrough 要能在 handler 里放行当前请求。别把普通 http handler 弄坏，本地用 pnpm test:unit 验证。
