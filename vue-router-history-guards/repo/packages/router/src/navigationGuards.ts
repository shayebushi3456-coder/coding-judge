import type {
  RouteLocationNormalized,
  RouteLocationNormalizedLoaded,
  NavigationGuard,
} from './typed-routes'

import { RouteRecordNormalized } from './matcher/types'

/**
 * Add a navigation guard that triggers whenever the component for the current
 * location is about to be left.
 *
 * @param leaveGuard - {@link NavigationGuard}
 */
export function onBeforeRouteLeave(_leaveGuard: NavigationGuard) {}

/**
 * Add a navigation guard that triggers whenever the current location is about
 * to be updated.
 *
 * @param updateGuard - {@link NavigationGuard}
 */
export function onBeforeRouteUpdate(_updateGuard: NavigationGuard) {}

export function guardToPromiseFn(
  guard: NavigationGuard,
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): () => Promise<void>
export function guardToPromiseFn(
  guard: NavigationGuard,
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  record: RouteRecordNormalized,
  name: string,
  timeout?: number
): () => Promise<void>
export function guardToPromiseFn(
  _guard: any,
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalizedLoaded,
  _record?: RouteRecordNormalized,
  _name?: string,
  _timeout?: number
): () => Promise<void> {
  return () => Promise.resolve()
}

export function extractComponentsGuards(
  _matched: RouteRecordNormalized[],
  _guardType: 'beforeRouteEnter' | 'beforeRouteUpdate' | 'beforeRouteLeave',
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalizedLoaded,
  _runWithContext?: <T>(fn: () => T) => T
): Array<() => Promise<void>> {
  return []
}

export function loadRouteLocation(
  route: RouteLocationNormalized
): Promise<RouteLocationNormalizedLoaded> {
  return Promise.resolve(route as RouteLocationNormalizedLoaded)
}
