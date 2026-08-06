import {
  StateTree,
  StoreDefinition,
  _GettersTree,
  _ActionsTree,
} from './types'

export const isUseStore = (fn: any): fn is StoreDefinition => {
  return typeof fn === 'function' && typeof fn.$id === 'string'
}

export function patchObject(
  newState: Record<string, any>,
  _oldState: Record<string, any>
): Record<string, any> {
  return newState
}

export function acceptHMRUpdate<
  Id extends string = string,
  S extends StateTree = StateTree,
  G extends _GettersTree<S> = _GettersTree<S>,
  A = _ActionsTree,
>(_initialUseStore: StoreDefinition<Id, S, G, A>, _hot: any) {
  if (!__DEV__) {
    return () => {}
  }
  return (_newModule: any) => {}
}
