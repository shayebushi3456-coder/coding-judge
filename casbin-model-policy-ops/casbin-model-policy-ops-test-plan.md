# Casbin Model 定义与策略运算 测试方案

## 1. 测试目标

验收 Casbin `model` 包：CONF/文本加载与 `AddDef`、策略 CRUD/过滤/字段聚合、角色链接（含条件与增量）、以及内置匹配 `FunctionMap`。对齐基准提交完整行为。

预期实现改动约 **900–1100 行**（落在 500–1000 难档上沿），集中在 **4 个源文件**。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/casbin/casbin
- 基准标签：`v2.103.0`
- 基准提交：`d4fc6976a9111013a372c6f60953ec92b1d4cf28`
- 复杂度：难（策略索引、优先级插入、主体层级排序、RBAC 链接）
- 实现文件（仅 4 个）：
  1. `model/model.go`（约 438 行）
  2. `model/policy.go`（约 482 行）
  3. `model/assertion.go`（约 194 行）
  4. `model/function.go`（约 66 行）

合计约 **1180 行**基准实现；问题现场挖空后需恢复的核心逻辑约 **900–1050 行**。

## 3. 被剥离功能说明（仅评测方可见）

| 文件 | 内容 |
|---|---|
| `model.go` | `AddDef`、section 加载、`SortPoliciesBy*`、`ToText`/`Copy`/`GetFieldIndex`、层级图 |
| `policy.go` | `Add/Remove/Update/Has/GetFiltered*`、`Build*RoleLinks`、字段取值 |
| `assertion.go` | `build*RoleLinks`、条件链接、`copy` |
| `function.go` | `LoadFunctionMap` 注册 keyMatch/regexMatch/ipMatch/globMatch 等 |

隐藏 oracle：`model/model_test.go`、`model_test.go`，以及依赖模型加载/策略的 `enforcer_test.go` 抽样。

### 对照要点

1. 必选 section 缺失时报错文案与基准一致  
2. `r`/`p` token 前缀、`g` ParamsTokens、`m` 中 `in` 括号替换  
3. `PolicyMap` 索引在增删后重排；priority 字段插入位置  
4. `RemoveFilteredPolicy` 空字符串通配语义  
5. `HasPolicyEx` 对 p/g 长度校验  
6. `_` 数量校验与 role link / conditional link  
7. `LoadFunctionMap` 含 keyMatch、keyMatch2–5、keyGet*、regexMatch、ipMatch、globMatch  

## 4. 问题现场构造方案（仅评测方可见）

1. **`model/model.go`**：保留 `Model`/`AssertionMap`、section 常量、`NewModel`/`SetLogger`/`GetLogger`/`GetAssertion`/`hasSection` 骨架；`AddDef`/加载/排序/`ToText`/`Copy`/`GetFieldIndex`/层级图退化为空或固定错误（错误文案勿写 “not implemented”）。  
2. **`model/policy.go`**：保留 `PolicyOp`/`DefaultSep`；所有方法空返回。  
3. **`model/assertion.go`**：保留 `Assertion` 字段；链接与 `copy` 空实现（`setLogger` 可保留赋值）。  
4. **`model/function.go`**：`LoadFunctionMap` 返回空表；`AddFunction`/`GetFunctions` 无行为。  
5. **测试占位**：`model/model_test.go`、根目录 `model_test.go` 换占位，避免泄题。

保留：`enforcer.go`、`rbac`、`util`、adapter 等不改。

### 预期失败 / 回归

恢复基准 model 测试后应大量失败；与 model 无关的纯 util 测试应仍可通过。

### 避免提示性残留

无 TODO / not implemented；勿在题面或代码注释中写文件清单与 commit。

## 5–7. 环境与命令

```bash
cd repo
go test ./model/ -count=1
go test . -count=1 -run Model
# 隐藏：还原基准 model*_test.go 后重复
```

## 8–9. 公开 / 隐藏测试

公开：题面模糊的加载/策略/角色/函数表。  
隐藏：基准 `model/model_test.go`、`model_test.go` 全文为 oracle。

## 10–14. 类型 / 回归 / 审查 / 评分 / 失败

- 编译通过；审查 PolicyMap 一致性、priority 插入、条件角色参数  
- 隐藏全过为优秀；仅空壳编译为不及格  
- 不得改 enforcer 绕过 model 包

## 15–17. 组织与不可泄露

仓库 URL、SHA、符号表、壳策略、隐藏断言不得进入 `task.md`。
