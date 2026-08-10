# 多轮对话任务 · listmonk 订阅者/活动嵌套补全 — 测试方案

> 仅评测方。被测只看 `*.task.md` + `repo/`。

## 1. 测试目标

嵌套多轮：R2⊃R1 … R5⊃R1–R4。验收对齐 listmonk **v4.1.0**（`0a27de16c6e23b7d4b84d4d91fe59bea10877ad1`）完整行为。

## 2. 目标仓库与基准

- 仓库：https://github.com/knadh/listmonk
- 基准：`0a27de16c6e23b7d4b84d4d91fe59bea10877ad1`（tag `v4.1.0`）
- 复杂度：复杂（多轮嵌套）
- 角色：业务应用开发

## 3. 被剥离功能（评测方）

| 轮 | 符号 | 残缺行为 |
|---|---|---|
| R1 | `Importer.SanitizeEmail` | 仅 ToLower+Trim，无 ParseAddress、无域名黑名单 |
| R2 | `Importer.ValidateFields` | 直接原样返回，不调 Sanitize、不补默认名 |
| R3 | `Core.InsertSubscriber` | 去掉 `subscribers_email_key` → 409 Conflict 分支 |
| R4 | `Core.AddSubscriptions` / `DeleteSubscriptions` | 空成功，不写库 |
| R5 | `Core.BlocklistSubscribers`；`UpdateCampaignStatus` 迁移表；`UnsubscribeByCampaign` | 拉黑/退订空成功；状态变更无合法边检查 |

## 4. 问题现场

见 `repo/`（已剥离）。构造手法：抽干关键逻辑 / 砍分支。无 TODO 暗示。

## 5. 嵌套依赖

```
R1 SanitizeEmail
 └─ R2 ValidateFields（调用/依赖规范化）
     └─ R3 InsertSubscriber 冲突语义
         └─ R4 名单 Add/Delete
             └─ R5 Blocklist + Campaign 状态机 + UnsubscribeByCampaign
```

后轮隐藏测可要求前轮回归。

## 6. 环境

- Go module；完整 API 测需 Postgres（listmonk 常规）。
- 本机可无 DB：以对照基准源码 + 注入单测为主。
- 命令参考：`go test ./internal/subimporter/ ./internal/core/ ...`（按注入测调整）

## 7. 公开验收（题面自然语言）

见 task 五轮：坏邮箱拒绝 → 字段整理 → 重复邮箱冲突 → 名单真实写入 → 拉黑/活动非法迁移拒绝/退订生效。

## 8. 隐藏测试建议

1. SanitizeEmail：非法/`Name <mail>` 形式拒绝；blocklist 域拒绝；合法小写返回。
2. ValidateFields：空名生成；超长邮箱拒绝；调用 Sanitize。
3. InsertSubscriber：唯一约束 → 409 + emailExists 文案键。
4. Add/DeleteSubscriptions：Exec 被调用 / DB 有行。
5. BlocklistSubscribers：状态变更；UpdateCampaignStatus：draft→running OK，finished→running 400；UnsubscribeByCampaign：Exec 参数正确。

对照：基准 commit 同名函数实现。

## 9. 评分

- 按轮记分；R1 失败则后续轮预期连锁失败（嵌套题）。
- 全轮隐藏测绿 + 无结构破坏 → Pass。

## 10. 勿泄露

题面不写仓址/SHA/函数名清单/扣了什么。
