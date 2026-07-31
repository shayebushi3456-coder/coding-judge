# gin form 默认值与时间绑定 测试方案

## 1. 测试目标

验收 gin `binding` 包 form/uri 映射中的 **default 标签** 与 **time.Time 高级解析**（format/utc/location/unix），对齐 gin v1.10.0。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/gin-gonic/gin
- 基准提交：`75ccf94d605a05fe24817fc2f166f6f2959d5cea`（tag v1.10.0）
- 复杂度：中等偏上
- 模块：`binding/form_mapping.go`

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- `binding/form_mapping.go`：`tryToSetValue` 解析 `default=`；`setByForm` 缺参填默认；`setTimeField`（RFC3339 / 自定义 format / unix / unixnano / time_utc / time_location / 空值）
- 测试：`binding/form_mapping_test.go` 的 `TestMappingDefault`、`TestMappingTime`；`binding/binding_test.go` 中含 unix 时间的用例

### 对照要点

- 缺参时 default 作用于 int/slice/array
- time_format、时区、unix 系列与错误路径

## 4. 问题现场构造方案（仅评测方可见）

1. `setByForm`：若 form 无该 key，直接 `return false, nil`（忽略 `opt.isDefaultExists`）
2. `setTimeField`：退化为仅 `time.Parse(time.RFC3339, val)`（空字符串 → 零值）；去掉 unix/location/utc/自定义 format 分支
3. 可保留 `tryToSetValue` 对 default 的解析（无效也无妨）或一并去掉解析，但勿留 TODO
4. 删除问题现场中 `TestMappingDefault`、`TestMappingTime`；裁剪/删除 `binding_test.go` 中依赖 unix 时间绑定的失败用例，避免无关噪音

### 预期失败

恢复上述测试后失败。

### 回归

`TestMappingBaseTypes`、`TestMappingSkipField`、切片/结构体等非 default/time 高级用例应通过。

## 5–7. 命令

```bash
go test ./binding -count=1
# 隐藏
go test ./binding -run 'TestMappingDefault|TestMappingTime' -count=1
```

## 8–17

公开：题面默认值与时间标签行为。  
隐藏：基准测试原文。  
评分：default 与 time 高级解析都过才算通过；只做 RFC3339 不算过。  
不可泄露：本 plan、文件/符号清单、仓库 URL/SHA。
