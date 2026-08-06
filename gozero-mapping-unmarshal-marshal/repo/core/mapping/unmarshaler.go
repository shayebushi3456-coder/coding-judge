package mapping

import (
	"encoding"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/zeromicro/go-zero/core/jsonx"
	"github.com/zeromicro/go-zero/core/lang"
	"github.com/zeromicro/go-zero/core/proc"
	"github.com/zeromicro/go-zero/core/stringx"
)

const (
	defaultKeyName   = "key"
	delimiter        = '.'
	ignoreKey        = "-"
	numberTypeString = "number"
)

var (
	errTypeMismatch     = errors.New("type mismatch")
	errValueNotSettable = errors.New("value is not settable")
	errValueNotStruct   = errors.New("value type is not struct")
	keyUnmarshaler      = NewUnmarshaler(defaultKeyName)
	durationType        = reflect.TypeOf(time.Duration(0))
	cacheKeys           = make(map[string][]string)
	cacheKeysLock       sync.Mutex
	defaultCache        = make(map[string]any)
	defaultCacheLock    sync.Mutex
	emptyMap            = map[string]any{}
	emptyValue          = reflect.ValueOf(lang.Placeholder)
)

type (
	// Unmarshaler is used to unmarshal with the given tag key.
	Unmarshaler struct {
		key  string
		opts unmarshalOptions
	}

	// UnmarshalOption defines the method to customize an Unmarshaler.
	UnmarshalOption func(*unmarshalOptions)

	unmarshalOptions struct {
		fillDefault  bool
		fromString   bool
		opaqueKeys   bool
		canonicalKey func(key string) string
	}
)

// NewUnmarshaler returns an Unmarshaler.
func NewUnmarshaler(key string, opts ...UnmarshalOption) *Unmarshaler {
	unmarshaler := Unmarshaler{
		key: key,
	}

	for _, opt := range opts {
		opt(&unmarshaler.opts)
	}

	return &unmarshaler
}

// UnmarshalKey unmarshals m into v with the tag key.
func UnmarshalKey(m map[string]any, v any) error {
	return keyUnmarshaler.Unmarshal(m, v)
}

// Unmarshal unmarshals m into v.
func (u *Unmarshaler) Unmarshal(i, v any) error {
	return u.unmarshal(i, v, "")
}

func (u *Unmarshaler) unmarshal(i, v any, fullName string) error {
	valueType := reflect.TypeOf(v)
	if valueType.Kind() != reflect.Ptr {
		return errValueNotSettable
	}

	elemType := Deref(valueType)
	switch iv := i.(type) {
	case map[string]any:
		if elemType.Kind() != reflect.Struct {
			return errTypeMismatch
		}

		return u.unmarshalValuer(mapValuer(iv), v, fullName)
	case []any:
		if elemType.Kind() != reflect.Slice {
			return errTypeMismatch
		}

		return u.fillSlice(elemType, reflect.ValueOf(v).Elem(), iv, fullName)
	default:
		return errUnsupportedType
	}
}

// UnmarshalValuer unmarshals m into v.
func (u *Unmarshaler) UnmarshalValuer(m Valuer, v any) error {
	return u.unmarshalValuer(simpleValuer{current: m}, v, "")
}

func (u *Unmarshaler) unmarshalValuer(m Valuer, v any, fullName string) error {
	return u.unmarshalWithFullName(simpleValuer{current: m}, v, fullName)
}

func (u *Unmarshaler) fillMap(fieldType reflect.Type, value reflect.Value,
	mapValue any, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) fillMapFromString(value reflect.Value, mapValue any) error {
	if !value.CanSet() {
		return errValueNotSettable
	}

	switch v := mapValue.(type) {
	case fmt.Stringer:
		if err := jsonx.UnmarshalFromString(v.String(), value.Addr().Interface()); err != nil {
			return err
		}
	case string:
		if err := jsonx.UnmarshalFromString(v, value.Addr().Interface()); err != nil {
			return err
		}
	default:
		return errUnsupportedType
	}

	return nil
}

func (u *Unmarshaler) fillSlice(fieldType reflect.Type, value reflect.Value,
	mapValue any, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) fillSliceFromString(fieldType reflect.Type, value reflect.Value,
	mapValue any, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) fillSliceValue(slice reflect.Value, index int,
	baseKind reflect.Kind, value any, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) fillSliceWithDefault(derefedType reflect.Type, value reflect.Value,
	defaultValue, fullName string) error {
	baseFieldType := Deref(derefedType.Elem())
	baseFieldKind := baseFieldType.Kind()
	defaultCacheLock.Lock()
	slice, ok := defaultCache[defaultValue]
	defaultCacheLock.Unlock()
	if !ok {
		if baseFieldKind == reflect.String {
			slice = parseGroupedSegments(defaultValue)
		} else if err := jsonx.UnmarshalFromString(defaultValue, &slice); err != nil {
			return err
		}

		defaultCacheLock.Lock()
		defaultCache[defaultValue] = slice
		defaultCacheLock.Unlock()
	}

	return u.fillSlice(derefedType, value, slice, fullName)
}

func (u *Unmarshaler) fillUnmarshalerStruct(fieldType reflect.Type,
	value reflect.Value, targetValue string) error {
	if !value.CanSet() {
		return errValueNotSettable
	}

	baseType := Deref(fieldType)
	target := reflect.New(baseType)
	switch u.key {
	case jsonTagKey:
		unmarshaler, ok := target.Interface().(json.Unmarshaler)
		if !ok {
			return errUnsupportedType
		}

		if err := unmarshaler.UnmarshalJSON([]byte(targetValue)); err != nil {
			return err
		}
	default:
		return errUnsupportedType
	}

	value.Set(target)
	return nil
}

func (u *Unmarshaler) generateMap(keyType, elemType reflect.Type, mapValue any,
	fullName string) (reflect.Value, error) {
	return reflect.Value{}, errTypeMismatch
}

func (u *Unmarshaler) implementsUnmarshaler(t reflect.Type) bool {
	switch u.key {
	case jsonTagKey:
		return t.Implements(reflect.TypeOf((*json.Unmarshaler)(nil)).Elem())
	default:
		return false
	}
}

func (u *Unmarshaler) parseOptionsWithContext(field reflect.StructField, m Valuer, fullName string) (
	string, *fieldOptionsWithContext, error) {
	return "", nil, errTypeMismatch
}

func (u *Unmarshaler) processAnonymousField(field reflect.StructField, value reflect.Value,
	m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processAnonymousFieldOptional(field reflect.StructField, value reflect.Value,
	key string, m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processAnonymousFieldRequired(field reflect.StructField, value reflect.Value,
	m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processAnonymousStructFieldOptional(fieldType reflect.Type,
	value reflect.Value, key string, m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processField(field reflect.StructField, value reflect.Value,
	m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processFieldNotFromString(fieldType reflect.Type, value reflect.Value,
	vp valueWithParent, opts *fieldOptionsWithContext, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processFieldPrimitive(fieldType reflect.Type, value reflect.Value,
	mapValue any, opts *fieldOptionsWithContext, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processFieldPrimitiveWithJSONNumber(fieldType reflect.Type, value reflect.Value,
	v json.Number, opts *fieldOptionsWithContext, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processFieldStruct(fieldType reflect.Type, value reflect.Value,
	m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processFieldTextUnmarshaler(fieldType reflect.Type, value reflect.Value,
	mapValue any) (bool, error) {
	var tval encoding.TextUnmarshaler
	var ok bool

	if fieldType.Kind() == reflect.Ptr {
		if value.Elem().Kind() == reflect.Ptr {
			target := reflect.New(Deref(fieldType))
			SetValue(fieldType.Elem(), value, target)
			tval, ok = target.Interface().(encoding.TextUnmarshaler)
		} else {
			tval, ok = value.Interface().(encoding.TextUnmarshaler)
		}
	} else {
		tval, ok = value.Addr().Interface().(encoding.TextUnmarshaler)
	}
	if ok {
		switch mv := mapValue.(type) {
		case string:
			return true, tval.UnmarshalText([]byte(mv))
		case []byte:
			return true, tval.UnmarshalText(mv)
		}
	}

	return false, nil
}

func (u *Unmarshaler) processFieldWithEnvValue(fieldType reflect.Type, value reflect.Value,
	envVal string, opts *fieldOptionsWithContext, fullName string) error {
	if err := validateValueInOptions(envVal, opts.options()); err != nil {
		return err
	}

	fieldKind := fieldType.Kind()
	switch fieldKind {
	case reflect.Bool:
		val, err := strconv.ParseBool(envVal)
		if err != nil {
			return fmt.Errorf("unmarshal field %q with environment variable, %w", fullName, err)
		}

		value.SetBool(val)
		return nil
	case durationType.Kind():
		if err := fillDurationValue(fieldType, value, envVal); err != nil {
			return fmt.Errorf("unmarshal field %q with environment variable, %w", fullName, err)
		}

		return nil
	case reflect.String:
		value.SetString(envVal)
		return nil
	default:
		return u.processFieldPrimitiveWithJSONNumber(fieldType, value, json.Number(envVal), opts, fullName)
	}
}

func (u *Unmarshaler) processNamedField(field reflect.StructField, value reflect.Value,
	m valuerWithParent, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processNamedFieldWithValue(fieldType reflect.Type, value reflect.Value,
	vp valueWithParent, key string, opts *fieldOptionsWithContext, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processNamedFieldWithValueFromString(fieldType reflect.Type, value reflect.Value,
	mapValue any, key string, opts *fieldOptionsWithContext, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) processNamedFieldWithoutValue(fieldType reflect.Type, value reflect.Value,
	opts *fieldOptionsWithContext, fullName string) error {
	return errTypeMismatch
}

func (u *Unmarshaler) unmarshalWithFullName(m valuerWithParent, v any, fullName string) error {
	return errTypeMismatch
}

// WithStringValues customizes an Unmarshaler with number values from strings.
func WithStringValues() UnmarshalOption {
	return func(opt *unmarshalOptions) {
		opt.fromString = true
	}
}

// WithCanonicalKeyFunc customizes an Unmarshaler with Canonical Key func.
func WithCanonicalKeyFunc(f func(string) string) UnmarshalOption {
	return func(opt *unmarshalOptions) {
		opt.canonicalKey = f
	}
}

// WithDefault customizes an Unmarshaler with fill default values.
func WithDefault() UnmarshalOption {
	return func(opt *unmarshalOptions) {
		opt.fillDefault = true
	}
}

// WithOpaqueKeys customizes an Unmarshaler with opaque keys.
// Opaque keys are keys that are not processed by the unmarshaler.
func WithOpaqueKeys() UnmarshalOption {
	return func(opt *unmarshalOptions) {
		opt.opaqueKeys = true
	}
}

func createValuer(v valuerWithParent, opts *fieldOptionsWithContext) valuerWithParent {
	if opts.inherit() {
		return recursiveValuer{
			current: v,
			parent:  v.Parent(),
		}
	}

	return simpleValuer{
		current: v,
		parent:  v.Parent(),
	}
}

func fillDurationValue(fieldType reflect.Type, value reflect.Value, dur string) error {
	d, err := time.ParseDuration(dur)
	if err != nil {
		return err
	}

	SetValue(fieldType, value, reflect.ValueOf(d))

	return nil
}

func fillPrimitive(fieldType reflect.Type, value reflect.Value, mapValue any,
	opts *fieldOptionsWithContext, fullName string) error {
	if !value.CanSet() {
		return errValueNotSettable
	}

	baseType := Deref(fieldType)
	if fieldType.Kind() == reflect.Ptr {
		target := reflect.New(baseType).Elem()
		switch mapValue.(type) {
		case string, json.Number:
			SetValue(fieldType, value, target)
			value = target
		}
	}

	switch v := mapValue.(type) {
	case string:
		return validateAndSetValue(baseType.Kind(), value, v, opts)
	case json.Number:
		if err := validateJsonNumberRange(v, opts); err != nil {
			return err
		}
		return setValueFromString(baseType.Kind(), value, v.String())
	default:
		return newTypeMismatchError(fullName)
	}
}

func fillWithSameType(fieldType reflect.Type, value reflect.Value, mapValue any,
	opts *fieldOptionsWithContext) error {
	if !value.CanSet() {
		return errValueNotSettable
	}

	if err := validateValueRange(mapValue, opts); err != nil {
		return err
	}

	if fieldType.Kind() == reflect.Ptr {
		baseType := Deref(fieldType)
		target := reflect.New(baseType).Elem()
		setSameKindValue(baseType, target, mapValue)
		SetValue(fieldType, value, target)
	} else {
		setSameKindValue(fieldType, value, mapValue)
	}

	return nil
}

// getValue gets the value for the specific key, the key can be in the format of parentKey.childKey
func getValue(m valuerWithParent, key string, opaque bool) (any, bool) {
	keys := readKeys(key, opaque)
	return getValueWithChainedKeys(m, keys)
}

func getValueWithChainedKeys(m valuerWithParent, keys []string) (any, bool) {
	switch len(keys) {
	case 0:
		return nil, false
	case 1:
		v, ok := m.Value(keys[0])
		return v, ok
	default:
		if v, ok := m.Value(keys[0]); ok {
			if nextm, ok := v.(map[string]any); ok {
				return getValueWithChainedKeys(recursiveValuer{
					current: mapValuer(nextm),
					parent:  m,
				}, keys[1:])
			}
		}

		return nil, false
	}
}

func join(elem ...string) string {
	var builder strings.Builder

	var fillSep bool
	for _, e := range elem {
		if len(e) == 0 {
			continue
		}

		if fillSep {
			builder.WriteByte(delimiter)
		} else {
			fillSep = true
		}

		builder.WriteString(e)
	}

	return builder.String()
}

func newInitError(name string) error {
	return fmt.Errorf("field %q is not set", name)
}

func newTypeMismatchError(name string) error {
	return fmt.Errorf("type mismatch for field %q", name)
}

func newTypeMismatchErrorWithHint(name, expectType, actualType string) error {
	return fmt.Errorf("type mismatch for field %q, expect %q, actual %q",
		name, expectType, actualType)
}

func readKeys(key string, opaque bool) []string {
	if opaque {
		return []string{key}
	}

	cacheKeysLock.Lock()
	keys, ok := cacheKeys[key]
	cacheKeysLock.Unlock()
	if ok {
		return keys
	}

	keys = strings.FieldsFunc(key, func(c rune) bool {
		return c == delimiter
	})
	cacheKeysLock.Lock()
	cacheKeys[key] = keys
	cacheKeysLock.Unlock()

	return keys
}

func setSameKindValue(targetType reflect.Type, target reflect.Value, value any) {
	if reflect.ValueOf(value).Type().AssignableTo(targetType) {
		target.Set(reflect.ValueOf(value))
	} else {
		target.Set(reflect.ValueOf(value).Convert(targetType))
	}
}
