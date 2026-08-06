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
	"github.com/casbin/casbin/v2/log"
	"github.com/casbin/casbin/v2/rbac"
)

// Assertion represents an expression in a section of the model.
// For example: r = sub, obj, act.
type Assertion struct {
	Key           string
	Value         string
	Tokens        []string
	ParamsTokens  []string
	Policy        [][]string
	PolicyMap     map[string]int
	RM            rbac.RoleManager
	CondRM        rbac.ConditionalRoleManager
	FieldIndexMap map[string]int

	logger log.Logger
}

func (ast *Assertion) buildIncrementalRoleLinks(rm rbac.RoleManager, op PolicyOp, rules [][]string) error {
	return nil
}

func (ast *Assertion) buildRoleLinks(rm rbac.RoleManager) error {
	return nil
}

func (ast *Assertion) buildIncrementalConditionalRoleLinks(condRM rbac.ConditionalRoleManager, op PolicyOp, rules [][]string) error {
	return nil
}

func (ast *Assertion) buildConditionalRoleLinks(condRM rbac.ConditionalRoleManager) error {
	return nil
}

func (ast *Assertion) addConditionalRoleLink(rule []string, domainRule []string) error {
	return nil
}

func (ast *Assertion) setLogger(logger log.Logger) {
	ast.logger = logger
}

func (ast *Assertion) copy() *Assertion {
	return &Assertion{Key: ast.Key, Value: ast.Value}
}
