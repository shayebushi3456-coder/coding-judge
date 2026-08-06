import type { StoreGeneric } from './types'

export type StoreToRefs<SS extends StoreGeneric> = Record<string, any>

/**
 * Creates an object of references with all the state, getters, and plugin-added
 * state properties of the store.
 *
 * @param store - store to extract the refs from
 */
export function storeToRefs<SS extends StoreGeneric>(
  _store: SS
): StoreToRefs<SS> {
  return {} as StoreToRefs<SS>
}
