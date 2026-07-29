import type { StateCreator, StoreMutatorIdentifier } from '../vanilla.ts'

type SubscribeWithSelector = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<
    T,
    [...Mps, ['zustand/subscribeWithSelector', never]],
    Mcs
  >,
) => StateCreator<T, Mps, [['zustand/subscribeWithSelector', never], ...Mcs]>

type SubscribeWithSelectorImpl = <T extends object>(
  storeInitializer: StateCreator<T, [], []>,
) => StateCreator<T, [], []>

const subscribeWithSelectorImpl: SubscribeWithSelectorImpl =
  (fn) => (set, get, api) => {
    return fn(set, get, api)
  }

export const subscribeWithSelector =
  subscribeWithSelectorImpl as unknown as SubscribeWithSelector
