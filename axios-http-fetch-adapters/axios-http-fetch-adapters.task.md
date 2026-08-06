在当前代码库把 Node 那边真正发请求、以及走浏览器/现代 runtime 的 fetch 发请求这两块补齐。

Node 里要能真的打出去：http/https、重定向跟着走、代理和环境变量代理、超时、取消、各种请求体（字符串、Buffer、流、FormData 之类）和响应解压都要能对付；进度回调、流式响应、data URI、自定义 dns lookup 这些边角也别漏。代理那套内部辅助别丢，单测里会用到。

fetch 那条也要能用：有原生 fetch 才启用；超时和取消要合成信号；上传下载进度、流式请求体、按 responseType 取正文，网络类 TypeError 要收成统一的网络错误。

选适配器、xhr 那条、拦截器和取消 token 先别搞坏。改完在仓库根目录跑 `npm run test:mocha`。
