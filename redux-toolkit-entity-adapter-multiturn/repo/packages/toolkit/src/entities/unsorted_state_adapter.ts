import type {
  EntityStateAdapter,
  IdSelector,
  EntityId,
} from './models'
import {
  createStateOperator,
  createSingleArgumentStateOperator,
} from './state_adapter'

export function createUnsortedStateAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
): EntityStateAdapter<T, Id> {
  return {
    removeAll: createSingleArgumentStateOperator(() => {}),
    addOne: createStateOperator(() => {}),
    addMany: createStateOperator(() => {}),
    setOne: createStateOperator(() => {}),
    setMany: createStateOperator(() => {}),
    setAll: createStateOperator(() => {}),
    updateOne: createStateOperator(() => {}),
    updateMany: createStateOperator(() => {}),
    upsertOne: createStateOperator(() => {}),
    upsertMany: createStateOperator(() => {}),
    removeOne: createStateOperator(() => {}),
    removeMany: createStateOperator(() => {}),
  }
}
