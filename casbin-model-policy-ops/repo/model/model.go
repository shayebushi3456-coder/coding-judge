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
	"fmt"
	"regexp"

	"github.com/casbin/casbin/v2/config"
	"github.com/casbin/casbin/v2/log"
)

// Model represents the whole access control model.
type Model map[string]AssertionMap

// AssertionMap is the collection of assertions, can be "r", "p", "g", "e", "m".
type AssertionMap map[string]*Assertion

const defaultDomain string = ""
const defaultSeparator = "::"

var sectionNameMap = map[string]string{
	"r": "request_definition",
	"p": "policy_definition",
	"g": "role_definition",
	"e": "policy_effect",
	"m": "matchers",
}

var requiredSections = []string{"r", "p", "e", "m"}

func loadAssertion(model Model, cfg config.ConfigInterface, sec string, key string) bool {
	return false
}

var paramsRegex = regexp.MustCompile(`\((.*?)\)`)

func getParamsToken(value string) []string {
	return nil
}

func (model Model) AddDef(sec string, key string, value string) bool {
	return false
}

func getKeySuffix(i int) string {
	return ""
}

func loadSection(model Model, cfg config.ConfigInterface, sec string) {
}

func (model Model) SetLogger(logger log.Logger) {
	for _, astMap := range model {
		for _, ast := range astMap {
			ast.logger = logger
		}
	}
	model["logger"] = AssertionMap{"logger": &Assertion{logger: logger}}
}

func (model Model) GetLogger() log.Logger {
	return model["logger"]["logger"].logger
}

func NewModel() Model {
	m := make(Model)
	m.SetLogger(&log.DefaultLogger{})
	return m
}

func NewModelFromFile(path string) (Model, error) {
	return NewModel(), fmt.Errorf("invalid model")
}

func NewModelFromString(text string) (Model, error) {
	return NewModel(), fmt.Errorf("invalid model")
}

func (model Model) LoadModel(path string) error {
	return fmt.Errorf("invalid model")
}

func (model Model) LoadModelFromText(text string) error {
	return fmt.Errorf("invalid model")
}

func (model Model) loadModelFromConfig(cfg config.ConfigInterface) error {
	return fmt.Errorf("invalid model")
}

func (model Model) hasSection(sec string) bool {
	return model[sec] != nil
}

func (model Model) GetAssertion(sec string, ptype string) (*Assertion, error) {
	if model[sec] == nil {
		return nil, fmt.Errorf("missing required section %s", sec)
	}
	if model[sec][ptype] == nil {
		return nil, fmt.Errorf("missing required definition %s in section %s", ptype, sec)
	}
	return model[sec][ptype], nil
}

func (model Model) PrintModel() {
}

func (model Model) SortPoliciesBySubjectHierarchy() error {
	return nil
}

func getSubjectHierarchyMap(policies [][]string) (map[string]int, error) {
	return map[string]int{}, nil
}

func getNameWithDomain(domain string, name string) string {
	return domain + defaultSeparator + name
}

func (model Model) SortPoliciesByPriority() error {
	return nil
}

var (
	pPattern = regexp.MustCompile("^p_")
	rPattern = regexp.MustCompile("^r_")
)

func (model Model) ToText() string {
	return ""
}

func (model Model) Copy() Model {
	return NewModel()
}

func (model Model) GetFieldIndex(ptype string, field string) (int, error) {
	return -1, fmt.Errorf(field + " index is not set, please use enforcer.SetFieldIndex() to set index")
}
