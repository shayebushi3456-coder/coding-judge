# go-zero core/mapping Unmarshal/Marshal 测试方案

## 1. 测试目标

验收 go-zero `core/mapping`：基于 tag 的 `Unmarshaler`（map/JSON/YAML 入结构体）、字段选项（default/env/optional/options/range/string/inherit）、`Marshal` 回写与校验，以及 `Valuer` 递归取值/合并。对齐基准提交完整行为。

预期实现改动约 **700–950 行**（问题现场对 4 个实现文件挖空约 800+ 行核心逻辑），集中在 **4 个源文件**。与既有 Casbin model 题、go-zero rest/handler 题均不重复。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/zeromicro/go-zero
- 基准标签：`v1.7.3`
- 基准提交：`796dd5b6e2df35969a0c8716dd5f26b19e506ef8`
- 复杂度：难（反射映射、嵌套/切片/map、选项解析、区间与枚举、继承 Valuer、Marshal 校验）
- 实现文件（仅 4 个）：
  1. `core/mapping/unmarshaler.go`（约 1166 行，挖空主体后保留类型与 Option 壳）
  2. `core/mapping/utils.go`（约 661 行，挖空字符串转换/选项与区间解析/校验赋值）
  3. `core/mapping/marshaler.go`（约 186 行）
  4. `core/mapping/valuer.go`（约 112 行，挖空递归合并取值）

合计基准约 **2125 行**；问题现场保留可编译壳后，需恢复核心逻辑约 **700–950 行**（按挖空深度控制在此区间）。

## 3. 被剥离功能说明（仅评测方可见）

| 文件 | 内容 |
|---|---|
| `unmarshaler.go` | `Unmarshal`/`UnmarshalValuer`、fillMap/Slice、processField*、匿名字段、env/default、opaque/canonical keys、duration、错误构造 |
| `utils.go` | `convertTypeFromString`、`parseKeyAndOptions`/`parseOption`/`parseNumberRange`、`setValueFromString`、`validate*Range`/`validateValueInOptions` |
| `marshaler.go` | `Marshal`、`processMember`、`validate`/`validateOptional`/`validateOptions`/`validateRange` |
| `valuer.go` | `simpleValuer`/`recursiveValuer` 的 Parent 链与 map 字段向上合并 |

保留不动：`fieldoptions.go`、`jsonunmarshaler.go`、`yamlunmarshaler.go`、`tomlunmarshaler.go`（它们依赖上述实现）。

隐藏 oracle：基准提交中 `core/mapping/*_test.go`（尤其 `unmarshaler_test.go`、`utils_test.go`、`marshaler_test.go`、`valuer_test.go`、`jsonunmarshaler_test.go`、`yamlunmarshaler_test.go`）。

### 对照要点

1. `UnmarshalKey` / `NewUnmarshaler` + `WithStringValues` / `WithDefault` / `WithCanonicalKeyFunc` / `WithOpaqueKeys`
2. 必填缺失、optional、`optional=dep` / `optional=!dep` 互斥与同现
3. `default=`、`env=`、`options=`、`range=[l,r]` 开闭区间
4. `string` 选项与 fromString 全局选项；嵌套 struct、slice、map、指针、`time.Duration`
5. 点分链式键与 opaque 整键；canonical key 函数
6. inherit 从父 Valuer 取字段；匿名嵌入 required/optional
7. `Marshal` 按 tag 分组写出，并做 optional/options/range 校验
8. `recursiveValuer`：当前无 key 时向上查找；值为 map 时与父级同名 map 合并（子覆盖父）

## 4. 问题现场构造方案（仅评测方可见）

1. **`unmarshaler.go`**：保留 `Unmarshaler`/`UnmarshalOption`/`unmarshalOptions`、常量与错误变量、`NewUnmarshaler`、四个 `With*`、`UnmarshalKey` 签名；`Unmarshal`/`UnmarshalValuer` 及全部 `fill*`/`process*`/`unmarshal*` 退化为固定错误或空操作（错误文案勿写 “not implemented”）。可保留 `join`/`newInitError` 等小工具以免无关编译失败，但不得保留真实映射逻辑。
2. **`utils.go`**：保留导出 `Deref`/`Repr`/`SetValue`/`SetMapIndexValue`/`ValidatePtr` 的最小正确实现（过短且无行为暗示）；`convertTypeFromString`、`parseKeyAndOptions`、`parseOption`、`parseNumberRange`、`parseSegments`、`setValueFromString`、`validateAndSetValue`、`validateNumberRange`、`validateValueInOptions` 等退化为空返回/固定错误。保留 `errUnsupportedType` 等包级错误变量供编译。
3. **`marshaler.go`**：保留 `Marshal` 签名；函数体返回空 map 或固定错误；内部 `processMember`/`validate*` 空实现。
4. **`valuer.go`**：保留类型与 `mapValuer.Value`；`simpleValuer`/`recursiveValuer` 的 `Value`/`Parent` 退化为仅当前层查找、不做父级合并。
5. **测试占位**：将 `unmarshaler_test.go`、`utils_test.go`、`marshaler_test.go`、`valuer_test.go`、`jsonunmarshaler_test.go`、`yamlunmarshaler_test.go`、`tomlunmarshaler_test.go` 换为无行为占位（或删除具体断言用例），避免泄题。`fieldoptions_test.go` 可保留或一并占位。

### 预期失败 / 回归

- 恢复基准 `*_test.go` 后，`go test ./core/mapping/` 应大量失败。
- 剥离范围外：`core/stringx`、`core/lang` 等无关包测试应仍可通过；不要改 `rest/`、`zrpc/`。

### 避免提示性残留

无 TODO / not implemented；勿在题面或代码注释中写文件清单与 commit；壳函数可用中性短注释或不写注释。

## 5. 测试分层

- 公开：题面自然语言（映射、约束、继承、Marshal）
- 隐藏：基准 mapping 包全量测试为 oracle
- 回归：其它 core 小包抽样

## 6. 环境准备

- Go 1.20+
- 在问题现场 `repo/`（go-zero module root）执行

## 7. 推荐执行命令

```bash
cd repo
go test ./core/mapping/ -count=1
# 隐藏（评测方先恢复基准 *_test.go 后）：
go test ./core/mapping/ -count=1
```

## 8. 公开测试设计

覆盖题面模糊意图：带 tag 结构体从 map 灌入；缺省/可选/区间；嵌套与切片；Marshal 校验。不断言内部符号名。

## 9. 隐藏测试设计（应对齐基准提交完整行为）

以基准 `796dd5b6e2df35969a0c8716dd5f26b19e506ef8` 的 `core/mapping/*_test.go` 全文为 oracle，重点：

- `TestUnmarshal*` 系列：基础类型、嵌套、slice/map、duration、fromString
- optional / optional 依赖 / default / env / options / range
- canonical key、opaque keys、fillDefault
- `TestMarshal*`：写出分组与校验失败路径
- `Test*Valuer*` / inherit：父级合并
- JSON/YAML 入口与 Unmarshaler 一致性

不得把完整断言粘贴进 `task.md`。

## 10. 类型测试设计

Go 编译通过即可；无独立 ts 类型检查。审查导出 API 签名与基准一致（`NewUnmarshaler`、`UnmarshalKey`、`Marshal`、`Valuer`、各 `With*`）。

## 11. 回归测试范围（剥离范围外不得破坏）

- `go test ./core/stringx/ ./core/lang/ -count=1` 应通过
- 勿修改 `rest/handler` 等已有题目模块以“绕过” mapping

## 12. 代码审查检查点

- `Policy`/`PolicyMap` 无关；关注反射路径是否处理 Ptr/Struct/Slice/Map
- `parseNumberRange` 开闭区间与错误
- `optional=!dep` 互斥语义
- `recursiveValuer` map 合并不覆盖已有子键
- 错误信息与基准格式接近（隐藏测试若断言文案则必须一致）

## 13. 推荐评分标准

| 等级 | 标准 |
|---|---|
| 优秀 | 隐藏 mapping 全量测试通过，且未改无关包 |
| 良好 | 核心 Unmarshal + 选项通过，Marshal/继承有少量失败 |
| 及格 | 基本 map→struct 与 default/optional 可用，复杂 range/inherit 不足 |
| 不及格 | 仅保留空壳编译，或通过改测试/删断言蒙混 |

## 14. 失败判定条件

- 恢复基准测试后 `go test ./core/mapping/` 失败
- 为让测试通过而篡改/删除隐藏测试
- 把映射逻辑挪到 jsonunmarshaler 等包装文件绕开四文件职责（审查扣分）

## 15. 测试组织建议

评测方保留基准 mapping 测试副本于内部；问题现场仅占位测试；评分时覆盖回基准测试再跑。

## 16. 最小测试集建议

优先：`unmarshaler_test.go` 中基础 Unmarshal、optional、default、range；`marshaler_test.go`；`valuer` inherit；再扩 JSON/YAML。

## 17. 不得泄露给被测模型的内容清单

- 仓库 URL、基准 tag/SHA
- 必须修改的 4 个文件清单与挖空手法
- 隐藏测试全文与断言
- “还原/被删/剥离” 等元叙事
- 内部符号逐步实现伪代码
