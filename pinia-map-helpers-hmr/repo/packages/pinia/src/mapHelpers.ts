import type { StoreDefinition } from './types'

export interface MapStoresCustomization {}

export type _StoreObject<S> = Record<string, () => any>

export type _Spread<A extends readonly any[]> = Record<string, any>

export let mapStoreSuffix = 'Store'

export function setMapStoreSuffix(suffix: string): void {
  mapStoreSuffix = suffix
}

export type _MapStateReturn<S, G, Keys extends keyof S | keyof G> = Record<
  string,
  any
>

export type _MapStateObjectReturn<
  Id extends string,
  S,
  G,
  A,
  T,
> = Record<string, any>

export function mapState(
  useStore: StoreDefinition,
  keysOrMapper: any
): Record<string, any> {
  return {}
}

export const mapGetters = mapState

export type _MapActionsReturn<A> = Record<string, any>

export type _MapActionsObjectReturn<A, T> = Record<string, any>

export function mapActions(
  useStore: StoreDefinition,
  keysOrMapper: any
): Record<string, any> {
  return {}
}

export type _MapWritableStateKeys<S, G> = string

export type _MapWritableStateReturn<S, G, Keys> = Record<string, any>

export type _MapWritableStateObjectReturn<S, G, T> = Record<string, any>

export function mapWritableState(
  useStore: StoreDefinition,
  keysOrMapper: any
): Record<string, any> {
  return {}
}

export function mapStores(..._stores: any[]): Record<string, any> {
  return {}
}
