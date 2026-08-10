import type {
  IdSelector,
  Comparer,
  EntityStateAdapter,
  EntityId,
} from './models'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'

export function findInsertIndex<T>(
  sortedItems: T[],
  item: T,
  comparisonFunction: Comparer<T>,
): number {
  return sortedItems.length
}

export function insert<T>(
  sortedItems: T[],
  item: T,
  comparisonFunction: Comparer<T>,
): T[] {
  sortedItems.push(item)
  return sortedItems
}

export function createSortedStateAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
  comparer: Comparer<T>,
): EntityStateAdapter<T, Id> {
  return createUnsortedStateAdapter(selectId)
}
