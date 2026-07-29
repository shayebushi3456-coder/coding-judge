# listmonk 列表权限过滤 测试方案

## 1. 测试目标

验收「按用户权限过滤邮件列表 ID」的完整运行时行为：全局权限短路 + 单列表权限过滤，并保证无关权限 API 不受影响。

## 2. 目标仓库与基准提交

- 仓库：https://github.com/knadh/listmonk
- 基准提交：`0a27de16c6e23b7d4b84d4d91fe59bea10877ad1`（tag `v4.1.0`）
- 语言：Go

## 3. 被剥离功能说明（仅评测方可见）

### 原仓库定位

- 文件：`models/models.go`
- 符号：`(*User).FilterListsByPerm`
- 相关常量：`models/permissions.go` 中 `PermListGetAll` / `PermListManageAll` / `PermListGet` / `PermListManage`
- 基准仓无该函数现成单测，隐藏测试由评测方注入

### 功能边界与复杂度

- 全局权限短路（get_all / manage_all）
- 单列表权限按 `get` / `manage` 分支过滤
- 无匹配时返回空切片、不 panic
- 涉及运行时行为 + 权限契约（中等）

### 与基准提交的行为对照要点

完整实现会在无全局权限时遍历 `ListPermissionsMap`，按场景检查 `list:get` 或 `list:manage`。

## 4. 问题现场构造方案（仅评测方可见）

### 建议剥离范围

- 删除 `FilterListsByPerm` 中单列表过滤循环
- 无全局权限时改为 `return []int{}`
- 保留函数签名、全局权限短路分支、`HasPerm`、权限常量

### 建议保留的公开 API

- `(*User).FilterListsByPerm` 签名与导出
- `HasPerm`、`PermissionsMap` / `ListPermissionsMap` 字段

### 剥离后预期失败范围

- 隐藏测试中「单列表 get/manage 过滤」用例失败
- 全局权限短路用例仍可通过

### 剥离范围外应保持

- `HasPerm`、其它 models 序列化/模板逻辑

### 避免提示性残留

- 不写 TODO / FIXME / not implemented
- 不在注释中写「此处曾删除单列表过滤」

## 5. 测试分层

- 公开：题面黑盒行为描述
- 隐藏：注入单测对齐基准行为
- 回归：`HasPerm` 等无关能力

## 6. 环境准备

```bash
git clone https://github.com/knadh/listmonk.git
cd listmonk
git checkout 0a27de16c6e23b7d4b84d4d91fe59bea10877ad1
# 按第 4 节构造问题现场后，将代码放入 coding-judge/.../repo/
```

无需 Postgres。

## 7. 推荐执行命令

```bash
go test ./models -run TestFilterListsByPerm -count=1
```

## 8. 公开测试设计

题面级场景：全局权限原样返回；无全局时按单列表权限过滤；无匹配返回空。

## 9. 隐藏测试设计（对齐基准提交完整行为）

评测方在 `models/filter_lists_perm_hidden_test.go` 注入：

```go
package models

import (
	"reflect"
	"testing"
)

func TestFilterListsByPerm(t *testing.T) {
	t.Run("get_all returns all", func(t *testing.T) {
		u := &User{PermissionsMap: map[string]struct{}{PermListGetAll: {}}}
		got := u.FilterListsByPerm([]int{1, 2, 3}, true, false)
		if !reflect.DeepEqual(got, []int{1, 2, 3}) {
			t.Fatalf("got %v", got)
		}
	})
	t.Run("manage_all returns all", func(t *testing.T) {
		u := &User{PermissionsMap: map[string]struct{}{PermListManageAll: {}}}
		got := u.FilterListsByPerm([]int{9, 8}, false, true)
		if !reflect.DeepEqual(got, []int{9, 8}) {
			t.Fatalf("got %v", got)
		}
	})
	t.Run("per-list get filters", func(t *testing.T) {
		u := &User{
			PermissionsMap: map[string]struct{}{},
			ListPermissionsMap: map[int]map[string]struct{}{
				1: {PermListGet: {}},
				2: {PermListManage: {}},
				3: {PermListGet: {}, PermListManage: {}},
			},
		}
		got := u.FilterListsByPerm([]int{1, 2, 3, 4}, true, false)
		if !reflect.DeepEqual(got, []int{1, 3}) {
			t.Fatalf("got %v", got)
		}
	})
	t.Run("per-list manage filters", func(t *testing.T) {
		u := &User{
			PermissionsMap: map[string]struct{}{},
			ListPermissionsMap: map[int]map[string]struct{}{
				1: {PermListGet: {}},
				2: {PermListManage: {}},
				3: {PermListGet: {}, PermListManage: {}},
			},
		}
		got := u.FilterListsByPerm([]int{1, 2, 3, 4}, false, true)
		if !reflect.DeepEqual(got, []int{2, 3}) {
			t.Fatalf("got %v", got)
		}
	})
	t.Run("no matching perms", func(t *testing.T) {
		u := &User{
			PermissionsMap:     map[string]struct{}{},
			ListPermissionsMap: map[int]map[string]struct{}{1: {PermListGet: {}}},
		}
		got := u.FilterListsByPerm([]int{1, 2}, false, true)
		if len(got) != 0 {
			t.Fatalf("got %v", got)
		}
	})
}
```

Oracle：基准提交中 `FilterListsByPerm` 完整实现。

## 10. 类型测试设计

Go 编译通过即可；无独立类型检查步骤。

## 11. 回归测试范围

- `HasPerm` 行为不变
- 其它 models 包逻辑不被误改

## 12. 代码审查检查点

- get 与 manage 分支互不串权
- 无全局权限时不得全量放行
- 无 panic / nil map 解引用（空 map 应安全）

## 13. 推荐评分标准

- 隐藏测试全过：通过
- 仅全局短路、单列表仍空：不通过
- 破坏 `HasPerm`：不通过

## 14. 失败判定条件

- `go test ./models -run TestFilterListsByPerm` 失败
- 无法编译

## 15. 测试组织建议

隐藏测试仅评测方注入，不放进发给被测的 `repo/`。

## 16. 最小测试集建议

第 9 节五个子测即可。

## 17. 不得泄露给被测模型的内容清单

- 本 test-plan 全文
- 隐藏测试文件
- 「功能被剥离/删除」表述
- 基准实现源码摘录
- 必改文件/函数名清单（题面已避免点名）
