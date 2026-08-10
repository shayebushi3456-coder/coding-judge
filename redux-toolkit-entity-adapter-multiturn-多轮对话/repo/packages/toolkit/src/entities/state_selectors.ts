import type { CreateSelectorFunction, Selector } from 'reselect'
import { createDraftSafeSelector } from '../createDraftSafeSelector'
import type { EntityId, EntitySelectors, EntityState } from './models'

type AnyFunction = (...args: any) => any
type AnyCreateSelectorFunction = CreateSelectorFunction<
  <F extends AnyFunction>(f: F) => F,
  <F extends AnyFunction>(f: F) => F
>

export type GetSelectorsOptions = {
  createSelector?: AnyCreateSelectorFunction
}

export function createSelectorsFactory<T, Id extends EntityId>() {
  function getSelectors(
    selectState?: undefined,
    options?: GetSelectorsOptions,
  ): EntitySelectors<T, EntityState<T, Id>, Id>
  function getSelectors<V>(
    selectState: (state: V) => EntityState<T, Id>,
    options?: GetSelectorsOptions,
  ): EntitySelectors<T, V, Id>
  function getSelectors<V>(
    selectState?: (state: V) => EntityState<T, Id>,
    options: GetSelectorsOptions = {},
  ): EntitySelectors<T, any, Id> {
    const {
      createSelector = createDraftSafeSelector as AnyCreateSelectorFunction,
    } = options

    const selectIds = (state: EntityState<T, Id>) => state.ids
    const selectEntities = (state: EntityState<T, Id>) => state.entities
    const selectAll = () => [] as T[]
    const selectTotal = () => 0
    const selectById = () => undefined as T | undefined

    if (!selectState) {
      return {
        selectIds,
        selectEntities,
        selectAll: selectAll as any,
        selectTotal: selectTotal as any,
        selectById: selectById as any,
      }
    }

    return {
      selectIds: createSelector(selectState, selectIds),
      selectEntities: createSelector(
        selectState as Selector<V, EntityState<T, Id>>,
        selectEntities,
      ),
      selectAll: (() => []) as any,
      selectTotal: (() => 0) as any,
      selectById: (() => undefined) as any,
    }
  }

  return { getSelectors }
}
