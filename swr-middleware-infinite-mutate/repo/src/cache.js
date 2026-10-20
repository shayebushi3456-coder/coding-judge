export function createCache() {
  /** @type {Map<string, { data?: unknown, error?: unknown, isValidating?: boolean }>} */
  const map = new Map()
  return {
    get(key) {
      return map.get(key)
    },
    set(key, value) {
      map.set(key, value)
    },
    delete(key) {
      map.delete(key)
    },
    keys() {
      return [...map.keys()]
    },
    clear() {
      map.clear()
    },
  }
}
