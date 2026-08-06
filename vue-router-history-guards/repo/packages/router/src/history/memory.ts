import {
  RouterHistory,
  NavigationCallback,
  START,
  HistoryState,
  normalizeBase,
  createHref,
  HistoryLocation,
} from './common'

/**
 * Creates an in-memory based history. The main purpose of this history is to handle SSR.
 *
 * @param base - Base applied to all urls, defaults to '/'
 * @returns a history object that can be passed to the router constructor
 */
export function createMemoryHistory(base: string = ''): RouterHistory {
  base = normalizeBase(base)
  let listeners: NavigationCallback[] = []
  let locationValue: HistoryLocation = START
  let stateValue: HistoryState = {}

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
