在当前代码库把任务重试、唯一任务和定时调度这几块补上。

任务失败后要能按策略重试：支持 MaxRetry、退避（可用 Server.SetBackoff），超过次数进 archive，别无限打下游。重试要把 RetryCount 写上，并按 backoff 推迟 ProcessAt；成功则释放 UniqueKey。

唯一任务：Enqueue 时同一 UniqueKey 在占用期内不能再塞重复的，冲突返回 ErrDuplicateTask；成功处理完后 key 才能释放。

定时调度：Scheduler.RegisterEvery 注册周期任务；RunDue 到点后 Enqueue，并推进下一拍，别漏跑也别叠跑。

基础 Enqueue / ProcessDue 成功路径别搞坏。在仓库根目录跑 go test ./...。
