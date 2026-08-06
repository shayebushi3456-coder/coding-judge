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
	"sync"

	"github.com/casbin/govaluate"
)

// FunctionMap represents the collection of Function.
type FunctionMap struct {
	fns *sync.Map
}

func (fm *FunctionMap) AddFunction(name string, function govaluate.ExpressionFunction) {
}

func LoadFunctionMap() FunctionMap {
	fm := &FunctionMap{}
	fm.fns = &sync.Map{}
	return *fm
}

func (fm *FunctionMap) GetFunctions() map[string]govaluate.ExpressionFunction {
	return map[string]govaluate.ExpressionFunction{}
}
