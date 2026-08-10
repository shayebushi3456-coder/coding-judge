# 元信息 · 多轮对话任务-listmonk-subscriber-campaign

- 标题关键字：多轮对话任务
- 角色：backend / 业务应用开发（`role-backend-业务应用开发.md`）
- 仓库：https://github.com/knadh/listmonk
- 基准 SHA：`0a27de16c6e23b7d4b84d4d91fe59bea10877ad1`（v4.1.0）
- 复杂度：复杂（5 轮硬嵌套）
- 任务类型：incomplete-feature + multiturn nested

## 构造说明

- 扣功能前上述能力在基准完整：是
- 手法：抽干 / 砍分支；保留函数签名，工程可加载
- 未以 PR/Issue 为题源：是

## 发给被测

- `多轮对话任务-listmonk-subscriber-campaign.task.md`
- `repo/`（已剥离现场）
- 不要发 test-plan / meta

## 核验

- clone + checkout v4.1.0：是（本地 `_scratch/listmonk-eval`）
- 路径：`internal/subimporter/importer.go`、`internal/core/subscribers.go`、`subscriptions.go`、`campaigns.go`
- 出题环境：本机可能无 `go`/Postgres；隐藏测以基准对照 + 评测机执行为准

## 防泄题

- task 无 URL/SHA/内部符号清单：是
- 不读仓库不能直接写出补丁：是
