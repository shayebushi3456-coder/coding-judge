import type {
  ActionFromMatcher,
  Matcher,
  UnionToIntersection,
} from './tsHelpers'
import type {
  AsyncThunk,
  AsyncThunkFulfilledActionCreator,
  AsyncThunkPendingActionCreator,
  AsyncThunkRejectedActionCreator,
} from './createAsyncThunk'

/** @public */
export type ActionMatchingAnyOf<Matchers extends Matcher<any>[]> =
  ActionFromMatcher<Matchers[number]>

/** @public */
export type ActionMatchingAllOf<Matchers extends Matcher<any>[]> =
  UnionToIntersection<ActionMatchingAnyOf<Matchers>>

/**
 * @public
 */
export function isAnyOf<Matchers extends Matcher<any>[]>(
  ..._matchers: Matchers
) {
  return (_action: any): _action is ActionMatchingAnyOf<Matchers> => {
    return false
  }
}

/**
 * @public
 */
export function isAllOf<Matchers extends Matcher<any>[]>(
  ..._matchers: Matchers
) {
  return (_action: any): _action is ActionMatchingAllOf<Matchers> => {
    return false
  }
}

/**
 * @internal
 */
export function hasExpectedRequestMetadata(
  _action: any,
  _validStatus: readonly string[],
) {
  return false
}

export type UnknownAsyncThunkPendingAction = ReturnType<
  AsyncThunkPendingActionCreator<unknown>
>

export type PendingActionFromAsyncThunk<T extends AnyAsyncThunk> =
  ActionFromMatcher<T['pending']>

/**
 * @public
 */
export function isPending(): (
  action: any,
) => action is UnknownAsyncThunkPendingAction
/**
 * @public
 */
export function isPending<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is PendingActionFromAsyncThunk<AsyncThunks[number]>
/**
 * @public
 */
export function isPending(action: any): action is UnknownAsyncThunkPendingAction
export function isPending<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(...asyncThunks: AsyncThunks | [any]) {
  if (asyncThunks.length === 0) {
    return (_action: any) => false
  }

  if (
    !(
      typeof asyncThunks[0] === 'function' &&
      'pending' in asyncThunks[0] &&
      'fulfilled' in asyncThunks[0] &&
      'rejected' in asyncThunks[0]
    )
  ) {
    return isPending()(asyncThunks[0])
  }

  return (_action: any) => false
}

export type UnknownAsyncThunkRejectedAction = ReturnType<
  AsyncThunkRejectedActionCreator<unknown, unknown>
>

export type RejectedActionFromAsyncThunk<T extends AnyAsyncThunk> =
  ActionFromMatcher<T['rejected']>

/**
 * @public
 */
export function isRejected(): (
  action: any,
) => action is UnknownAsyncThunkRejectedAction
/**
 * @public
 */
export function isRejected<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is RejectedActionFromAsyncThunk<AsyncThunks[number]>
/**
 * @public
 */
export function isRejected(
  action: any,
): action is UnknownAsyncThunkRejectedAction
export function isRejected<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(...asyncThunks: AsyncThunks | [any]) {
  if (asyncThunks.length === 0) {
    return (_action: any) => false
  }

  if (
    !(
      typeof asyncThunks[0] === 'function' &&
      'pending' in asyncThunks[0] &&
      'fulfilled' in asyncThunks[0] &&
      'rejected' in asyncThunks[0]
    )
  ) {
    return isRejected()(asyncThunks[0])
  }

  return (_action: any) => false
}

export type UnknownAsyncThunkRejectedWithValueAction = ReturnType<
  AsyncThunkRejectedActionCreator<unknown, unknown>
>

export type RejectedWithValueActionFromAsyncThunk<T extends AnyAsyncThunk> =
  ActionFromMatcher<T['rejected']> &
    (T extends AsyncThunk<any, any, { rejectValue: infer RejectedValue }>
      ? { payload: RejectedValue }
      : unknown)

/**
 * @public
 */
export function isRejectedWithValue(): (
  action: any,
) => action is UnknownAsyncThunkRejectedAction
/**
 * @public
 */
export function isRejectedWithValue<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(
  ...asyncThunks: AsyncThunks
): (
  action: any,
) => action is RejectedWithValueActionFromAsyncThunk<AsyncThunks[number]>
/**
 * @public
 */
export function isRejectedWithValue(
  action: any,
): action is UnknownAsyncThunkRejectedAction
export function isRejectedWithValue<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(...asyncThunks: AsyncThunks | [any]) {
  if (asyncThunks.length === 0) {
    return (_action: any) => false
  }

  if (
    !(
      typeof asyncThunks[0] === 'function' &&
      'pending' in asyncThunks[0] &&
      'fulfilled' in asyncThunks[0] &&
      'rejected' in asyncThunks[0]
    )
  ) {
    return isRejectedWithValue()(asyncThunks[0])
  }

  return (_action: any) => false
}

export type UnknownAsyncThunkFulfilledAction = ReturnType<
  AsyncThunkFulfilledActionCreator<unknown, unknown>
>

export type FulfilledActionFromAsyncThunk<T extends AnyAsyncThunk> =
  ActionFromMatcher<T['fulfilled']>

/**
 * @public
 */
export function isFulfilled(): (
  action: any,
) => action is UnknownAsyncThunkFulfilledAction
/**
 * @public
 */
export function isFulfilled<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is FulfilledActionFromAsyncThunk<AsyncThunks[number]>
/**
 * @public
 */
export function isFulfilled(
  action: any,
): action is UnknownAsyncThunkFulfilledAction
export function isFulfilled<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(...asyncThunks: AsyncThunks | [any]) {
  if (asyncThunks.length === 0) {
    return (_action: any) => false
  }

  if (
    !(
      typeof asyncThunks[0] === 'function' &&
      'pending' in asyncThunks[0] &&
      'fulfilled' in asyncThunks[0] &&
      'rejected' in asyncThunks[0]
    )
  ) {
    return isFulfilled()(asyncThunks[0])
  }

  return (_action: any) => false
}

export type UnknownAsyncThunkAction =
  | UnknownAsyncThunkPendingAction
  | UnknownAsyncThunkRejectedAction
  | UnknownAsyncThunkFulfilledAction

export type AnyAsyncThunk = {
  pending: { match: (action: any) => action is any }
  fulfilled: { match: (action: any) => action is any }
  rejected: { match: (action: any) => action is any }
}

export type ActionsFromAsyncThunk<T extends AnyAsyncThunk> =
  | ActionFromMatcher<T['pending']>
  | ActionFromMatcher<T['fulfilled']>
  | ActionFromMatcher<T['rejected']>

/**
 * @public
 */
export function isAsyncThunkAction(): (
  action: any,
) => action is UnknownAsyncThunkAction
/**
 * @public
 */
export function isAsyncThunkAction<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is ActionsFromAsyncThunk<AsyncThunks[number]>
/**
 * @public
 */
export function isAsyncThunkAction(
  action: any,
): action is UnknownAsyncThunkAction
export function isAsyncThunkAction<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]],
>(...asyncThunks: AsyncThunks | [any]) {
  if (asyncThunks.length === 0) {
    return (_action: any) => false
  }

  if (
    !(
      typeof asyncThunks[0] === 'function' &&
      'pending' in asyncThunks[0] &&
      'fulfilled' in asyncThunks[0] &&
      'rejected' in asyncThunks[0]
    )
  ) {
    return isAsyncThunkAction()(asyncThunks[0])
  }

  return (_action: any) => false
}
