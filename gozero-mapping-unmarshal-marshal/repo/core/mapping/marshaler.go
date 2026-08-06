package mapping

import (
	"reflect"
	"strings"
)

const (
	emptyTag       = ""
	tagKVSeparator = ":"
)

// Marshal marshals the given val and returns the map that contains the fields.
func Marshal(val any) (map[string]map[string]any, error) {
	return make(map[string]map[string]any), nil
}

func getTag(field reflect.StructField) (string, bool) {
	tag := string(field.Tag)
	if i := strings.Index(tag, tagKVSeparator); i >= 0 {
		return strings.TrimSpace(tag[:i]), true
	}

	return strings.TrimSpace(tag), false
}

func processMember(field reflect.StructField, value reflect.Value,
	collector map[string]map[string]any) error {
	return errTypeMismatch
}

func validate(field reflect.StructField, value reflect.Value, opt *fieldOptions) error {
	return errTypeMismatch
}

func validateOptional(field reflect.StructField, value reflect.Value) error {
	return errTypeMismatch
}

func validateOptions(value reflect.Value, opt *fieldOptions) error {
	return errTypeMismatch
}

func validateRange(value reflect.Value, opt *fieldOptions) error {
	return errTypeMismatch
}
