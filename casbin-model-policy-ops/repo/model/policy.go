// Copyright 2017 The casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package model

import (
	"github.com/casbin/casbin/v2/rbac"
)

type (
	PolicyOp int
)

const (
	PolicyAdd PolicyOp = iota
	PolicyRemove
)

const DefaultSep = ","

func (model Model) BuildIncrementalRoleLinks(rmMap map[string]rbac.RoleManager, op PolicyOp, sec string, ptype string, rules [][]string) error {
	return nil
}

func (model Model) BuildRoleLinks(rmMap map[string]rbac.RoleManager) error {
	return nil
}

func (model Model) BuildIncrementalConditionalRoleLinks(condRmMap map[string]rbac.ConditionalRoleManager, op PolicyOp, sec string, ptype string, rules [][]string) error {
	return nil
}

func (model Model) BuildConditionalRoleLinks(condRmMap map[string]rbac.ConditionalRoleManager) error {
	return nil
}

func (model Model) PrintPolicy() {
}

func (model Model) ClearPolicy() {
}

func (model Model) GetPolicy(sec string, ptype string) ([][]string, error) {
	return nil, nil
}

func (model Model) GetFilteredPolicy(sec string, ptype string, fieldIndex int, fieldValues ...string) ([][]string, error) {
	return nil, nil
}

func (model Model) HasPolicyEx(sec string, ptype string, rule []string) (bool, error) {
	return false, nil
}

func (model Model) HasPolicy(sec string, ptype string, rule []string) (bool, error) {
	return false, nil
}

func (model Model) HasPolicies(sec string, ptype string, rules [][]string) (bool, error) {
	return false, nil
}

func (model Model) AddPolicy(sec string, ptype string, rule []string) error {
	return nil
}

func (model Model) AddPolicies(sec string, ptype string, rules [][]string) error {
	return nil
}

func (model Model) AddPoliciesWithAffected(sec string, ptype string, rules [][]string) ([][]string, error) {
	return nil, nil
}

func (model Model) RemovePolicy(sec string, ptype string, rule []string) (bool, error) {
	return false, nil
}

func (model Model) UpdatePolicy(sec string, ptype string, oldRule []string, newRule []string) (bool, error) {
	return false, nil
}

func (model Model) UpdatePolicies(sec string, ptype string, oldRules, newRules [][]string) (bool, error) {
	return false, nil
}

func (model Model) RemovePolicies(sec string, ptype string, rules [][]string) (bool, error) {
	return false, nil
}

func (model Model) RemovePoliciesWithAffected(sec string, ptype string, rules [][]string) ([][]string, error) {
	return nil, nil
}

func (model Model) RemoveFilteredPolicy(sec string, ptype string, fieldIndex int, fieldValues ...string) (bool, [][]string, error) {
	return false, nil, nil
}

func (model Model) GetValuesForFieldInPolicy(sec string, ptype string, fieldIndex int) ([]string, error) {
	return nil, nil
}

func (model Model) GetValuesForFieldInPolicyAllTypes(sec string, fieldIndex int) ([]string, error) {
	return nil, nil
}

func (model Model) GetValuesForFieldInPolicyAllTypesByName(sec string, field string) ([]string, error) {
	return nil, nil
}
