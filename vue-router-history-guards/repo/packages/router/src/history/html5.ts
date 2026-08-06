import {
  RouterHistory,
  NavigationCallback,
  HistoryState,
  normalizeBase,
  createHref,
  HistoryLocation,
} from './common'

/**
 * Creates an HTML5 history. Most common history for single page applications.
 *
 * @param base -
 */
export function createWebHistory(base?: string): RouterHistory {
  base = normalizeBase(base)
  let locationValue: HistoryLocation = '/'
  let stateValue: HistoryState = {}
  let listeners: NavigationCallback[] = []

  const routerHistory: RouterHistory = {
    base,
    get location() {
      return locationValue
    },
    get state() {
      return stateValue
    },
    push(to: HistoryLocation, data?: HistoryState) {
      locationValue = to
      stateValue = data || {}
    },
    replace(to: HistoryLocation, data?: HistoryState) {
      locationValue = to
      stateValue = data || {}
    },
    go(_delta: number, _triggerListeners?: boolean) {},
    listen(callback: NavigationCallback) {
      listeners.push(callback)
      return () => {
        const i = listeners.indexOf(callback)
        if (i > -1) listeners.splice(i, 1)
      }
    },
    destroy() {
      listeners = []
    },
    createHref: createHref.bind(null, base),
  }

  return routerHistory
}
